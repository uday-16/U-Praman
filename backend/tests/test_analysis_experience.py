"""Regression coverage for honest progress, source mappings and complete reports."""
import io
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from test_login_sessions import database
from app.schemas.analysis import ExtractedRequirement, StandardRecommendation, MatchBreakdown, AnalysisResult, RequirementInput
from app.schemas.standards import SourceEvidence, StandardGraph
from app.schemas.reports import ProcurementReport
from app.services.analysis_findings import select_mappings, traceability, verify_evidence
from app.services.ai_extractor import validate_requirement
from app.services import job_service
from app.services.evidence_service import evaluate_specification_completeness
from app.services.gemini_service import GenerationUnavailable
from app.services.pdf_service import build_pdf_document
from app.services.document_reader import read_document


def extraction():
    return ExtractedRequirement(id='req-test', product_name='Industrial safety helmets', application='Construction',
        purpose='Head protection', key_requirements=['Impact protection', 'Testing required'], technical_parameters={},
        safety_parameters=['Impact protection'], extracted_at='2026-09-25', source_text='Supply industrial safety helmets with impact protection.')


def recommendation(text='Safety helmets shall provide impact protection for industrial workers.'):
    return StandardRecommendation(id='is-2925-1984',is_number='IS 2925:1984',title='Industrial safety helmets',
        relevance='medium',score=45,reasons=['Retrieved source passages.'],
        breakdown=MatchBreakdown(product_match='Review',application_match='Review',safety_match='Review',technical_match='Review'),
        evidence=[SourceEvidence(text=text,source='is.2925.1984.pdf',page=3,citation_id='helmet:p3:c0')],
        latest_version='1984',status='Current status unverified',category='Indian Standards')


