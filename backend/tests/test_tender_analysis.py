"""Regression tests for the supplied two-page bridge procurement tender."""
import sys
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.schemas.analysis import RequirementInput
from app.services.ai_extractor import extract_requirements_from_input
from app.services.document_reader import read_document
from app.services.evidence_service import evaluate_specification_completeness
from app.services import job_service

PDF = Path(__file__).parent / 'fixtures' / 'demo_bridge_tender.pdf'


class TenderAnalysisTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.document = PDF.read_bytes()
        cls.pages = read_document(cls.document, PDF.name)
        cls.text = '\n'.join(page['text'] for page in cls.pages)

    def extract(self, model_result=None):
        with patch('app.services.ai_extractor.extract_requirements_with_gemini', return_value=model_result):
            return extract_requirements_from_input(RequirementInput(text=self.text))

    def test_quantity_and_deferred_details_survive_pdf_table_extraction(self):
        self.assertEqual(len(self.pages), 2)
        result = self.extract()
        self.assertEqual(result.quantity,
            'Approximately 180 metric tonnes structural steel; final quantity as per approved drawings')
        checks = evaluate_specification_completeness(result)
        self.assertEqual(next(c.status for c in checks.items if c.category == 'Quantity'), 'pass')
        self.assertNotIn('Specify the procurement quantity.', checks.recommendations_to_improve)
        self.assertTrue(any('proposed grade' in gap for gap in checks.recommendations_to_improve))
        self.assertTrue(any('drawings' in gap for gap in checks.recommendations_to_improve))

    def test_model_summary_cannot_drop_source_obligations(self):
        result = self.extract({'product_name': 'Structural steel', 'key_requirements': ['Supply structural steel']})
        clauses = '\n'.join(result.key_requirements)
        for phrase in ('Chemical composition', 'rib geometry', 'Dimensions, mass and tolerances',
                       'batch/heat identification', 'accredited/competent laboratory'):
            self.assertIn(phrase, clauses)
        self.assertIn('180 metric tonnes', result.quantity)
        self.assertNotIn('235 MPa', clauses)

    def test_quantity_heading_without_a_value_is_not_complete(self):
        result = self.extract()
        result.source_text = 'Quantity\nNot specified'
        result.quantity = ''
        result.key_requirements = ['Supply steel plates. Quantity not specified.']
        result.technical_parameters = {}
        checks = evaluate_specification_completeness(result)
        self.assertEqual(next(c.status for c in checks.items if c.category == 'Quantity'), 'warning')

    def test_uploaded_pdf_finishes_all_stages_and_can_recover_failed_job(self):
        corpus = SimpleNamespace(chunks=[], mode='test', fingerprint='test')
        with tempfile.TemporaryDirectory() as directory, \
             patch.object(job_service, 'JOB_STORE', Path(directory)), \
             patch.object(job_service.EXECUTOR, 'submit'), \
             patch.object(job_service, 'get_corpus', return_value=corpus), \
             patch.object(job_service, 'rank_standards_for_requirement', return_value=[]), \
             patch('app.services.ai_extractor.extract_requirements_with_gemini', return_value=None):
            job = job_service.create_analysis_job('test-owner', input_type='pdf', filename=PDF.name, document=self.document)
            job.status = 'FAILED'
            job.error = 'Previous failure'
            job_service.save_job(job)
            job_service._execute_job_pipeline(job.id, 'test-owner', None, None, self.document)
            completed = job_service.load_job(job.id, 'test-owner')
            self.assertEqual(completed.status, 'COMPLETED', completed.error)
            self.assertIsNone(completed.error)
            self.assertEqual(completed.progress_percent, 100)
            self.assertEqual(completed.completed_stages, job_service.STAGE_KEYS)
            self.assertTrue(all(s.status == 'completed' for s in completed.stages))
            self.assertEqual(completed.result.status, 'Needs Review')
            self.assertTrue(all(row.status == 'Not Found' for row in completed.result.traceability))
            self.assertIn('180 metric tonnes', completed.result.extracted.quantity)
            self.assertTrue((Path(directory) / f'analysis-{completed.result.id}.json').exists())

    def test_polling_does_not_lose_job_during_progress_writes(self):
        with tempfile.TemporaryDirectory() as directory, \
             patch.object(job_service, 'JOB_STORE', Path(directory)), \
             patch.object(job_service.EXECUTOR, 'submit'):
            job = job_service.create_analysis_job('test-owner', extracted=self.extract())
            def write_progress():
                for progress in range(25):
                    job.progress_percent = progress
                    job_service.save_job(job)
            with ThreadPoolExecutor(max_workers=1) as worker:
                pending = worker.submit(write_progress)
                for _ in range(50):
                    loaded = job_service.load_job(job.id, 'test-owner')
                    self.assertIsNotNone(loaded)
                    self.assertEqual(loaded.id, job.id)
                pending.result()


if __name__ == '__main__':
    unittest.main()
