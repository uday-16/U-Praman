"""Versioned, page-aware corpus and hybrid retrieval over the local standards files."""
from collections import Counter
from pathlib import Path
from threading import RLock
import hashlib
import json
import logging
import math
import os
import re
import tempfile

from app.config import settings
from app.services.document_reader import read_document

logger = logging.getLogger('praman.corpus')
BACKEND = Path(__file__).resolve().parents[2]
CACHE = BACKEND / 'data' / 'rag'
MODEL_CACHE = BACKEND / 'data' / 'models'
SCHEMA = 5
LOCK = RLock()
_corpus = None
_model = None
_model_attempted = False
STOP = set('a an the and or of for to in on with by is are be as at from this that it its not no shall should must may can all any into per about what which how please tell me need required requirements specification standard standards indian procurement product supply query information'.split())


def data_directory() -> Path:
    if settings.standards_data_dir:
        directory = Path(settings.standards_data_dir).expanduser()
        return (BACKEND / directory).resolve() if not directory.is_absolute() else directory.resolve()
    preferred = BACKEND / 'datab'
    return preferred if preferred.is_dir() else BACKEND.parent / 'datab'


def parse_metadata(filename: str) -> dict:
    name = Path(filename).stem.lower()
    number = re.search(r'is[._\s-]*(\d+)', name)
    if not number:
        raise ValueError('Filename must contain an IS standard number.')
    years = re.findall(r'(?:19|20)\d{2}', name)
    year = years[-1] if years else ''
    tail = name[number.end():]
    part = re.search(r'part[._\s-]*(\d+)', tail)
    if not part:
        part = re.match(r'[._-](\d{1,2})(?=[._-])', tail)
    part_number = part.group(1) if part else ''
    amendment = re.search(r'amd[._\s-]*(\d+)', tail)
    family = 'is-' + number.group(1) + ('-' + part_number if part_number else '')
    code = 'IS ' + number.group(1) + (f' (Part {part_number})' if part_number else '')
    return {'family': family, 'number': number.group(1), 'part': part_number,
            'year': year, 'amendment': amendment.group(1) if amendment else '',
            'is_number': code + (f' : {year}' if year else ''), 'source': filename,
            'id': family + ('-' + year if year else '') + ('-amd-' + amendment.group(1) if amendment else '')}


def extract_title(pages: list[dict], fallback: str) -> str:
    # Titles are extracted from cover/body text, never invented from an IS-number map.
    for page in pages[:5]:
        lines = [line.strip() for line in page['text'].splitlines() if line.strip()]
        for i, line in enumerate(lines):
            if re.fullmatch(r'Indian\s+Standard', line, re.I):
                title_lines = []
                for value in lines[i + 1:i + 10]:
                    if re.search(r'revision|reaffirm|edition|ICS|BUREAU|copyright|price group|www\.|\bBIS\b', value, re.I): break
                    if len(value) > 3 and not re.fullmatch(r'[\d\W]+', value): title_lines.append(value)
                title = ' '.join(title_lines).strip(' -()')
                if len(title) > 10: return title[:240]
        # Newer covers place the English title before the "Indian Standard" label.
        for i, line in enumerate(lines):
            if re.search(r'\(\s*(?:First|Second|Third|Fourth|Fifth|Sixth)\s+Revision\s*\)', line, re.I):
                start = max(0, i - 12)
                for j in range(start, i):
                    if ')' in lines[j]: start = j + 1
                title = ' '.join(lines[start:i])
                if len(title) > 10 and not re.search(r'price group|www\.', title, re.I): return title[:240]
    return fallback


def tokenize(text: str) -> list[str]:
    words = re.findall(r'[a-z0-9]+', text.lower())
    # Small morphological normalization improves helmet/helmets and cable/cables matching.
    return [word[:-1] if word.endswith('s') and len(word) > 4 and not word.endswith('ss') else word
            for word in words if word not in STOP and len(word) > 1]


def atomic_json(path: Path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=path.parent, delete=False) as output:
        json.dump(value, output, ensure_ascii=False)
        temporary = output.name
    os.replace(temporary, path)


def embedding_model(download=False):
    global _model, _model_attempted
    if not settings.rag_semantic_enabled: return None
    if _model is not None: return _model
    if _model_attempted and not download: return None
    _model_attempted = True
    try:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer(settings.embedding_model, cache_folder=str(MODEL_CACHE),
                                     local_files_only=not download, device='cpu')
    except Exception as error:
        logger.warning('Local semantic model unavailable (%s); using document BM25 retrieval.', type(error).__name__)
    return _model


