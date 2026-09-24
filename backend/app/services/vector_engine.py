"""Rank real source passages, grouped by standard, with transparent retrieval scores."""
from app.schemas.analysis import StandardRecommendation, MatchBreakdown
from app.services.corpus import get_corpus, tokenize
from app.services.standards_db import evidence


def rank_standards_for_requirement(extracted):
    corpus = get_corpus()
    query = '\n'.join([extracted.product_name, extracted.application, extracted.purpose,
                       *extracted.key_requirements, *[f'{k}: {v}' for k, v in extracted.technical_parameters.items()], *extracted.safety_parameters])
    hits = corpus.search(query, limit=80)
    # Keep generic safety/performance matches from recommending a different product
    # (for example footwear for a helmet tender). Anchors come from corpus titles.
    generic = set('industrial safety protective personal general equipment material professional occupational'.split())
    product_terms = set(tokenize(extracted.product_name)) - generic
    title_terms = {term for doc in corpus.documents if not doc['amendment'] for term in tokenize(doc['title'])}
    anchors = product_terms & title_terms
    groups = {}
    for hit in hits:
        if hit['amendment']: continue
        if anchors and len(anchors & set(tokenize(hit['title']))) < max(1, len(anchors) / 2): continue
        group = groups.setdefault(hit['id'], [])
        if len(group) < 3 and not any(c['source'] != hit['source'] or c['page'] == hit['page'] for c in group): group.append(hit)
    results = []
    for standard_id, chunks in list(groups.items())[:5]:
        if not chunks: continue
        best = chunks[0]
        score = best['score']
        if score < max(.25, hits[0]['score'] * .7): continue
        amendments = [c for c in corpus.chunks if c['family'] == best['family'] and c['amendment'] and c.get('base_year') == best['year']]
        amendment_sources = set()
        for amendment in amendments:
            if amendment['source'] in amendment_sources: continue
            amendment_sources.add(amendment['source'])
            chunks.append(amendment)
        results.append(StandardRecommendation(id=standard_id, is_number=best['is_number'], title=best['title'],
            relevance='high' if score >= .65 else 'medium' if score >= .4 else 'needs-review', score=round(score * 100, 1),
            reasons=[f'Retrieved matching passages from {best["source"]}. Review the scope and conditions in the evidence.',
                     'Score measures retrieval relevance, not conformity or legal applicability.',
                     f'{len(amendment_sources)} separate amendment files for this edition are available locally; review their changes alongside the base text.'],
            breakdown=MatchBreakdown(product_match='Evidence retrieved', application_match='Review source scope',
                safety_match='Not verified', technical_match='Not verified'), evidence=[evidence(c) for c in chunks],
            latest_version=f'{corpus.latest.get(best["family"], best["year"])} (latest base edition in local files only)',
            status='Local edition; current BIS status unverified', category='Indian Standards'))
    return results
