import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path('backend').resolve()))
from app.schemas.analysis import AnalysisResult
from app.schemas.reports import ProcurementReport
from app.services.pdf_service import build_pdf_document
import pymupdf

data = json.loads(Path('backend/data/analyses/analysis-anl-9a27b0a720ff43b480c8c141e8b1a44d.json').read_text(encoding='utf-8'))['data']
analysis = AnalysisResult.model_validate(data)
report = ProcurementReport(id='rpt-demo-summary', title='Procurement Standards Report',
    product_name=analysis.extracted.product_name, created_at='2026-09-26', status='Completed',
    officer_name='Procurement Officer', analysis=analysis, pdf_download_url='')
out = Path('output/pdf'); out.mkdir(parents=True, exist_ok=True)
pdf = out / 'PRAMAN_Concise_Report.pdf'
pdf.write_bytes(build_pdf_document(report))
doc = pymupdf.open(pdf)
text = '\n'.join(p.get_text() for p in doc)
for expected in ['180 metric tonnes', 'IS 2062', 'Before approval', 'grade', 'does not certify compliance']:
    assert expected in text, expected
assert 'No verified source mapping for:' not in text
assert len(doc) <= 2
for i, page in enumerate(doc):
    page.get_pixmap(matrix=pymupdf.Matrix(1.5,1.5)).save(str(out / f'check-page-{i+1}.png'))
    for x0,y0,x1,y1,*_ in page.get_text('blocks'):
        assert x0 >= 35 and x1 <= page.rect.width-35 and y1 <= page.rect.height-15
print('PDF pages:',len(doc), 'Actions:',len(analysis.brief['actions']))

payload = json.dumps(report.model_dump(),ensure_ascii=True).replace('<','\\u003c')
css = ['reset','variables','typography','main','layout','components','results','forms','analysis-flow','report-document']
head = ''.join(f'<link rel="stylesheet" href="/css/{name}.css">' for name in css)
for name, expression in [('analysis','renderResultsMarkup(report.analysis)'),('report','reportDocument(report)')]:
    Path(f'frontend/verify-{name}.html').write_text(f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">{head}<title>PRAMAN {name} verification</title></head><body style="background:#f6f8fa"><main id="analysis-content" style="max-width:1000px;margin:32px auto;padding:0 24px"></main><script type="module">import {{renderResultsMarkup}} from '/js/analysis-results.js';import {{reportDocument}} from '/js/report-summary.js';const report={payload};document.querySelector('main').innerHTML={expression};</script></body></html>''',encoding='utf-8')
