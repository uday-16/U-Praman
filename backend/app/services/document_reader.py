"""Read real document contents; unreadable uploads never become invented text."""
import io
import re
import unicodedata
import hashlib
import json
from threading import Lock
from pathlib import Path

MAX_UPLOAD_BYTES = 20 * 1024 * 1024
_ocr = None
_ocr_lock = Lock()


def ocr_reading_order(rows, width):
    """Keep two-column prose together; leave tables in their original row order."""
    rows = [row for row in rows if float(row[2]) >= .5]
    left = [r for r in rows if max(p[0] for p in r[0]) < width * .52]
    right = [r for r in rows if min(p[0] for p in r[0]) > width * .48]
    wide = lambda group: sum(max(p[0] for p in r[0]) - min(p[0] for p in r[0]) > width * .25 for r in group)
    if wide(left) >= 8 and wide(right) >= 8:
        # Pages with wide column text and few spanning lines are prose, not a table.
        others = [r for r in rows if r not in left and r not in right]
        if len(others) <= 5:
            top = min(min(p[1] for p in r[0]) for r in left + right)
            header = [r for r in others if min(p[1] for p in r[0]) < top]
            rows = header + left + right + [r for r in others if r not in header]
    return '\n'.join(row[1] for row in rows)


def ocr_scanned_pages(data, pages):
    """OCR only image-bearing pages without text; cache by content, never filename."""
    needs_ocr = [p for p in pages if len(p.get('text', '')) < 20]
    if not needs_ocr:
        return
    try:
        import pymupdf
        global _ocr
        cache = Path(__file__).resolve().parents[2] / 'data' / 'rag' / 'ocr'
        cache.mkdir(parents=True, exist_ok=True)
        digest = hashlib.sha256(data).hexdigest()
        with pymupdf.open(stream=data, filetype='pdf') as pdf:
            for page in pages:
                if len(page['text']) >= 20: continue
                if page['page'] - 1 >= len(pdf): continue
                raw = pdf[page['page'] - 1]
                if not raw.get_images(): continue
                cached = cache / f'v2-{digest}-{page["page"]}.json'
                try:
                    page['text'] = json.loads(cached.read_text(encoding='utf-8'))
                    page['ocr'] = True
                    continue
                except (OSError, ValueError): pass
                with _ocr_lock:
                    if _ocr is None:
                        import rapidocr_onnxruntime
                        import onnxruntime as ort
                        from rapidocr_onnxruntime import RapidOCR
                        _ocr = RapidOCR(det_model_path=None, det_limit_side_len=1280, det_limit_type='max',
                                        rec_model_path=None, rec_batch_num=24)
                        model_dir = Path(rapidocr_onnxruntime.__file__).parent / 'models'
                        for wrapper, model_name in [(_ocr.text_detector.infer, 'ch_PP-OCRv3_det_infer.onnx'),
                                                    (_ocr.text_recognizer.session, 'ch_PP-OCRv3_rec_infer.onnx'),
                                                    (_ocr.text_cls.infer, 'ch_ppocr_mobile_v2.0_cls_infer.onnx')]:
                            options = ort.SessionOptions()
                            options.intra_op_num_threads = 2
                            options.inter_op_num_threads = 1
                            wrapper.session = ort.InferenceSession(str(model_dir / model_name), sess_options=options,
                                                                   providers=['CPUExecutionProvider'])
                    pix = raw.get_pixmap(matrix=pymupdf.Matrix(2, 2), alpha=False)
                    rows, _ = _ocr(pix.tobytes('png'))
                page['text'] = clean_text(ocr_reading_order(rows or [], pix.width))
                page['ocr'] = True
                cached.write_text(json.dumps(page['text'], ensure_ascii=False), encoding='utf-8')
    except Exception:
        # Graceful fallback: do not break document reading if OCR encounters an issue
        pass


def clean_text(text: str) -> str:
    text = unicodedata.normalize('NFKC', text).replace('\x00', '')
    text = re.sub(r'(\w)-\n(\w)', r'\1\2', text)
    return '\n'.join(re.sub(r'[ \t]+', ' ', line).strip() for line in text.splitlines()).strip()


def read_document(data: bytes, filename: str) -> list[dict]:
    if not data:
        raise ValueError('The document is empty.')
    if len(data) > MAX_UPLOAD_BYTES:
        raise ValueError('The document exceeds the 20 MB limit.')
    extension = Path(filename).suffix.lower()
    try:
        if extension == '.pdf':
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(data))
            if reader.is_encrypted and not reader.decrypt(''):
                raise ValueError('Upload an unlocked PDF.')
            if len(reader.pages) > 250:
                raise ValueError('PDF exceeds 250 pages. Upload the relevant specification sections.')
            pages = [{'page': number, 'text': clean_text(page.extract_text() or '')}
                     for number, page in enumerate(reader.pages, 1)]
            if sum(len(p['text'].strip()) for p in pages) < 200:
                ocr_scanned_pages(data, pages)
        elif extension == '.docx':
            from docx import Document
            document = Document(io.BytesIO(data))
            blocks = []
            for block in document.iter_inner_content():
                if hasattr(block, 'rows'):
                    rows = getattr(block, 'rows', [])
                    blocks.extend(' | '.join(cell.text for cell in row.cells) for row in rows)
                elif hasattr(block, 'text'):
                    block_text = getattr(block, 'text', '')
                    if block_text:
                        blocks.append(str(block_text))
            pages = [{'page': 1, 'text': clean_text('\n'.join(blocks))}]
        elif extension == '.txt':
            pages = [{'page': 1, 'text': clean_text(data.decode('utf-8-sig'))}]
        else:
            raise ValueError('Supported files are PDF, DOCX, and UTF-8 TXT. Convert legacy DOC files to DOCX.')
    except ValueError:
        raise
    except Exception as error:
        raise ValueError('This document could not be read. Upload a valid PDF, DOCX, or UTF-8 TXT file.') from error
    if sum(len(page['text'].strip()) for page in pages) < 20:
        raise ValueError('No usable text was found. Scanned PDFs need OCR before analysis.')
    return pages
