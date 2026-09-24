"""Catalog metadata and evidence derived exclusively from indexed local documents."""
import re
from urllib.parse import quote
from app.schemas.standards import IndianStandard, SourceEvidence, StandardGraph
from app.services.corpus import get_corpus


def evidence(chunk):
    return SourceEvidence(section='Source excerpt', clause=f'PDF page {chunk["page"]}', text=chunk['text'],
        confidence=chunk.get('score', 0), verified=False, source=chunk['source'], page=chunk['page'],
        citation_id=chunk['citation_id'], source_url='/api/v1/standards/source/' + quote(chunk['source']) + '#page=' + str(chunk['page']))


def catalog_entry(doc, corpus):
    chunks = [c for c in corpus.chunks if c['source'] == doc['source']]
    scope_chunks = [c for c in chunks if re.search(r'\b1\s+SCOPE\b', c['text'], re.I)]
    scope = scope_chunks[0]['text'] if scope_chunks else 'See the source document for scope and limitations.'
    related = []
    # Only explicit IS references are relationships, never inferred shared keywords.
    reference_chunks = [c for c in chunks if re.search(r'\breferences?\b', c['text'], re.I)]
    for other in corpus.documents:
        if other['family'] == doc['family'] or other['amendment'] or other['year'] != corpus.latest.get(other['family']): continue
        hit = next((c for c in reference_chunks if re.search(r'\bIS\s*' + other['number'] + r'\b', c['text'], re.I)), None)
        if hit and not any(r['id'] == other['id'] for r in related):
            related.append({'id': other['id'], 'is_number': other['is_number'], 'title': other['title'],
                            'relationship': 'related', 'description': f'IS number mentioned on PDF page {hit["page"]} of {doc["source"]}. Confirm the referenced part and edition in the source.'})
    versions = []
    seen = set()
    for item in sorted(corpus.documents, key=lambda d: (d['year'], d['amendment'])):
        if item['family'] != doc['family'] or item['id'] in seen: continue
        seen.add(item['id'])
        versions.append({'year': item['year'], 'title': item['source'],
                         'type': 'amendment' if item['amendment'] else ('latest' if item['year'] == corpus.latest.get(doc['family']) else 'original'),
                         'description': 'Local file only; validate amendment applicability and current BIS status.'})
    cert = [c for c in chunks if re.search(r'standard mark|certification|hallmark|registration scheme', c['text'], re.I)]
    return IndianStandard(id=doc['id'], is_number=doc['is_number'], title=doc['title'], category='Indian Standards',
        status='Local edition', year=doc['year'], scope=scope, key_requirements=[], clauses=[], related_standards=related,
        versions=versions, certifications=[{'scheme': 'Certification status', 'status': 'Not established',
            'details': 'Local standard text does not by itself confirm current mandatory BIS certification, CRS, hallmarking or QCO coverage. Review the cited clauses and current official orders.', 'is_mandatory': False}],
        sources=[evidence(c) for c in (scope_chunks[:1] + cert[:2] or chunks[:1])] +
                [evidence(next(c for c in corpus.chunks if c['source'] == amendment['source']))
                 for amendment in corpus.documents if amendment['family'] == doc['family'] and amendment['amendment'] and amendment.get('base_year') == doc['year']
                 and any(c['source'] == amendment['source'] for c in corpus.chunks)])


def get_all_standards():
    corpus = get_corpus()
    unique = {d['id']: d for d in reversed(corpus.documents) if not d['amendment']}
    return [catalog_entry(d, corpus) for d in unique.values()]


def get_standard_by_id(standard_id):
    corpus = get_corpus()
    doc = next((d for d in corpus.documents if d['id'].lower() == standard_id.lower()), None)
    return catalog_entry(doc, corpus) if doc else None


def get_standard_graph(standard_id):
    std = get_standard_by_id(standard_id)
    if not std: return StandardGraph(nodes=[], edges=[])
    nodes = [{'id': std.id, 'is_number': std.is_number, 'title': std.title, 'type': 'main', 'category': std.category}]
    edges = []
    for related in std.related_standards:
        nodes.append({'id': related.id, 'is_number': related.is_number, 'title': related.title, 'type': 'reference', 'category': 'Referenced document'})
        edges.append({'source': std.id, 'target': related.id, 'relationship': related.description})
    return StandardGraph(nodes=nodes, edges=edges)
