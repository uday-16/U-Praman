import os
import io
import PyPDF2
import chromadb
from sentence_transformers import SentenceTransformer
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Config
DATA_DIR = os.getenv("DATA_DIR", os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "datab")))
CHROMA_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "chroma_db")
COLLECTION_NAME = "indian_standards"
CHUNK_SIZE = 500  # Words per chunk
OVERLAP = 50      # Word overlap

import re

def parse_standard_metadata(filename: str) -> dict:
    """Extract standard number, part, amendment, and title from filename."""
    clean = filename.replace('.pdf', '')
    m = re.search(r'is[\._]?([0-9]+)(?:[\._]?(?:part[\._]?|p[\._]?)?([0-9]+))?', clean, re.IGNORECASE)
    
    is_num = "Unknown"
    is_amd = "amd" in clean.lower()
    
    if m:
        num = m.group(1)
        part = m.group(2)
        is_num = f"IS {num}"
        if part and len(part) <= 2:
            is_num += f" Part {part}"
        if is_amd:
            is_num += " (Amendment)"
    elif clean.lower().startswith("is"):
        is_num = clean.split('_')[0].upper()

    # Standard titles mapping for well-known standards in datab
    TITLES = {
        "IS 10500": "Drinking Water — Specification",
        "IS 694": "PVC Insulated Cables for Working Voltages up to and including 1100 V",
        "IS 694 (Amendment)": "PVC Insulated Cables for Working Voltages — Amendment",
        "IS 1293": "Plugs and Socket-Outlets of Rated Voltage up to 250V",
        "IS 1293 (Amendment)": "Plugs and Socket-Outlets — Amendment",
        "IS 1489 Part 1": "Portland Pozzolana Cement — Specification (Part 1: Flyash based)",
        "IS 1489 Part 1 (Amendment)": "Portland Pozzolana Cement — Amendment",
        "IS 15298 Part 1": "Personal Protective Equipment - Footwear (Part 1: Test Methods)",
        "IS 15298 Part 2": "Personal Protective Equipment - Safety Footwear (Part 2: Specifications)",
        "IS 15298 Part 3": "Personal Protective Equipment - Protective Footwear",
        "IS 15298 Part 4": "Personal Protective Equipment - Occupational Footwear",
        "IS 15298 Part 5": "Personal Protective Equipment - Footwear - Additional Requirements",
        "IS 15298 Part 6": "Personal Protective Equipment - Footwear - Impact Tests",
        "IS 15298 Part 7": "Personal Protective Equipment - Footwear - Chemical Resistance",
        "IS 15298 Part 8": "Personal Protective Equipment - Footwear - Dielectric & Slip Resistance",
        "IS 15328": "Plastics Piping Systems for Non-Pressure Underground Drainage and Sewerage",
        "IS 15328 (Amendment)": "Plastics Piping Systems — Amendment",
        "IS 15652": "Insulating Mats for Electrical Purposes",
        "IS 2062": "Hot Rolled Medium and High Tensile Structural Steel",
        "IS 2925": "Industrial Safety Helmets",
        "IS 302 Part 1": "Safety of Household and Similar Electrical Appliances (General)",
        "IS 302 Part 1 (Amendment)": "Safety of Household Electrical Appliances — Amendment",
    }
    
    title = TITLES.get(is_num, f"Indian Standard {is_num}")
    
    return {
        "is_number": is_num,
        "is_amendment": is_amd,
        "title": title
    }


def extract_text_from_pdf(filepath: str) -> str:
    try:
        with open(filepath, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            text = ""
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
            return text
    except Exception as e:
        logger.error(f"Failed to read {filepath}: {e}")
        return ""

def chunk_text(text: str, chunk_size: int, overlap: int):
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size - overlap):
        chunk = " ".join(words[i:i + chunk_size])
        if chunk.strip():
            chunks.append(chunk)
    return chunks

def main():
    logger.info("Initializing embedding model (this may take a moment to download)...")
    model = SentenceTransformer('all-MiniLM-L6-v2')
    
    logger.info(f"Initializing ChromaDB at {CHROMA_DB_PATH}...")
    client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
    
    # Create or get collection
    try:
        collection = client.get_collection(name=COLLECTION_NAME)
        logger.info("Found existing collection. Overwriting...")
        client.delete_collection(name=COLLECTION_NAME)
        collection = client.create_collection(name=COLLECTION_NAME)
    except Exception:
        collection = client.create_collection(name=COLLECTION_NAME)

    pdf_files = [f for f in os.listdir(DATA_DIR) if f.endswith(".pdf")]
    logger.info(f"Found {len(pdf_files)} PDF files in {DATA_DIR}.")

    total_chunks = 0
    for filename in pdf_files:
        filepath = os.path.join(DATA_DIR, filename)
        logger.info(f"Processing {filename}...")
        
        text = extract_text_from_pdf(filepath)
        if not text.strip():
            logger.warning(f"No text extracted from {filename}.")
            continue
            
        chunks = chunk_text(text, CHUNK_SIZE, OVERLAP)
        
        meta_info = parse_standard_metadata(filename)
        is_number = meta_info["is_number"]
        standard_title = meta_info["title"]
        
        documents = []
        metadatas = []
        ids = []
        
        for i, chunk in enumerate(chunks):
            chunk_id = f"{filename}_chunk_{i}"
            documents.append(chunk)
            metadatas.append({
                "source": filename,
                "is_number": is_number,
                "title": standard_title,
                "is_amendment": str(meta_info["is_amendment"]),
                "chunk_index": i
            })
            ids.append(chunk_id)
        
        if documents:
            logger.info(f"  Generated {len(documents)} chunks. Computing embeddings...")
            embeds = model.encode(documents, show_progress_bar=False).tolist()
            
            logger.info(f"  Adding to ChromaDB...")
            collection.add(
                documents=documents,
                embeddings=embeds,
                metadatas=metadatas,
                ids=ids
            )
            total_chunks += len(documents)

    logger.info(f"Ingestion complete. Total chunks stored: {total_chunks}")

if __name__ == "__main__":
    main()
