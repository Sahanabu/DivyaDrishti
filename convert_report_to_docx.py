"""
DivyaDrishti Markdown to DOCX Converter
Converts DivyaDrishti_Final_Year_Project_Report.md into a beautifully styled,
professional University Final Year Project Report in DOCX format.
"""

import os
import re
import shutil
from docx import Document
from docx.shared import Inches, Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import qn, nsdecls

MD_PATH = r"C:\Users\ratan\Desktop\DivyaDrishti\DivyaDrishti_Final_Year_Project_Report.md"
OUT_WORKSPACE = r"C:\Users\ratan\Desktop\DivyaDrishti\DivyaDrishti_Final_Year_Project_Report.docx"
OUT_ARTIFACTS = r"C:\Users\ratan\.gemini\antigravity-ide\brain\fc09eda7-c764-4100-8ce5-c2335bc74229\DivyaDrishti_Project_Report.docx"

# Palette
NAVY = RGBColor(0x0A, 0x25, 0x40)      # Primary Dark Blue (#0A2540)
BLUE = RGBColor(0x1D, 0x4E, 0xD8)      # Accent Blue (#1D4ED8)
SLATE = RGBColor(0x33, 0x41, 0x55)     # Subtitle Slate (#334155)
DARK = RGBColor(0x1F, 0x29, 0x37)      # Body Text (#1F2937)
MUTED = RGBColor(0x6B, 0x72, 0x80)     # Captions / Secondary (#6B7280)
CODE_COLOR = RGBColor(0x0F, 0x17, 0x2A)

def set_cell_background(cell, hex_color):
    tcPr = cell._element.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._element.get_or_add_tcPr()
    tcMar = parse_xml(f'''
        <w:tcMar {nsdecls("w")}>
            <w:top w:w="{top}" w:type="dxa"/>
            <w:bottom w:w="{bottom}" w:type="dxa"/>
            <w:left w:w="{left}" w:type="dxa"/>
            <w:right w:w="{right}" w:type="dxa"/>
        </w:tcMar>
    ''')
    tcPr.append(tcMar)

def set_table_borders(table, color="D1D5DB", sz="4", val="single"):
    tblPr = table._element.xpath('w:tblPr')
    if tblPr:
        borders = parse_xml(f'''
            <w:tblBorders {nsdecls("w")}>
                <w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
                <w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
                <w:left w:val="none"/>
                <w:right w:val="none"/>
                <w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
                <w:insideV w:val="none"/>
            </w:tblBorders>
        ''')
        tblPr[0].append(borders)

def make_callout_box(p):
    pPr = p._element.get_or_add_pPr()
    pBdr = parse_xml(f'''
        <w:pBdr {nsdecls("w")}>
            <w:left w:val="single" w:sz="24" w:space="15" w:color="1D4ED8"/>
            <w:top w:val="none"/>
            <w:right w:val="none"/>
            <w:bottom w:val="none"/>
        </w:pBdr>
    ''')
    pPr.append(pBdr)
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="F1F5F9"/>')
    pPr.append(shd)

def add_inline_runs(paragraph, text, base_font="Times New Roman", base_size=12,
                    base_color=DARK, is_italic=False, is_bold=False):
    # Regex pattern to match bold (**...**), inline code (`...`), or italic (*...*)
    tokens = re.split(r'(\*\*[^*]+?\*\*|`[^`]+?`|\*[^*]+?\*)', text)
    for token in tokens:
        if not token:
            continue
        if token.startswith('**') and token.endswith('**'):
            inner = token[2:-2]
            run = paragraph.add_run(inner)
            run.font.name = base_font
            run.font.size = Pt(base_size)
            run.font.color.rgb = base_color
            run.bold = True
            run.italic = is_italic
        elif token.startswith('`') and token.endswith('`'):
            inner = token[1:-1]
            run = paragraph.add_run(inner)
            run.font.name = "Consolas"
            run.font.size = Pt(base_size - 1)
            run.font.color.rgb = RGBColor(0x99, 0x1B, 0x1B) # red/brick tone for code
            run.bold = False
            run.italic = False
        elif token.startswith('*') and token.endswith('*'):
            inner = token[1:-1]
            run = paragraph.add_run(inner)
            run.font.name = base_font
            run.font.size = Pt(base_size)
            run.font.color.rgb = base_color
            run.bold = is_bold
            run.italic = True
        else:
            run = paragraph.add_run(token)
            run.font.name = base_font
            run.font.size = Pt(base_size)
            run.font.color.rgb = base_color
            run.bold = is_bold
            run.italic = is_italic

