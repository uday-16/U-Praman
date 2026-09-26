"""Read explicit tender fields and clauses without supplying inferred specifications."""
import re


def labelled_value(text, label):
    # PDF table cells commonly extract as a label and value on separate lines.
    match = re.search(rf'(?im)^\s*{re.escape(label)}\s*(?::|=|\n)\s*([^\n]+)', text)
    return match.group(1).strip() if match else ''


def source_clauses(text):
    """Preserve wrapped obligation paragraphs and bullets, including later pages."""
    blocks, current = [], []
    for raw in text.splitlines():
        line = raw.strip()
        bullet = bool(re.match(r'^[\u2022\x7f\uf0b7*-]\s+', line))
        heading = bool(re.match(r'^\d+[.)]\s+', line))
        # Short standalone table labels delimit the preceding cell.
        if current and len(line.split()) <= 3 and line[:1].isupper() and not re.search(r'[.!?]$', line):
            blocks.append(' '.join(current))
            current = []
        if not line or bullet or heading:
            if current:
                blocks.append(' '.join(current))
                current = []
        if heading:
            continue
        if line and (current or re.search(r'\b(?:shall|must)\b', line, re.I)):
            current.append(re.sub(r'^[\u2022\x7f\uf0b7*-]\s+', '', line))
            if re.search(r'[.!?]$', line):
                blocks.append(' '.join(current))
                current = []
    if current:
        blocks.append(' '.join(current))
    return [block for block in blocks if re.search(r'\b(?:shall|must)\b', block, re.I)]
