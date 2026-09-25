"""High-fidelity A4 Procurement Standards PDF generation using ReportLab."""
import io
import re
from datetime import datetime, timezone
from typing import Any, Dict, List

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    HRFlowable
)

from app.schemas.reports import ProcurementReport

# Brand colors (Government enterprise palette)
COLOR_NAVY = colors.HexColor("#123F63")
COLOR_SLATE = colors.HexColor("#475569")
COLOR_LIGHT_BG = colors.HexColor("#F8FAFC")
COLOR_BORDER = colors.HexColor("#CBD5E1")
COLOR_GREEN = colors.HexColor("#166534")
COLOR_AMBER = colors.HexColor("#B45309")
COLOR_RED = colors.HexColor("#991B1B")


class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas for dynamic 'Page X of Y' footers and official running headers."""
    _startPage: Any
    _pageNumber: int

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states: List[Dict[str, Any]] = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count: int):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(COLOR_SLATE)

        # Header (Pages > 1)
        if self._pageNumber > 1:
            self.drawString(40, 810, "PRAMAN - Procurement Standards Review")
            self.drawRightString(A4[0] - 40, 810, "Decision support")
            self.setStrokeColor(COLOR_BORDER)
            self.setLineWidth(0.5)
            self.line(40, 804, A4[0] - 40, 804)

        # Footer (All pages)
        self.setStrokeColor(COLOR_BORDER)
        self.setLineWidth(0.5)
        self.line(40, 38, A4[0] - 40, 38)
        
        self.drawString(
            40, 26,
            "PRAMAN - Verify source records before procurement approval"
        )
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(A4[0] - 40, 26, page_str)
        self.restoreState()


def clean_xml(text: str) -> str:
    """Escape XML special characters for ReportLab Paragraph elements."""
    if not text:
        return ""
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    text = text.replace('"', "&quot;").replace("'", "&apos;")
    return text


def build_pdf_document(report: ProcurementReport) -> bytes:
    from pathlib import Path
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    # Embed a Unicode font when available; retain a portable PDF fallback.
    regular, bold = 'Helvetica', 'Helvetica-Bold'
    candidates = [
        (Path('C:/Windows/Fonts/arial.ttf'), Path('C:/Windows/Fonts/arialbd.ttf')),
        (Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'), Path('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))]
    for normal_path, bold_path in candidates:
        if normal_path.exists() and bold_path.exists():
            if 'PramanBody' not in pdfmetrics.getRegisteredFontNames():
                pdfmetrics.registerFont(TTFont('PramanBody', str(normal_path)))
                pdfmetrics.registerFont(TTFont('PramanBold', str(bold_path)))
                pdfmetrics.registerFontFamily('PramanBody', normal='PramanBody', bold='PramanBold', italic='PramanBody', boldItalic='PramanBold')
            regular, bold = 'PramanBody', 'PramanBold'
            break
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=45, rightMargin=45, topMargin=52, bottomMargin=52,
        title='Procurement Standards Review Report', author='PRAMAN')
    width = A4[0] - 90
    body = ParagraphStyle('Body', fontName=regular, fontSize=9, leading=14, textColor=COLOR_SLATE, spaceAfter=6)
    heading = ParagraphStyle('Section', parent=body, fontName=bold, fontSize=12, leading=16,
        textColor=COLOR_NAVY, spaceBefore=16, spaceAfter=9, keepWithNext=True)
    subheading = ParagraphStyle('Subsection', parent=body, fontName=bold, fontSize=10, leading=14,
        textColor=COLOR_NAVY, spaceBefore=9, spaceAfter=5, keepWithNext=True)
    title = ParagraphStyle('Title', parent=heading, fontSize=23, leading=28, spaceBefore=12, spaceAfter=14)
    cell = ParagraphStyle('Cell', parent=body, fontSize=8, leading=12, spaceAfter=0, splitLongWords=True)
    small = ParagraphStyle('Small', parent=body, fontSize=8, leading=12)
    story = []
    def para(text, style=body):
        return Paragraph(clean_xml(str(text or '')).replace('\n', '<br/>'), style)
    def add(text, style=body):
        story.append(para(text, style))
    def table(headers, rows, ratios):
        if not rows:
            add('Not recorded in this analysis.')
            return
        values = [[para(h, subheading) for h in headers]] + [[para(v, cell) for v in row] for row in rows]
        item = Table(values, colWidths=[width*r for r in ratios], repeatRows=1, splitByRow=1, splitInRow=1, hAlign='LEFT')
        item.setStyle(TableStyle([
            ('BACKGROUND',(0,0),(-1,0),COLOR_LIGHT_BG), ('GRID',(0,0),(-1,-1),.4,COLOR_BORDER),
            ('VALIGN',(0,0),(-1,-1),'TOP'), ('LEFTPADDING',(0,0),(-1,-1),7),
            ('RIGHTPADDING',(0,0),(-1,-1),7), ('TOPPADDING',(0,0),(-1,-1),7), ('BOTTOMPADDING',(0,0),(-1,-1),7)]))
        story.append(item)
    a, ext = report.analysis, report.analysis.extracted
    created_at = report.created_at or datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')
    add('PRAMAN', ParagraphStyle('Brand',parent=title,fontSize=19,spaceBefore=0,spaceAfter=4))
    add('INDIAN PROCUREMENT STANDARDS PLATFORM', small)
    story.append(HRFlowable(width='100%', thickness=1.5, color=COLOR_NAVY, spaceAfter=8))
    add('Procurement Standards\nReview Report', title)
    add(ext.product_name, subheading)
    table(['Report record','Details'], [
        ['Report ID',report.id], ['Generated',created_at], ['Analysis ID',a.id],
        ['Procurement officer',report.officer_name], ['Source',a.source_name or ext.source_name],
        ['Analyzed',a.analyzed_at or ext.extracted_at]], [.25,.75])
    add('1. Analysis summary', heading)
    review_count = sum(row.status != 'Supported' for row in a.traceability) if a.traceability else len(ext.key_requirements)
    add(f'{len(ext.key_requirements)} requirements | {len(a.recommendations)} candidate standards | '
        f'{sum(bool(r.evidence) for r in a.recommendations)} recommendations with source evidence | {review_count} requirements to review.')
    add(a.summary_notice)
    add('2. Extracted procurement requirements', heading)
    facts = [['Product',ext.product_name], ['Intended use',ext.application or 'Not specified'],
        ['Purpose',ext.purpose or 'Not specified'], ['Quantity',ext.quantity or 'Not specified'],
        ['Category',a.category or ext.category or 'Not detected'], *[[k,v] for k,v in ext.technical_parameters.items()],
        ['Safety','; '.join(ext.safety_parameters) or 'Not specified']]
    table(['Field','Supplied requirement'], facts, [.25,.75])
    for requirement in ext.key_requirements:
        add('- ' + requirement)
    add('3. Recommended Indian Standards', heading)
    for rec in a.recommendations:
        add(rec.is_number + ' - ' + rec.title, subheading)
        add('Relevance: ' + rec.relevance.replace('-', ' ') + '. ' + rec.status)
        for reason in rec.reasons:
            add(reason)
    if not a.recommendations:
        add('No sufficiently relevant standard was identified in the available knowledge base.')
    add('4. Requirement to standard traceability', heading)
    rows = [[t.requirement, t.is_number or 'Not mapped',
        f'{t.source}, page {t.page}\n{t.excerpt}' if t.source else t.note, t.status] for t in a.traceability]
    if not rows:
        rows = [[r,'Not mapped','No verified source mapping recorded.','Review Required'] for r in ext.key_requirements]
    table(['Requirement','Standard','Evidence','Status'], rows, [.29,.18,.35,.18])
    add('5. Related standards', heading)
    if not a.related_standards:
        add('No explicit relationships were identified in the available source records.')
    for item in a.related_standards:
        add(item.is_number + ' - ' + item.title, subheading)
        add(item.relationship.replace('-', ' ').title() + ': ' + item.description)
    add('6. Version and amendment review', heading)
    for version in a.version_findings:
        add(version.indexed_version, subheading)
        add('Source: ' + (version.source or 'Not recorded'))
        add('Earlier local editions: ' + ('; '.join(version.previous_versions) or 'Not found in available records'))
        add('Amendment files: ' + ('; '.join(version.amendments) or 'Not found in available records'))
        add(version.status)
    if not a.version_findings:
        add('Not verified in the available knowledge base.')
    add('7. Specification gaps and review flags', heading)
    add('Specification gaps', subheading)
    for gap in a.gaps or a.completeness.recommendations_to_improve:
        add('- ' + gap)
    if not (a.gaps or a.completeness.recommendations_to_improve):
        add('No missing fields were identified. Adequacy still requires review.')
    add('Review flags', subheading)
    for flag in a.review_flags:
        add('- ' + flag)
    for item in a.applicability:
        add(item.referenced_standard + ': ' + item.overall)
    add('8. Source evidence', heading)
    add('Full retrieved passages. Page references refer to source documents, not this report.', small)
    index = 0
    for rec in a.recommendations:
        for ev in rec.evidence:
            index += 1
            add(f'Evidence {index} - {rec.is_number}', subheading)
            add(f'{ev.source} | page {ev.page} | {ev.citation_id}', small)
            # Flowable paragraphs split naturally across pages. No fixed-height evidence tables or truncation.
            for block in re.split(r'\n\s*\n', ev.text):
                add(block)
    if not index:
        add('No source passages were retrieved.')
    story.append(KeepTogether([
        para('9. Review and sign-off', heading),
        para('Prepared for: ' + report.officer_name),
        para('Reviewed by: ______________________________'),
        para('Signature: _________________________________'),
        para('Date: _____________________________________'),
        Spacer(1,10),
        para('PRAMAN provides decision support. This report does not certify compliance or establish current legal validity. '
             'Verify standards, amendments and applicability against authoritative BIS records before final procurement approval.', small)]))
    doc.build(story, canvasmaker=NumberedCanvas)
    return buffer.getvalue()
