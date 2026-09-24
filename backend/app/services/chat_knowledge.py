"""Local standards retrieval with page citations; no simulated embeddings."""
import logging
import math
import os
import re
from collections import Counter
from pathlib import Path
from threading import Lock
from PyPDF2 import PdfReader

logger = logging.getLogger(__name__)
BACKEND = Path(__file__).resolve().parents[2]
STOP = set('a an the is are was were be for of on in to and or what which how do does under about me tell please give explain according standard standards indian permissible requirements requirement specification specifications limit limits available file files pdf value values maximum minimum max min level levels'.split())
_lock = Lock()
_signature = None
_pages = []
CODE = r'\bis[\s._-]*(\d+)(?:[\s._(-]*(?:part[\s._-]*)?(\d{1,2})(?!\d)\)?)?'
STANDARD_TOPICS = {
    'IS 10500': {'water', 'drinking', 'drink', 'water', 'quality'},
    'IS 2925': {'helmet', 'helmets', 'industrial', 'safety', 'head'},
    'IS 694': {'cable', 'cables', 'pvc', 'electrical', 'wire'},
    'IS 1489': {'cement', 'pozzolana', 'concrete', 'flyash', 'fly', 'ash'},
    'IS 1293': {'plug', 'plugs', 'socket', 'sockets', 'outlet', 'electrical'},
    'IS 2062': {'steel', 'structural', 'plate', 'plates', 'bar', 'bars'},
    'IS 15652': {'mat', 'mats', 'insulating', 'insulation', 'electrical'},
    'IS 15328': {'pipe', 'pipes', 'drainage', 'sewerage', 'pvc'},
    'IS 15298': {'footwear', 'shoe', 'shoes', 'safety', 'boot', 'boots'},
    'IS 302': {'appliance', 'appliances', 'household', 'electrical', 'safety'},
}


def data_directory():
    configured = os.getenv('STANDARDS_DATA_DIR')
    if configured:
        path = Path(configured)
        return path if path.is_absolute() else BACKEND / path
    for preferred in (BACKEND / 'datad', BACKEND / 'datab'):
        if preferred.exists():
            return preferred
    return BACKEND.parent / 'datab'


def tokens(text):
    aliases = {'testing': 'test', 'tests': 'test', 'insulated': 'insulation'}
    return [aliases.get(w, w.rstrip('s') if len(w) > 4 else w) for w in re.findall(r'[a-z]+|\d+(?:\.\d+)?', text.lower()) if w not in STOP]


def standard_code(text):
    match = re.search(CODE, text, re.I)
    return ('IS ' + match[1] + (f' Part {match[2]}' if match[2] else '')) if match else None


def infer_topic(text):
    terms = set(tokens(text))
    for code, aliases in STANDARD_TOPICS.items():
        if terms & aliases:
            return next(iter(terms & aliases))
    return ''


def load_pages():
    global _signature, _pages
    directory = data_directory()
    paths = sorted(directory.rglob('*.pdf')) if directory.exists() else []
    signature = tuple((str(p), p.stat().st_mtime_ns, p.stat().st_size) for p in paths)
    with _lock:
        if signature == _signature:
            return _pages
        pages = []
        for path in paths:
            try:
                code = standard_code(path.name.lstrip('zZ')) or 'Unidentified standard'
                for number, page in enumerate(PdfReader(str(path)).pages, 1):
                    text = (page.extract_text() or '').strip()
                    if len(text) < 60:
                        continue
                    # Whole pages preserve table headers, units, and notes together.
                    pages.append(dict(source=path.relative_to(directory).as_posix(), is_number=code,
                                      page=number, chunk_index=number - 1, text=text,
                                      terms=Counter(tokens(text))))
            except Exception:
                logger.warning('Cannot extract standards file: %s', path.name)
        _pages, _signature = pages, signature
        return _pages


def retrieve(query, standard_id=None, limit=5, topic=''):
    pages = load_pages()
    codes = list(dict.fromkeys(standard_code(m.group()) for m in re.finditer(CODE, query, re.I)))
    if standard_id:
        code = standard_code(standard_id)
        if not code:
            return []
        codes = [code]
    if codes:
        pages = [p for p in pages if any(p['is_number'] == c or p['is_number'].startswith(c + ' Part ') for c in codes)]
    elif topic:
        # Product discovery must match the document's title/cover, not a test fixture.
        identities = {}
        for p in pages:
            if p['page'] <= 3:
                text = p['text']
                heading = re.search(r'Indian\s+Standard\s*\n', text, re.I)
                title = text[heading.end():heading.end() + 220] if heading else text[:600]
                identities.setdefault(p['source'], set()).update(tokens(title))
        wanted = set(tokens(topic))
        # Some BIS PDFs begin with a rights/disclosure page. Known local codes provide
        # a safe title identity when the actual cover heading is not extractable.
        for source, code in ((p['source'], p['is_number'].split(' Part')[0]) for p in pages):
            if code in STANDARD_TOPICS:
                identities.setdefault(source, set()).update(STANDARD_TOPICS[code])
        if wanted:
            sources = {source for source, terms in identities.items() if len(wanted & terms) / len(wanted) >= .5}
            pages = [p for p in pages if p['source'] in sources]
    # Prefer the newest base edition present locally, never claim it is current BIS law.
    # Explicitly requested publication years remain searchable.
    years = set(re.findall(r'\b(?:19|20)\d{2}\b', query))
    def year(page):
        found = re.findall(r'(?:19|20)\d{2}', page['source'])
        return found[-1] if found else ''
    if years:
        pages = [p for p in pages if year(p) in years]
    else:
        latest = {}
        for p in pages:
            if 'amd' not in p['source'].lower():
                latest[p['is_number']] = max(latest.get(p['is_number'], ''), year(p))
        pages = [p for p in pages if 'amd' in p['source'].lower() or year(p) == latest.get(p['is_number'])]
    if not pages:
        return []
    terms = set(tokens(re.sub(CODE, '', query, flags=re.I))) - {'part'} - years
    if not terms:
        return [{k: v for k, v in p.items() if k != 'terms'} for p in pages[:limit]] if codes else []
    frequencies = {t: sum(t in p['terms'] for p in pages) for t in terms}
    average = sum(sum(p['terms'].values()) for p in pages) / len(pages)
    ranked = []
    for page in pages:
        overlap = terms & page['terms'].keys()
        if len(overlap) / len(terms) < 0.6:
            continue
        length = sum(page['terms'].values())
        score = sum(math.log(1 + (len(pages) - frequencies[t] + .5) / (frequencies[t] + .5)) *
                    (page['terms'][t] * 2.5) / (page['terms'][t] + 1.5 * (.25 + .75 * length / average)) for t in overlap)
        if '.b.' in page['source'].lower():
            score *= .35  # Prefer the readable English copy over legacy-font bilingual text.
        ranked.append((score, page))
    ranked.sort(key=lambda pair: pair[0], reverse=True)
    return [{k: v for k, v in p.items() if k != 'terms'} for _, p in ranked[:limit]]