class Corpus:
    def __init__(self, directory: Path, download=False):
        self.directory = directory
        files = sorted(path for path in directory.glob('*') if path.suffix.lower() in {'.pdf', '.txt', '.docx'})
        if not files: raise ValueError(f'No standards documents found in {directory}.')
        manifest = [(p.name, hashlib.sha256(p.read_bytes()).hexdigest()) for p in files]
        self.fingerprint = hashlib.sha256(json.dumps([SCHEMA, str(directory), manifest]).encode()).hexdigest()
        self.stats = [(p.name, p.stat().st_size, p.stat().st_mtime_ns) for p in files]
        cache_file = CACHE / (self.fingerprint + '.json')
        try:
            cached = json.loads(cache_file.read_text(encoding='utf-8'))
            if not cached.get('chunks'):
                raise ValueError('Corrupted or empty cache with 0 chunks; re-extracting.')
        except (OSError, ValueError):
            cached = self.extract(files)
            if cached.get('chunks'):
                atomic_json(cache_file, cached)
        self.documents = cached['documents']
        self.chunks = cached['chunks']
        self.errors = cached['errors']
        if not self.chunks: raise ValueError('No readable standards text was found. Check the ingestion report for OCR/read errors.')
        self.by_source = {doc['source']: doc for doc in self.documents}
        self.latest = {}
        for doc in self.documents:
            if not doc['amendment']:
                self.latest[doc['family']] = max(self.latest.get(doc['family'], ''), doc['year'])
        self.terms = [Counter(tokenize(chunk['title'] + ' ' + chunk['text'])) for chunk in self.chunks]
        self.lengths = [sum(terms.values()) for terms in self.terms]
        self.average_length = sum(self.lengths) / len(self.lengths)
        df = Counter(term for terms in self.terms for term in terms)
        self.idf = {term: math.log(1 + (len(self.chunks) - count + .5) / (count + .5)) for term, count in df.items()}
        self.vectors = None
        self.model = embedding_model(download)
        self.mode = 'bm25'
        if self.model is not None:
            import numpy as np
            key = hashlib.sha256((self.fingerprint + settings.embedding_model).encode()).hexdigest()
            vector_file = CACHE / (key + '.npy')
            try:
                vectors = np.load(vector_file, allow_pickle=False)
                if vectors.ndim != 2 or vectors.shape != (len(self.chunks), self.model.get_sentence_embedding_dimension()) or not np.isfinite(vectors).all():
                    raise ValueError('Index dimensions or values are invalid')
            except (OSError, ValueError):
                vectors = self.model.encode([c['title'] + '\n' + c['text'] for c in self.chunks],
                                            normalize_embeddings=True, show_progress_bar=False, batch_size=32)
                with tempfile.NamedTemporaryFile(dir=CACHE, delete=False) as output:
                    np.save(output, vectors, allow_pickle=False)
                    temporary = output.name
                os.replace(temporary, vector_file)
            self.vectors = vectors
            self.mode = 'hybrid-semantic-bm25'

    def extract(self, files):
        documents, chunks, errors = [], [], []
        for path in files:
            try:
                meta = parse_metadata(path.name)
                pages = read_document(path.read_bytes(), path.name)
                if meta['amendment']:
                    header = '\n'.join(p['text'] for p in pages[:2])
                    target = re.search(r'\bTO\s+IS\s*\d+(?:\s*\(\s*Part\s*\d+\s*\))?\s*:\s*((?:19|20)\d{2})', header, re.I)
                    meta['base_year'] = target.group(1) if target else ''
                    meta['is_number'] = re.sub(r' : \d{4}$', '', meta['is_number']) + (f' : {meta["base_year"]}' if meta['base_year'] else '') + f' (Amendment {meta["amendment"]}, {meta["year"]})'
                meta['title'] = extract_title(pages, meta['is_number'])
                meta['pages'] = len(pages)
                meta['empty_pages'] = [page['page'] for page in pages if len(page['text']) < 20]
                meta['ocr_pages'] = [page['page'] for page in pages if page.get('ocr')]
                documents.append(meta)
                for page in pages:
                    # Keep physical page boundaries and overlapping 220-word chunks.
                    words = list(re.finditer(r'\S+', page['text']))
                    for offset in range(0, len(words), 180):
                        last = min(offset + 220, len(words))
                        text = page['text'][words[offset].start():words[last - 1].end()]
                        if len(text) < 40: continue
                        chunks.append({**meta, 'page': page['page'], 'chunk_index': offset // 180,
                                       'text': text, 'citation_id': f'{path.name}:p{page["page"]}:c{offset // 180}'})
                        if last == len(words): break
            except Exception as error:
                errors.append({'source': path.name, 'error': str(error)})
        return {'documents': documents, 'chunks': chunks, 'errors': errors}

    def search(self, query, limit=6, standard_id=None):
        terms = set(tokenize(query))
        identifiers = list(re.finditer(r'\bIS[\s.-]*(\d+)(?:\s*\(?Part\s*(\d+)\)?)?(?:\s*[:.-]\s*((?:19|20)\d{2}))?', query, re.I))
        identifier = identifiers[0] if identifiers else None
        selection = None
        if standard_id:
            candidates = [d for d in self.documents if d['id'].lower() == standard_id.lower() or d['family'].lower() == standard_id.lower()
                          or re.sub(r'\W', '', d['is_number']).lower() == re.sub(r'\W', '', standard_id).lower()]
            if not candidates: return []
            selection = {d['source'] for d in candidates}
        semantic = None
        if self.vectors is not None:
            vector = self.model.encode([query], normalize_embeddings=True, show_progress_bar=False)[0]
            semantic = self.vectors @ vector
        ranked = []
        for index, chunk in enumerate(self.chunks):
            if selection is not None and chunk['source'] not in selection: continue
            if identifier:
                matches = [ref for ref in identifiers if chunk['number'] == ref.group(1) and (not ref.group(2) or chunk['part'] == ref.group(2))
                           and (not ref.group(3) or (chunk.get('base_year') if chunk['amendment'] else chunk['year']) == ref.group(3))]
                if not matches: continue
            explicit_year = any(ref.group(3) for ref in identifiers if ref.group(1) == chunk['number'])
            if not selection and not explicit_year and not chunk['amendment'] and chunk['year'] != self.latest.get(chunk['family']): continue
            if not selection and not explicit_year and chunk['amendment'] and chunk.get('base_year') != self.latest.get(chunk['family']): continue
            counts = self.terms[index]
            overlap = terms.intersection(counts)
            lexical = sum(self.idf.get(term, 0) * counts[term] * 2.5 /
                          (counts[term] + 1.5 * (.25 + .75 * self.lengths[index] / self.average_length)) for term in overlap)
            cosine = float(semantic[index]) if semantic is not None else 0
            # No forced minimum score: unrelated questions can yield no matches.
            if not overlap and not identifier and cosine < .48: continue
            if lexical <= 0 and cosine < .35 and not identifier: continue
            coverage = len(overlap) / max(1, len(terms))
            score = .55 * max(0, cosine) + .30 * (lexical / (lexical + 8)) + .15 * coverage if semantic is not None else .8 * lexical / (lexical + 8) + .2 * coverage
            if identifier: score += .12
            if score < .12: continue
            ranked.append({**chunk, 'score': round(min(score, 1), 4), 'retrieval_mode': self.mode})
        ranked.sort(key=lambda item: item['score'], reverse=True)
        unique = []
        seen = set()
        for item in ranked:
            key = (item['id'], re.sub(r'\s+', '', item['text']).lower())
            if key not in seen:
                seen.add(key)
                unique.append(item)
        return unique[:limit]

    def report(self):
        return {'directory': str(self.directory), 'documents': len(self.documents), 'chunks': len(self.chunks),
                'retrieval_mode': self.mode, 'fingerprint': self.fingerprint, 'errors': self.errors,
                'ocr_pages': sum(len(d.get('ocr_pages', [])) for d in self.documents),
                'pages_needing_ocr': [{'source': d['source'], 'pages': d['empty_pages']} for d in self.documents if d['empty_pages']]}


def peek_corpus():
    """Return only an already-loaded index; management listings must not trigger OCR/model loading."""
    return _corpus

def get_corpus(download=False, force=False):
    global _corpus
    with LOCK:
        directory = data_directory()
        stats = [(p.name, p.stat().st_size, p.stat().st_mtime_ns) for p in sorted(directory.glob('*')) if p.suffix.lower() in {'.pdf', '.txt', '.docx'}]
        if force or _corpus is None or _corpus.directory != directory or _corpus.stats != stats:
            _corpus = Corpus(directory, download=download)
        return _corpus
