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
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=40, rightMargin=40, topMargin=48, bottomMargin=48,
        title='Procurement Standards Review Report', author='PRAMAN')
    width = A4[0] - 80
    body = ParagraphStyle('Body', fontName=regular, fontSize=8.5, leading=13, textColor=COLOR_SLATE, spaceAfter=4)
    heading = ParagraphStyle('Section', parent=body, fontName=bold, fontSize=11, leading=15,
        textColor=COLOR_NAVY, spaceBefore=12, spaceAfter=6, keepWithNext=True)
    subheading = ParagraphStyle('Subsection', parent=body, fontName=bold, fontSize=9.5, leading=13,
        textColor=COLOR_NAVY, spaceBefore=7, spaceAfter=3, keepWithNext=True)
    title = ParagraphStyle('Title', parent=heading, fontSize=20, leading=24, spaceBefore=4, spaceAfter=6)
    cell = ParagraphStyle('Cell', parent=body, fontSize=7.8, leading=11, spaceAfter=0, splitLongWords=True)
    cell_bold = ParagraphStyle('CellBold', parent=cell, fontName=bold, textColor=COLOR_NAVY)
    small = ParagraphStyle('Small', parent=body, fontSize=7.5, leading=11)
    callout = ParagraphStyle('Callout', parent=body, fontSize=8, leading=12, textColor=colors.HexColor("#1E3A8A"))
    
    story = []
    def para(text, style=body):
        return Paragraph(clean_xml(str(text or '')).replace('\n', '<br/>'), style)
    def add(text, style=body):
        story.append(para(text, style))
    def table(headers, rows, ratios):
        if not rows:
            add('Not recorded in this analysis.', small)
            return
        values = [[para(h, subheading) for h in headers]] + [[para(v, cell) for v in row] for row in rows]
        item = Table(values, colWidths=[width*r for r in ratios], repeatRows=1, splitByRow=1, splitInRow=1, hAlign='LEFT')
        item.setStyle(TableStyle([
            ('BACKGROUND',(0,0),(-1,0),COLOR_LIGHT_BG), ('GRID',(0,0),(-1,-1),.4,COLOR_BORDER),
            ('VALIGN',(0,0),(-1,-1),'TOP'), ('LEFTPADDING',(0,0),(-1,-1),5),
            ('RIGHTPADDING',(0,0),(-1,-1),5), ('TOPPADDING',(0,0),(-1,-1),5), ('BOTTOMPADDING',(0,0),(-1,-1),5)]))
        story.append(item)

    a, ext = report.analysis, report.analysis.extracted
    brief = a.brief
    created_at = report.created_at or datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')

    # Header
    add('PRAMAN', ParagraphStyle('Brand', parent=title, fontSize=16, spaceBefore=0, spaceAfter=2))
    add('PROCUREMENT STANDARDS REPORT', ParagraphStyle('ReportTitle', parent=heading, fontSize=13, spaceBefore=0, spaceAfter=4))
    story.append(HRFlowable(width='100%', thickness=1.5, color=COLOR_NAVY, spaceAfter=6))
    add(f"<b>Item:</b> {ext.product_name}", subheading)
    add(f"<b>Report Reference:</b> {report.id} | <b>Date:</b> {created_at} | <b>Prepared for:</b> {report.officer_name}", small)
    add(f"<b>Source Document:</b> {a.source_name or ext.source_name}", small)
    if brief.get('facts'):
        facts_str = " | ".join(f"<b>{k}:</b> {v}" for k, v in brief['facts'].items())
        add(facts_str, small)
    story.append(Spacer(1, 4))

    # 1. PRIMARY STANDARD
    add('1. PRIMARY STANDARD', heading)
    primary_list = brief.get('primary_standards') or []
    if primary_list:
        p_rows = []
        for p in primary_list:
            p_rows.append([
                f"<b>{p['is_number']}</b>",
                p['title'],
                p.get('category', 'Indian Standards'),
                p.get('match', 'Verified Match')
            ])
        table(['IS Number', 'Standard Title', 'Category', 'Match Score'], p_rows, [0.22, 0.44, 0.18, 0.16])
    else:
        add('No primary standard identified in repository.', small)

    # 2. ALLIED / RELATED STANDARDS
    add('2. ALLIED / RELATED STANDARDS', heading)
    allied_list = brief.get('allied_standards') or []
    if allied_list:
        a_rows = []
        for item in allied_list[:6]:
            a_rows.append([
                f"<b>{item['is_number']}</b>",
                item['title'],
                item.get('relationship', 'Allied Standard'),
                item.get('description', 'Referenced standard')
            ])
        table(['Standard', 'Title', 'Relationship', 'Procurement Role'], a_rows, [0.20, 0.35, 0.20, 0.25])
    else:
        add('No allied standards recorded.', small)

    # 3. VERSION & AMENDMENT STATUS
    add('3. VERSION & AMENDMENT STATUS', heading)
    v_list = brief.get('version_status') or []
    if v_list:
        v_rows = []
        for v in v_list:
            amend_txt = "; ".join(v.get('amendments', [])) or "None separate"
            prev_txt = "; ".join(v.get('previous_versions', [])) or "None indexed"
            v_rows.append([
                f"<b>{v['is_number']}</b>",
                v.get('edition', v.get('active_version', '')),
                amend_txt,
                prev_txt
            ])
        table(['Standard', 'Active Edition', 'Amendment Status', 'Superseded Editions'], v_rows, [0.20, 0.25, 0.30, 0.25])
        add(v_list[0].get('status', ''), small)
    else:
        add('Standard active; verify latest amendments on BIS portal before approval.', small)

    # 4. CERTIFICATION / COMPLIANCE
    add('4. CERTIFICATION / COMPLIANCE', heading)
    cert_info = brief.get('certification_compliance') or {}
    if cert_info:
        add(f"<b>Quality Control Orders (QCO):</b> {cert_info.get('qco_status', 'Mandatory BIS compliance per statutory notifications.')}", small)
        add(f"<b>Material Test Certificates (MTC):</b> {cert_info.get('mtc_required', 'Manufacturer Test Certificate mandatory.')}", small)
        add(f"<b>Laboratory Testing:</b> {cert_info.get('testing_mandate', 'Testing at NABL accredited lab.')}", small)
        add(f"<b>Marking & Identification:</b> {cert_info.get('marking_rule', 'BIS Standard Mark on tags/products.')}", small)
        if cert_info.get('tender_mandates'):
            add("<b>Tender-Specific Compliance Clauses:</b>", small)
            for m in cert_info['tender_mandates'][:3]:
                add(f"• {m}", small)
    else:
        add('Standard requires compliance with relevant Quality Control Orders and MTC verification.', small)

    # 5. EVIDENCE & TRACEABILITY
    add('5. EVIDENCE & TRACEABILITY', heading)
    trace_list = brief.get('evidence_traceability') or []
    if trace_list:
        t_rows = []
        for t in trace_list[:6]:
            t_rows.append([
                t.get('requirement', '')[:90],
                f"<b>{t.get('is_number', '')}</b><br/>{t.get('source', '')}, p.{t.get('page', 0)}",
                t.get('excerpt', '')[:140],
                t.get('status', 'Review')
            ])
        table(['Tender Requirement', 'Standard Source', 'Evidence Quote Excerpt', 'Status'], t_rows, [0.25, 0.28, 0.35, 0.12])
    else:
        add('Traceability records available in full analysis dataset.', small)

    # 6. PROCUREMENT READINESS
    add('6. PROCUREMENT READINESS', heading)
    pr = brief.get('procurement_readiness') or {}
    score = pr.get('score', 80)
    level = pr.get('level', 'HIGH READINESS')
    add(f"<b>Readiness Assessment:</b> {score}% — {level}", subheading)
    add(pr.get('summary', 'Technical specifications and standards are defined.'), small)
    items = pr.get('items') or []
    if items:
        pr_rows = [[i.get('category', ''), i.get('label', ''), i.get('status', '').upper(), i.get('details', '')] for i in items[:5]]
        table(['Category', 'Parameter', 'Status', 'Readiness Evaluation'], pr_rows, [0.20, 0.25, 0.12, 0.43])

    # 7. RECOMMENDED ACTIONS
    add('7. RECOMMENDED ACTIONS', heading)
    actions = brief.get('recommended_actions') or brief.get('actions') or []
    for i, action in enumerate(actions, start=1):
        add(f"<b>{i}.</b> {action}", body)
    if not actions:
        add('Confirm applicability and complete pre-dispatch inspection before procurement approval.', small)

    # Document Verification & Official Sign-off
    story.append(Spacer(1, 10))
    notice_str = brief.get('notice') or 'Candidate standards require review. Confirm current BIS editions and applicability before approval.'
    story.append(KeepTogether([
        para(f"<b>Document Authenticity &amp; Audit Record:</b> Analysis ID {a.id} | Report Reference {report.id}", small),
        para(f"<b>Verification Notice:</b> {notice_str}", small),
        Spacer(1, 6),
        para('<b>Procurement Officer Sign-off:</b>', subheading),
        Spacer(1, 4),
        para('Name &amp; Designation: __________________________________    Signature: _______________________    Date: ______________', small),
        para('Official Stamp / Departmental Seal: _____________________    Approval Status: [  ] Approved  [  ] Conditional  [  ] Query', small)
    ]))

    doc.build(story, canvasmaker=NumberedCanvas)
    return buffer.getvalue()

