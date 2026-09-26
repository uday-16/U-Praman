from pathlib import Path
path = Path('backend/app/services/pdf_service.py')
text = path.read_text(encoding='utf-8')
start = text.index('    a, ext = report.analysis')
text = text[:start] + '''    a, ext = report.analysis, report.analysis.extracted
    brief = a.brief
    created_at = report.created_at or datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')
    add('PRAMAN', ParagraphStyle('Brand',parent=title,fontSize=17,spaceBefore=0,spaceAfter=2))
    add('PROCUREMENT STANDARDS REPORT', ParagraphStyle('ReportTitle',parent=heading,fontSize=14,spaceBefore=0,spaceAfter=6))
    story.append(HRFlowable(width='100%', thickness=1, color=COLOR_NAVY, spaceAfter=8))
    add(ext.product_name, subheading)
    add(f'{report.id} | {created_at} | Prepared for: {report.officer_name}', small)
    add('Source: ' + (a.source_name or ext.source_name), small)
    add('1. Requirement summary', heading)
    if brief['facts']:
        table(['Field', 'Requirement'], list(brief['facts'].items()), [.23, .77])
    else:
        add('Review the product details in the original input.')
    add('2. Recommended standards', heading)
    for rec in a.recommendations:
        add(rec.is_number + ' - ' + rec.title, subheading)
        sources = {}
        for ev in rec.evidence:
            sources.setdefault(ev.source, set()).add(ev.page)
        references = '; '.join(f'{source}, p. {", ".join(str(p) for p in sorted(pages))}'
                               for source, pages in sources.items())
        add('Source: ' + (references or 'Source evidence unavailable'), small)
    if not a.recommendations:
        add('No suitable standard was found in the available documents.')
    add('3. Before approval', heading)
    for action in brief['actions']:
        add('- ' + action)
    if not brief['actions']:
        add('No specific gaps were identified. Confirm applicability before approval.')
    add(brief['notice'], small)
    story.append(Spacer(1, 12))
    story.append(KeepTogether([
        para('Reviewed by: __________________________   Date: ______________', small),
        para('Full requirements and evidence are retained in analysis ' + a.id + '.', small)]))
    doc.build(story, canvasmaker=NumberedCanvas)
    return buffer.getvalue()
'''
path.write_text(text, encoding='utf-8')
