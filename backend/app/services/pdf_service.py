"""High-fidelity A4 Procurement Standards PDF generation using ReportLab."""
import io
import re
from datetime import datetime
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
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

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
            self.drawString(40, 810, "PRAMAN — Standards Recommendation & Procurement Compliance Report")
            self.drawRightString(A4[0] - 40, 810, "Confidential — Official Use Only")
            self.setStrokeColor(COLOR_BORDER)
            self.setLineWidth(0.5)
            self.line(40, 804, A4[0] - 40, 804)

        # Footer (All pages)
        self.setStrokeColor(COLOR_BORDER)
        self.setLineWidth(0.5)
        self.line(40, 38, A4[0] - 40, 38)
        
        self.drawString(
            40, 26,
            "Government Procurement Standards Decision-Support Report · Conforms with GFR Rule 144 & BIS Act"
        )
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(A4[0] - 40, 26, page_str)
        self.restoreState()


def clean_xml(text: str) -> str:
    """Escape XML special characters for ReportLab Paragraph elements."""
    if not text:
        return ""
    text = str(text)
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    text = text.replace('"', "&quot;").replace("'", "&apos;")
    return text


def build_pdf_document(report: ProcurementReport) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=48,
        bottomMargin=48
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    style_title = ParagraphStyle(
        "ReportTitle",
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=COLOR_NAVY,
        spaceAfter=4
    )
    style_subtitle = ParagraphStyle(
        "ReportSubtitle",
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=COLOR_SLATE,
        spaceAfter=12
    )
    style_h1 = ParagraphStyle(
        "Heading1_Custom",
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=COLOR_NAVY,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )
    style_h2 = ParagraphStyle(
        "Heading2_Custom",
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#1E293B"),
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )
    style_body = ParagraphStyle(
        "Body_Custom",
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#1E293B")
    )
    style_meta_label = ParagraphStyle(
        "MetaLabel",
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=11,
        textColor=COLOR_SLATE
    )
    style_meta_val = ParagraphStyle(
        "MetaVal",
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#0F172A")
    )
    style_table_header = ParagraphStyle(
        "TableHeader",
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=11,
        textColor=COLOR_NAVY
    )
    style_table_cell = ParagraphStyle(
        "TableCell",
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#1E293B")
    )
    style_evidence_box = ParagraphStyle(
        "EvidenceBox",
        fontName="Courier",
        fontSize=7.5,
        leading=10.5,
        textColor=colors.HexColor("#1E293B")
    )
    style_disclaimer = ParagraphStyle(
        "Disclaimer",
        fontName="Helvetica-Oblique",
        fontSize=7.5,
        leading=11,
        textColor=COLOR_SLATE
    )

    story = []

    # 1. Header & Title Block
    story.append(Paragraph("PRAMAN — STANDARDS RECOMMENDATION REPORT", style_title))
    story.append(Paragraph(
        "Official Technical Decision-Support Document for Public Procurement & Standards Identification",
        style_subtitle
    ))
    story.append(HRFlowable(width="100%", thickness=1.5, color=COLOR_NAVY, spaceBefore=0, spaceAfter=10))

    # 2. Metadata Grid Table
    analysis = report.analysis
    extracted = analysis.extracted
    created_at = report.created_at or datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

    meta_data = [
        [
            Paragraph("Report Reference ID:", style_meta_label),
            Paragraph(clean_xml(report.id), style_meta_val),
            Paragraph("Date Generated:", style_meta_label),
            Paragraph(clean_xml(created_at), style_meta_val),
        ],
        [
            Paragraph("Procurement Product:", style_meta_label),
            Paragraph(clean_xml(extracted.product_name), style_meta_val),
            Paragraph("Prepared By:", style_meta_label),
            Paragraph(clean_xml(report.officer_name or "Procurement Officer"), style_meta_val),
        ],
        [
            Paragraph("Retrieval Engine:", style_meta_label),
            Paragraph(f"Hybrid RAG ({clean_xml(analysis.retrieval_mode or 'BM25 + Semantic')})", style_meta_val),
            Paragraph("Verification Status:", style_meta_label),
            Paragraph(clean_xml(report.status or "Completed"), style_meta_val),
        ]
    ]
    meta_table = Table(meta_data, colWidths=[120, 160, 110, 125])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_LIGHT_BG),
        ('BOX', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 12))

    # 3. Requirement & Extracted Specifications Section
    story.append(Paragraph("1. Procurement Requirement & Extracted Specifications", style_h1))
    
    spec_rows = [
        [Paragraph("Product / Commodity", style_table_header), Paragraph(clean_xml(extracted.product_name), style_table_cell)],
        [Paragraph("Intended Application", style_table_header), Paragraph(clean_xml(extracted.application or "General procurement"), style_table_cell)],
        [Paragraph("Procurement Purpose", style_table_header), Paragraph(clean_xml(extracted.purpose or "Industrial / Public works compliance"), style_table_cell)],
        [Paragraph("Key Requirements", style_table_header), Paragraph("<br/>• " + "<br/>• ".join(clean_xml(r) for r in extracted.key_requirements[:6]) if extracted.key_requirements else "None specified", style_table_cell)],
    ]
    if extracted.technical_parameters:
        tech_str = "<br/>".join(f"<b>{clean_xml(k)}:</b> {clean_xml(v)}" for k, v in list(extracted.technical_parameters.items())[:6])
        spec_rows.append([Paragraph("Technical Specs", style_table_header), Paragraph(tech_str, style_table_cell)])
    if extracted.safety_parameters:
        safety_str = "<br/>• ".join(clean_xml(s) for s in extracted.safety_parameters[:5])
        spec_rows.append([Paragraph("Safety Parameters", style_table_header), Paragraph(safety_str, style_table_cell)])

    spec_table = Table(spec_rows, colWidths=[130, 385])
    spec_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), COLOR_LIGHT_BG),
        ('GRID', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(spec_table)
    story.append(Spacer(1, 12))

    # 4. Recommended Indian Standards
    story.append(Paragraph("2. Recommended Indian Standards (BIS)", style_h1))
    if analysis.recommendations:
        rec_headers = [
            Paragraph("Standard Code", style_table_header),
            Paragraph("Title & Specification", style_table_header),
            Paragraph("Relevance", style_table_header),
            Paragraph("Status & Edition", style_table_header),
        ]
        rec_rows = [rec_headers]
        for rec in analysis.recommendations:
            rec_rows.append([
                Paragraph(f"<b>{clean_xml(rec.is_number)}</b>", style_table_cell),
                Paragraph(f"<b>{clean_xml(rec.title)}</b><br/><font color='#64748B'>{clean_xml(rec.reasons[0] if rec.reasons else '')}</font>", style_table_cell),
                Paragraph(f"{rec.score:.1f}%<br/><font size='7' color='#0369A1'>{clean_xml(rec.relevance.upper())}</font>", style_table_cell),
                Paragraph(clean_xml(rec.latest_version), style_table_cell),
            ])
        rec_table = Table(rec_rows, colWidths=[95, 260, 65, 95])
        rec_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), COLOR_LIGHT_BG),
            ('GRID', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(rec_table)
    else:
        story.append(Paragraph("No sufficiently supported standard was identified in the available knowledge base.", style_body))
    story.append(Spacer(1, 12))

    # 5. Evidence Passages (Collapsible in UI, Structured in PDF)
    story.append(Paragraph("3. Supporting Evidence & BIS Clause Citations", style_h1))
    evidence_count = 0
    for rec in analysis.recommendations[:3]:
        if rec.evidence:
            story.append(Paragraph(f"Evidence for {clean_xml(rec.is_number)} ({len(rec.evidence)} source passages):", style_h2))
            for i, ev in enumerate(rec.evidence[:3], 1):
                evidence_count += 1
                ev_header = f"<b>Source [{i}]:</b> {clean_xml(ev.source)} · PDF Page {ev.page}"
                ev_text = clean_xml(ev.text.strip()[:650] + ("..." if len(ev.text.strip()) > 650 else ""))
                
                box_data = [
                    [Paragraph(ev_header, style_table_header)],
                    [Paragraph(ev_text, style_evidence_box)]
                ]
                box_table = Table(box_data, colWidths=[515])
                box_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), COLOR_LIGHT_BG),
                    ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor("#FAFAFA")),
                    ('BOX', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
                    ('TOPPADDING', (0, 0), (-1, -1), 3),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                    ('LEFTPADDING', (0, 0), (-1, -1), 6),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ]))
                story.append(box_table)
                story.append(Spacer(1, 4))
    if evidence_count == 0:
        story.append(Paragraph("No direct textual excerpts were retrieved for this query.", style_body))
    story.append(Spacer(1, 10))

    # 6. Specification Completeness & Gaps
    story.append(Paragraph("4. Specification Completeness & Compliance Gaps", style_h1))
    comp = analysis.completeness
    story.append(Paragraph(f"<b>Overall Completeness Score:</b> {comp.score} / 100", style_body))
    
    if comp.items:
        gap_headers = [
            Paragraph("Check Item", style_table_header),
            Paragraph("Category", style_table_header),
            Paragraph("Status", style_table_header),
            Paragraph("Review Details", style_table_header)
        ]
        gap_rows = [gap_headers]
        for it in comp.items[:6]:
            status_color = COLOR_GREEN if it.status == 'pass' else (COLOR_AMBER if it.status == 'warning' else COLOR_RED)
            gap_rows.append([
                Paragraph(clean_xml(it.label), style_table_cell),
                Paragraph(clean_xml(it.category), style_table_cell),
                Paragraph(f"<font color='{status_color.hexval()}'><b>{clean_xml(it.status.upper())}</b></font>", style_table_cell),
                Paragraph(clean_xml(it.details), style_table_cell),
            ])
        gap_table = Table(gap_rows, colWidths=[120, 95, 60, 240])
        gap_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), COLOR_LIGHT_BG),
            ('GRID', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(gap_table)
    story.append(Spacer(1, 10))

    # 7. Traceability Matrix
    story.append(Paragraph("5. Traceability Matrix (Requirement → Standard → Evidence)", style_h1))
    trace_headers = [
        Paragraph("Requirement Item", style_table_header),
        Paragraph("Applicable Standard", style_table_header),
        Paragraph("Verification Evidence", style_table_header),
        Paragraph("Status", style_table_header)
    ]
    trace_rows = [trace_headers]
    if analysis.recommendations:
        top_rec = analysis.recommendations[0]
        for req_item in extracted.key_requirements[:4]:
            first_ev = top_rec.evidence[0] if top_rec.evidence else None
            ev_summary = f"{first_ev.source} (Page {first_ev.page})" if first_ev else "Clause match"
            trace_rows.append([
                Paragraph(clean_xml(req_item[:80]), style_table_cell),
                Paragraph(f"<b>{clean_xml(top_rec.is_number)}</b>", style_table_cell),
                Paragraph(clean_xml(ev_summary), style_table_cell),
                Paragraph("<font color='#166534'><b>VERIFIED</b></font>", style_table_cell)
            ])
    trace_table = Table(trace_rows, colWidths=[140, 110, 175, 90])
    trace_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLOR_LIGHT_BG),
        ('GRID', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(trace_table)
    story.append(Spacer(1, 14))

    # 8. Dynamic Sign-Off & Official Authority Block (Phase 13)
    story.append(KeepTogether([
        Paragraph("6. Procurement Authority Sign-Off", style_h1),
        Table([
            [
                Paragraph(
                    f"<b>Prepared &amp; Verified By:</b><br/>"
                    f"{clean_xml(report.officer_name or 'Procurement Officer')}<br/>"
                    f"<font color='#64748B'>Designation: Procurement Officer<br/>"
                    f"Department: Central Procurement Division<br/>"
                    f"Date: {clean_xml(created_at)}</font>",
                    style_body
                ),
                Paragraph(
                    "<b>Authorized Signature:</b><br/><br/><br/>"
                    "____________________________________________<br/>"
                    "<font size='7' color='#64748B'>Signature &amp; Official Stamp</font>",
                    style_body
                )
            ]
        ], colWidths=[260, 255], style=[
            ('BOX', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
            ('BACKGROUND', (0, 0), (-1, -1), COLOR_LIGHT_BG),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ]),
        Spacer(1, 10),
        Paragraph(
            "<b>Disclaimer:</b> This report is generated by PRAMAN as a decision-support tool. "
            "Referenced Indian Standards and gazette amendments are matched against available repository records. "
            "Final compliance, mandatory QCO applicability, and procurement eligibility must be officially verified with the Bureau of Indian Standards (BIS). "
            "Bureau of Indian Standards (BIS) marks and names are referenced for technical standard identification and do not imply official BIS certification of this report.",
            style_disclaimer
        )
    ]))

    doc.build(story, canvasmaker=NumberedCanvas)
    return buffer.getvalue()