class FindingTests(unittest.TestCase):
    def test_invalid_input_rejected_before_model(self):
        for text in ['', '   ', '1234567890', 'asdf asdf asdf', 'hello hello hello']:
            with self.subTest(text=text), self.assertRaises(ValueError):
                validate_requirement(text)
        self.assertEqual(validate_requirement('Steel plates'), 'Steel plates')

    def test_unknown_citations_and_fabricated_quotes_are_discarded(self):
        rec = recommendation()
        for mapping in [
            {'requirement_index':0,'citation_id':'invented','quote':rec.evidence[0].text,'status':'Supported'},
            {'requirement_index':0,'citation_id':'helmet:p3:c0','quote':'Invented mandatory certification requirement','status':'Supported'},
            {'requirement_index':99,'citation_id':'helmet:p3:c0','quote':rec.evidence[0].text,'status':'Supported'}]:
            with patch('app.services.analysis_findings.generate',return_value={'mappings':[mapping]}):
                rows,_ = select_mappings(extraction(),[rec])
            self.assertEqual(rows,[])

    def test_exact_quote_keeps_provenance_without_claiming_conformity(self):
        rec = recommendation()
        with patch('app.services.analysis_findings.generate',return_value={'mappings':[
            {'requirement_index':0,'citation_id':'helmet:p3:c0','quote':rec.evidence[0].text,'status':'Supported'}]}):
            mapped,_ = select_mappings(extraction(),[rec])
        rows = traceability(extraction(), mapped,[rec])
        self.assertEqual(rows[0].status,'Partial')
        self.assertEqual(rows[0].source,'is.2925.1984.pdf')
        self.assertEqual(rows[1].status,'Review Required')
        self.assertFalse(rows[1].standard_id)

    def test_no_match_and_model_outage_never_invent_coverage(self):
        with patch('app.services.analysis_findings.generate') as model:
            self.assertEqual(select_mappings(extraction(),[]),([], 'no-evidence'))
            model.assert_not_called()
        with patch('app.services.analysis_findings.generate',side_effect=GenerationUnavailable('offline')):
            mapped,mode=select_mappings(extraction(),[recommendation()])
        self.assertEqual(mode,'source-review-required')
        self.assertEqual(mapped,[])
        self.assertTrue(all(r.status=='Not Found' for r in traceability(extraction(),[],[])))

    def test_evidence_must_match_indexed_page_and_text(self):
        from types import SimpleNamespace
        rec = recommendation()
        corpus = SimpleNamespace(chunks=[{'citation_id':'helmet:p3:c0','source':'is.2925.1984.pdf','page':4,'text':rec.evidence[0].text}])
        verify_evidence([rec], corpus)
        self.assertEqual(rec.evidence,[])

    def test_job_failure_does_not_complete_later_stages(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(job_service,'JOB_STORE',Path(directory)), patch.object(job_service.EXECUTOR,'submit'), patch.object(job_service,'get_corpus',side_effect=OSError('private internal path')):
            job=job_service.create_analysis_job('owner',extracted=extraction())
            job_service._execute_job_pipeline(job.id,'owner',extraction(),None)
            failed=job_service.load_job(job.id,'owner')
            self.assertEqual(failed.status,'FAILED')
            self.assertEqual(failed.current_stage,'RETRIEVING')
            self.assertNotIn('FINALIZING',failed.completed_stages)
            self.assertNotIn('private',failed.error)
            self.assertEqual(failed.stages[-1].status,'pending')
            self.assertIsNone(job_service.load_job(job.id,'other'))

    def test_upload_extraction_runs_after_job_creation(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(job_service,'JOB_STORE',Path(directory)), patch.object(job_service.EXECUTOR,'submit') as submit, patch.object(job_service,'read_document',side_effect=ValueError('Unable to extract text from this document.')) as read:
            job=job_service.create_analysis_job('owner',filename='bad.pdf',document=b'bad-pdf')
            read.assert_not_called()
            self.assertEqual(job.status,'QUEUED')
            job_service._execute_job_pipeline(job.id,'owner',None,None,b'bad-pdf')
            failed=job_service.load_job(job.id,'owner')
            self.assertEqual(failed.current_stage,'EXTRACTING')
            self.assertEqual(failed.status,'FAILED')

    def test_pdf_upload_uses_real_extraction(self):
        from reportlab.pdfgen.canvas import Canvas
        stream=io.BytesIO(); canvas=Canvas(stream)
        canvas.drawString(60,760,'Supply structural steel plates for bridge construction. Testing required.')
        canvas.save()
        pages=read_document(stream.getvalue(),'tender.pdf')
        self.assertIn('structural steel',pages[0]['text'])

    def test_long_evidence_survives_pdf_pagination(self):
        import pymupdf
        ext=extraction()
        long_text=('Measured impact protection must be reviewed against the source conditions. '*1000)+' EVIDENCE-END-MARKER'
        rec=recommendation(long_text)
        result=AnalysisResult(id='anl-test',status='Completed',extracted=ext,recommendations=[rec],
            related_standards=[],completeness=evaluate_specification_completeness(ext),graph=StandardGraph(nodes=[],edges=[]),
            summary_notice='Decision support only.',traceability=traceability(ext,[],[rec]))
        report=ProcurementReport(id='rpt-test',title='Test report',product_name=ext.product_name,created_at='2026-09-25',
            status='Completed',officer_name='Test Officer',analysis=result,pdf_download_url='')
        pdf=build_pdf_document(report)
        document=pymupdf.open(stream=pdf,filetype='pdf')
        text='\n'.join(page.get_text() for page in document)
        self.assertIn('EVIDENCE-END-MARKER',text)
        self.assertIn('Review Required',text)
        self.assertNotIn('VERIFIED',text)
        self.assertNotIn('Conforms with',text)
        self.assertGreater(len(document),5)
        for page in document:
            self.assertAlmostEqual(page.rect.width,595.28,delta=1)
            self.assertIn('Page ',page.get_text())
            for x0,y0,x1,y1,*_ in page.get_text('blocks'):
                self.assertGreaterEqual(x0,35)
                self.assertLessEqual(x1,page.rect.width-35)
                self.assertLessEqual(y1,page.rect.height-15)