def build_docx():
    print(f"Reading {MD_PATH}...")
    with open(MD_PATH, 'r', encoding='utf-8') as f:
        md_text = f.read()

    doc = Document()

    # Set page layout to A4 with 1 inch (2.54 cm) margins
    for sec in doc.sections:
        sec.page_width = Cm(21.0)
        sec.page_height = Cm(29.7)
        sec.left_margin = Cm(2.54)
        sec.right_margin = Cm(2.54)
        sec.top_margin = Cm(2.54)
        sec.bottom_margin = Cm(2.54)
        sec.different_first_page_header_footer = True
        
        # Add footer with page number note
        footer = sec.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        frun = fp.add_run("DivyaDrishti: Smart Helmet AI & Telemetry System | Final Year Project Report")
        frun.font.name = "Times New Roman"
        frun.font.size = Pt(9)
        frun.font.color.rgb = MUTED

    lines = md_text.splitlines()
    i = 0
    total_lines = len(lines)

    in_code_block = False
    code_lines = []
    first_heading = True

    while i < total_lines:
        line = lines[i]

        # 1. Code blocks
        if line.startswith("```"):
            if in_code_block:
                # End code block - render it
                code_text = "\n".join(code_lines)
                table = doc.add_table(rows=1, cols=1)
                table.alignment = WD_TABLE_ALIGNMENT.CENTER
                cell = table.cell(0, 0)
                set_cell_background(cell, "F8FAFC")
                set_cell_margins(cell, top=120, bottom=120, left=180, right=180)
                
                # Border for code block
                tblPr = table._element.xpath('w:tblPr')
                if tblPr:
                    borders = parse_xml(f'''
                        <w:tblBorders {nsdecls("w")}>
                            <w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
                            <w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
                            <w:left w:val="single" w:sz="18" w:space="0" w:color="1D4ED8"/>
                            <w:right w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
                        </w:tblBorders>
                    ''')
                    tblPr[0].append(borders)

                cp = cell.paragraphs[0]
                cp.paragraph_format.line_spacing = 1.05
                cp.paragraph_format.space_before = Pt(2)
                cp.paragraph_format.space_after = Pt(2)
                crun = cp.add_run(code_text)
                crun.font.name = "Consolas"
                crun.font.size = Pt(9)
                crun.font.color.rgb = CODE_COLOR

                # Spacer after code table
                sp = doc.add_paragraph()
                sp.paragraph_format.space_before = Pt(0)
                sp.paragraph_format.space_after = Pt(6)

                in_code_block = False
                code_lines = []
            else:
                in_code_block = True
                code_lines = []
            i += 1
            continue

        if in_code_block:
            code_lines.append(line)
            i += 1
            continue

        # 2. Skip empty lines
        if not line.strip():
            i += 1
            continue

        # 3. Horizontal Rule
        if line.strip() in ["---", "***", "___"]:
            # Check if this separates major preliminary sections or cover page
            i += 1
            continue

        # 4. Markdown Table
        if line.strip().startswith("|") and line.strip().endswith("|"):
            table_lines = []
            while i < total_lines and lines[i].strip().startswith("|") and lines[i].strip().endswith("|"):
                table_lines.append(lines[i].strip())
                i += 1
            
            # Parse table
            parsed_rows = []
            for t_line in table_lines:
                # check if delimiter row
                cells = [c.strip() for c in t_line.split("|")[1:-1]]
                if all(re.match(r'^:?-+:?$', c) for c in cells if c):
                    continue # skip separator row
                parsed_rows.append(cells)

            if parsed_rows:
                num_cols = max(len(r) for r in parsed_rows)
                # Normalize column count
                for r in parsed_rows:
                    while len(r) < num_cols:
                        r.append("")

                table = doc.add_table(rows=len(parsed_rows), cols=num_cols)
                table.alignment = WD_TABLE_ALIGNMENT.CENTER
                set_table_borders(table, color="D1D5DB", sz="4")

                for row_idx, row_data in enumerate(parsed_rows):
                    is_header = (row_idx == 0)
                    row_el = table.rows[row_idx]._element
                    trPr = row_el.get_or_add_trPr()
                    trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))
                    if is_header:
                        trPr.append(parse_xml(f'<w:tblHeader {nsdecls("w")}/>'))

                    for col_idx, cell_value in enumerate(row_data):
                        cell = table.cell(row_idx, col_idx)
                        set_cell_margins(cell, top=100, bottom=100, left=140, right=140)
                        
                        if is_header:
                            set_cell_background(cell, "0A2540") # Navy header
                            cp = cell.paragraphs[0]
                            cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
                            cp.paragraph_format.space_before = Pt(4)
                            cp.paragraph_format.space_after = Pt(4)
                            add_inline_runs(cp, cell_value, base_font="Times New Roman",
                                            base_size=10.5, base_color=RGBColor(0xFF, 0xFF, 0xFF),
                                            is_bold=True)
                        else:
                            bg_color = "F8FAFC" if (row_idx % 2 == 1) else "FFFFFF"
                            set_cell_background(cell, bg_color)
                            cp = cell.paragraphs[0]
                            cp.alignment = WD_ALIGN_PARAGRAPH.LEFT
                            cp.paragraph_format.space_before = Pt(3)
                            cp.paragraph_format.space_after = Pt(3)
                            add_inline_runs(cp, cell_value, base_font="Times New Roman",
                                            base_size=10, base_color=DARK)
                
                sp = doc.add_paragraph()
                sp.paragraph_format.space_before = Pt(0)
                sp.paragraph_format.space_after = Pt(6)
            continue

        # 5. Image: ![caption](path)
        img_match = re.match(r'^!\[(.*?)\]\((.*?)\)$', line.strip())
        if img_match:
            alt_text = img_match.group(1)
            img_path = img_match.group(2).strip()
            
            # Verify file exists
            if os.path.exists(img_path):
                # Add spacing before image
                ip = doc.add_paragraph()
                ip.alignment = WD_ALIGN_PARAGRAPH.CENTER
                ip.paragraph_format.space_before = Pt(12)
                ip.paragraph_format.space_after = Pt(4)
                ip.paragraph_format.keep_with_next = True
                
                run = ip.add_run()
                # Insert picture with width 6 inches
                run.add_picture(img_path, width=Inches(5.8))
            else:
                print(f"Warning: Image not found at {img_path}")
            i += 1
            continue

        # 6. Headings
        if line.startswith("# "):
            title_text = line[2:].strip()
            
            # Check if this is the very first document title (Cover Page)
            if first_heading and "DivyaDrishti" in title_text:
                first_heading = False
                p = doc.add_paragraph()
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p.paragraph_format.space_before = Pt(40)
                p.paragraph_format.space_after = Pt(8)
                run = p.add_run("DIVYADRISHTI (दिव्यदृष्टि)")
                run.font.name = "Times New Roman"
                run.font.size = Pt(28)
                run.font.color.rgb = NAVY
                run.bold = True
                i += 1
                continue

            # Page break before major chapters
            if not first_heading:
                doc.add_page_break()
            first_heading = False

            p = doc.add_heading(level=1)
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p.paragraph_format.space_before = Pt(16)
            p.paragraph_format.space_after = Pt(8)
            p.paragraph_format.keep_with_next = True
            
            add_inline_runs(p, title_text, base_font="Times New Roman", base_size=18,
                            base_color=NAVY, is_bold=True)
            i += 1
            continue

        if line.startswith("## "):
            title_text = line[3:].strip()
            
            # Subtitle on cover page
            if "Smart Helmet AI & Telemetry System" in title_text and first_heading:
                p = doc.add_paragraph()
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p.paragraph_format.space_before = Pt(6)
                p.paragraph_format.space_after = Pt(12)
                run = p.add_run("AI-Powered Smart Helmet Safety and Telemetry System")
                run.font.name = "Times New Roman"
                run.font.size = Pt(16)
                run.font.color.rgb = BLUE
                run.bold = True
                i += 1
                continue

            # Major front matter sections (CERTIFICATE, DECLARATION, etc.) get page breaks
            front_matter_sections = [
                "CERTIFICATE", "DECLARATION", "ACKNOWLEDGEMENTS", "ABSTRACT",
                "TABLE OF CONTENTS", "LIST OF ABBREVIATIONS", "TABLE OF FIGURES", "TABLE OF TABLES"
            ]
            if any(title_text.upper().startswith(sec) for sec in front_matter_sections):
                doc.add_page_break()

            p = doc.add_heading(level=2)
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p.paragraph_format.space_before = Pt(14)
            p.paragraph_format.space_after = Pt(6)
            p.paragraph_format.keep_with_next = True
            add_inline_runs(p, title_text, base_font="Times New Roman", base_size=14,
                            base_color=BLUE, is_bold=True)
            i += 1
            continue

        if line.startswith("### "):
            title_text = line[4:].strip()
            if "Final Year Project Report" in title_text and first_heading:
                p = doc.add_paragraph()
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p.paragraph_format.space_before = Pt(4)
                p.paragraph_format.space_after = Pt(30)
                run = p.add_run("FINAL YEAR PROJECT REPORT")
                run.font.name = "Times New Roman"
                run.font.size = Pt(14)
                run.font.color.rgb = SLATE
                run.bold = True
                i += 1
                continue

            p = doc.add_heading(level=3)
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p.paragraph_format.space_before = Pt(10)
            p.paragraph_format.space_after = Pt(4)
            p.paragraph_format.keep_with_next = True
            add_inline_runs(p, title_text, base_font="Times New Roman", base_size=12,
                            base_color=SLATE, is_bold=True)
            i += 1
            continue

        # 7. Blockquote: > ...
        if line.startswith("> "):
            quote_text = line[2:].strip()
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p.paragraph_format.space_before = Pt(6)
            p.paragraph_format.space_after = Pt(8)
            p.paragraph_format.left_indent = Inches(0.4)
            p.paragraph_format.right_indent = Inches(0.4)
            make_callout_box(p)
            add_inline_runs(p, quote_text, base_font="Times New Roman", base_size=11,
                            base_color=SLATE, is_italic=True)
            i += 1
            continue

        # 8. Unordered List (- or *)
        list_match = re.match(r'^[-*]\s+(.*)$', line.strip())
        if list_match:
            item_text = list_match.group(1)
            p = doc.add_paragraph(style='List Bullet')
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(3)
            p.paragraph_format.line_spacing = 1.15
            add_inline_runs(p, item_text, base_font="Times New Roman", base_size=11.5, base_color=DARK)
            i += 1
            continue

        # 9. Numbered List (1. 2. etc.)
        num_match = re.match(r'^\d+\.\s+(.*)$', line.strip())
        if num_match:
            item_text = num_match.group(1)
            p = doc.add_paragraph(style='List Number')
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(3)
            p.paragraph_format.line_spacing = 1.15
            add_inline_runs(p, item_text, base_font="Times New Roman", base_size=11.5, base_color=DARK)
            i += 1
            continue

        # 10. Figure Caption: *Figure X.X: ...*
        fig_match = re.match(r'^\*Figure\s+([0-9\.]+):\s*(.*?)\*$', line.strip())
        if fig_match:
            fig_no = fig_match.group(1)
            fig_caption = fig_match.group(2)
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(14)
            
            run_lbl = p.add_run(f"Figure {fig_no}: ")
            run_lbl.font.name = "Times New Roman"
            run_lbl.font.size = Pt(10)
            run_lbl.font.color.rgb = BLUE
            run_lbl.bold = True
            
            run_cap = p.add_run(fig_caption)
            run_cap.font.name = "Times New Roman"
            run_cap.font.size = Pt(10)
            run_cap.font.color.rgb = MUTED
            run_cap.italic = True
            i += 1
            continue

        # 11. Normal paragraph
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.line_spacing = 1.15
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(6)
        
        # Check if line is centered quote or motto
        if line.strip().startswith('*"') and line.strip().endswith('"*'):
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            add_inline_runs(p, line.strip()[1:-1], base_font="Times New Roman", base_size=11.5,
                            base_color=SLATE, is_italic=True)
        else:
            add_inline_runs(p, line.strip(), base_font="Times New Roman", base_size=11.5, base_color=DARK)
        
        i += 1

    saved_workspace_path = None
    target_candidates = [
        OUT_WORKSPACE,
        r"C:\Users\ratan\Desktop\DivyaDrishti\DivyaDrishti_Final_Year_Project_Report_Latest.docx",
        r"C:\Users\ratan\Desktop\DivyaDrishti\DivyaDrishti_Final_Year_Project_Report_v3.docx",
        r"C:\Users\ratan\Desktop\DivyaDrishti\DivyaDrishti_Final_Year_Project_Report_v2.docx"
    ]
    for candidate in target_candidates:
        try:
            print(f"Attempting save to {candidate}...")
            doc.save(candidate)
            saved_workspace_path = candidate
            print(f"Saved successfully to: {candidate}")
            break
        except PermissionError:
            print(f"File locked: {candidate}")
            continue

    print(f"Saving copy to {OUT_ARTIFACTS}...")
    try:
        doc.save(OUT_ARTIFACTS)
        print(f"Saved copy to artifacts folder successfully: {OUT_ARTIFACTS}")
    except Exception as e:
        print(f"Artifact save note: {e}")
    print(f"Report conversion completed! Active file: {saved_workspace_path}")

if __name__ == "__main__":
    build_docx()
