import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.schemas.analysis import AnalysisResult


class BriefTests(unittest.TestCase):
    def analysis(self):
        return AnalysisResult.model_validate({
            'id': 'anl-summary', 'status': 'Needs Review',
            'extracted': {'id': 'req-summary', 'product_name': 'Structural steel',
                'application': 'Road bridge', 'purpose': '', 'quantity': '180 metric tonnes',
                'key_requirements': ['Yield strength at least 355 MPa'],
                'technical_parameters': {'Quantity': '180 metric tonnes', 'Yield strength': 'at least 355 MPa'},
                'safety_parameters': [], 'extracted_at': '2026-09-26'},
            'recommendations': [], 'related_standards': [],
            'completeness': {'score': 50, 'items': [], 'recommendations_to_improve': ['Confirm final dimensions.']},
            'gaps': ['Confirm final dimensions.', 'No verified source mapping for: one', 'No verified source mapping for: two'],
            'graph': {'nodes': [], 'edges': []}, 'summary_notice': 'Decision support only.'})

    def test_deduplicates_summary_without_losing_numeric_limits(self):
        a = self.analysis()
        brief = a.brief
        self.assertEqual(brief['facts']['Quantity'], '180 metric tonnes')
        self.assertEqual(brief['facts']['Yield strength'], 'at least 355 MPa')
        self.assertEqual(brief['actions'].count('Confirm final dimensions.'), 1)
        self.assertFalse(any('No verified source mapping for:' in v for v in brief['actions']))
        self.assertTrue(any('no suitable candidate' in v for v in brief['actions']))
        self.assertEqual(len(a.gaps), 3)

    def test_old_records_gain_same_brief_after_serialization(self):
        a = self.analysis()
        payload = a.model_dump()
        self.assertEqual(payload['brief'], a.brief)
        payload['brief'] = {'facts': {'Quantity': 'invented'}}
        self.assertEqual(AnalysisResult.model_validate(payload).brief, a.brief)

    def test_unusual_warning_and_referenced_edition_are_retained(self):
        a = self.analysis()
        a.review_flags = ['Important document pages are unreadable.']
        from app.schemas.analysis import ApplicabilityFinding
        a.applicability = [ApplicabilityFinding(referenced_standard='IS 1234:2020')]
        self.assertIn('Important document pages are unreadable.', a.brief['actions'])
        self.assertTrue(any('IS 1234:2020' in x for x in a.brief['actions']))


if __name__ == '__main__':
    unittest.main()
