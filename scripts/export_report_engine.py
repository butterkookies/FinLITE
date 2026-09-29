import os
import sys
import json
import copy
import docx
from docx.shared import Pt, Inches
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_TEMPLATE = os.path.join(BASE_DIR, 'templates', 'LITE-Financial-Report-Universal-Template.docx')
DEFAULT_OUTPUT = os.path.join(BASE_DIR, 'exports', 'FinLITE-Exported-Report.docx')

def ensure_invisible_table_borders(tbl):
    """Ensure all borders on the table are nil (invisible) so no box gridlines appear."""
    tblPr = tbl._element.tblPr
    tblBorders = tblPr.find(qn('w:tblBorders'))
    if tblBorders is None:
        tblBorders = parse_xml(r'<w:tblBorders %s>'
                               r'<w:top w:val="nil"/>'
                               r'<w:left w:val="nil"/>'
                               r'<w:bottom w:val="nil"/>'
                               r'<w:right w:val="nil"/>'
                               r'<w:insideH w:val="nil"/>'
                               r'<w:insideV w:val="nil"/>'
                               r'</w:tblBorders>' % nsdecls('w'))
        tblPr.append(tblBorders)
    else:
        for side in ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']:
            b = tblBorders.find(qn(f'w:{side}'))
            if b is not None:
                b.set(qn('w:val'), 'nil')
                if qn('w:sz') in b.attrib:
                    del b.attrib[qn('w:sz')]

def set_cell_border(cell, **kwargs):
    """
    Set individual cell borders: top, bottom, left, right.
    Example: set_cell_border(cell, bottom={"val": "single", "sz": "4", "color": "000000"})
    """
    tcPr = cell._element.get_or_add_tcPr()
    tcBorders = tcPr.find(qn('w:tcBorders'))
    if tcBorders is None:
        tcBorders = OxmlElement('w:tcBorders')
        tcPr.append(tcBorders)
    for edge in ('top', 'left', 'bottom', 'right'):
        edge_data = kwargs.get(edge)
        if edge_data:
            b = OxmlElement(f'w:{edge}')
            for key, val in edge_data.items():
                b.set(qn(f'w:{key}'), str(val))
            tcBorders.append(b)

def replace_text_in_paragraph(p, search, replace):
    if search not in p.text:
        return
    full_text = p.text
    new_text = full_text.replace(search, replace)
    if p.runs:
        font_name = p.runs[0].font.name or 'Calibri'
        font_size = p.runs[0].font.size or Pt(11)
        bold = p.runs[0].bold
        italic = p.runs[0].italic
        p.text = new_text
        for r in p.runs:
            r.font.name = font_name
            r.font.size = font_size
            r.bold = bold
            r.italic = italic
    else:
        p.text = new_text

def replace_placeholders(doc, config):
    for p in doc.paragraphs:
        for tag, val in config.items():
            if tag in p.text:
                replace_text_in_paragraph(p, tag, val)
                
    for tbl in doc.tables:
        for row in tbl.rows:
            for cell in row.cells:
                for p in cell.paragraphs:
                    for tag, val in config.items():
                        if tag in p.text:
                            replace_text_in_paragraph(p, tag, val)

def enforce_calibri_11(doc):
    """Strictly enforce Calibri size 11 across all runs in all paragraphs and table cells."""
    for style in doc.styles:
        if hasattr(style, 'font') and style.font is not None:
            style.font.name = 'Calibri'
            style.font.size = Pt(11)

    for p in doc.paragraphs:
        for r in p.runs:
            r.font.name = 'Calibri'
            r.font.size = Pt(11)

    for tbl in doc.tables:
        ensure_invisible_table_borders(tbl)
        for row in tbl.rows:
            for cell in row.cells:
                for p in cell.paragraphs:
                    for r in p.runs:
                        r.font.name = 'Calibri'
                        r.font.size = Pt(11)

    for s in doc.sections:
        for p in s.header.paragraphs:
            for r in p.runs:
                r.font.name = 'Calibri'

def populate_report(data, template_path=DEFAULT_TEMPLATE, output_path=DEFAULT_OUTPUT):
    if not os.path.exists(template_path):
        raise FileNotFoundError(f"Universal template not found at {template_path}")

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    doc = docx.Document(template_path)
    
    # 1. STRICT METADATA CONFORMANCE
    core = doc.core_properties
    core.last_modified_by = 'Andrei John Geronimo'
    core.revision = 3

    # Section Margins & Page Size (Letter: 8.5 x 11 in; Margins: Top 1.0", Bottom 0.75", Left 1.0", Right 1.0")
    for s in doc.sections:
        s.page_width = Inches(8.5)
        s.page_height = Inches(11.0)
        s.top_margin = Inches(1.0)
        s.bottom_margin = Inches(0.75)
        s.left_margin = Inches(1.0)
        s.right_margin = Inches(1.0)

    sig = data.get('signatories', {}) or {}
    summary = data.get('summary', {}) or {}

    def get_val(*keys, default=''):
        for k in keys:
            if k in data and data[k] is not None and str(data[k]).strip() != '':
                return str(data[k]).strip()
        return default

    # Transmittal & Meta
    transmittal_date = get_val('transmittal_date', 'transmittalDate', default='April 29, 2026')
    coordinator_name = get_val('coordinator_name', 'coordinatorName', default='Ms. Ligaya H. Estrella')
    coordinator_role = get_val('coordinator_role', 'coordinatorRole', default='Co-curricular Affairs Coordinator')
    coordinator_salutation = get_val('coordinator_salutation', 'coordinatorSalutation', default='Mrs. Estrella')
    semester = get_val('semester', default='2nd SEMESTER')
    academic_year = get_val('academic_year', 'academicYear', default='2025–2026')
    period_desc = get_val('period_desc', 'periodDesc', 'eventName', 'activityTitle', default='Financial Operations')
    final_as_of = get_val('final_as_of', 'finalAsOf', default=f"As of {transmittal_date}")

    # Signatories
    pres_name = get_val('president_name', default=sig.get('presidentName', sig.get('notedBy', 'EMANUEL MALBAROSA'))).upper()
    pres_role = get_val('president_role', default=sig.get('presidentRole', sig.get('notedRole', 'LITE PRESIDENT'))).upper()
    tres_name = get_val('treasurer_name', default=sig.get('treasurerName', sig.get('preparedBy', 'ANDREI JOHN P. GERONIMO'))).upper()
    tres_role = get_val('treasurer_role', default=sig.get('treasurerRole', sig.get('preparedRole', 'LITE TREASURER'))).upper()
    aud_name = get_val('auditor_name', default=sig.get('auditorName', sig.get('reviewedBy', 'CHRISTIAN REY C. KASILAG'))).upper()
    aud_role = get_val('auditor_role', default=sig.get('auditorRole', sig.get('reviewedRole', 'LITE AUDITOR'))).upper()
    adv_name = get_val('adviser_name', default=sig.get('adviserName', sig.get('adviser1', 'MS. KIMBERLY DAWN JATULAN'))).upper()
    adv_role = get_val('adviser_role', default=sig.get('adviserRole', 'LITE CLUB ADVISER')).upper()
    dir_name = get_val('director_name', default=sig.get('directorName', 'JOVYLYN ORTIZ-CESAR, MBA, MSIT')).upper()
    dir_role = get_val('director_role', default=sig.get('directorRole', 'PROGRAM DIRECTOR, BSIT')).upper()
    dean_name = get_val('dean_name', default=sig.get('deanName', 'DR. EMRAIDA MARIE M. MANUCOM')).upper()
    dean_role = get_val('dean_role', default=sig.get('deanRole', 'DEAN, COLLEGE OF COMPUTER STUDIES')).upper()

    # If adviser2 is present, combine or format appropriately
    adv2 = sig.get('adviser2')
    if adv2 and adv2.strip() and adv2.upper() not in adv_name:
        adv_name = f"{adv_name} & {adv2.upper()}"
        adv_role = "LITE CLUB ADVISERS"

    # Transactions & Totals from real database data
    txs = data.get('transactions', []) or []
    
    # Inflow and Outflow items from DB
    income_items = data.get('income_items')
    if income_items is None:
        income_items = [
            {'title': t.get('title') or 'Income', 'amount': float(t.get('amount') or 0)}
            for t in txs if t.get('type') == 'INFLOW' and 'rollover' not in (t.get('category_name') or '').lower() and 'beginning' not in (t.get('title') or '').lower()
        ]

    expense_items = data.get('expense_items')
    if expense_items is None:
        expense_items = [
            {'title': t.get('title') or 'Expense', 'amount': float(t.get('amount') or 0)}
            for t in txs if t.get('type') == 'OUTFLOW'
        ]

    # Calculate or retrieve totals
    initial_budget = float(data.get('initial_budget', summary.get('initial_budget', 0.0)) or 0.0)
    total_income = sum(float(i.get('amount', 0)) for i in income_items)
    total_funds = initial_budget + total_income
    total_expenses = sum(float(i.get('amount', 0)) for i in expense_items)
    cash_on_hand = total_funds - total_expenses

    config = {
        '{{TRANSMITTAL_DATE}}': transmittal_date,
        '{{COORDINATOR_NAME}}': coordinator_name,
        '{{COORDINATOR_ROLE}}': coordinator_role,
        '{{COORDINATOR_SALUTATION}}': coordinator_salutation,
        '{{SEMESTER}}': semester,
        '{{ACADEMIC_YEAR}}': academic_year,
        '{{PERIOD_DESCRIPTION}}': period_desc,
        '{{FINAL_AS_OF_DATE}}': final_as_of,
        
        # Signatories
        '{{PRESIDENT_NAME}}': pres_name,
        '{{PRESIDENT_ROLE}}': pres_role,
        '{{TREASURER_NAME}}': tres_name,
        '{{TREASURER_ROLE}}': tres_role,
        '{{AUDITOR_NAME}}': aud_name,
        '{{AUDITOR_ROLE}}': aud_role,
        '{{ADVISER_NAME}}': adv_name,
        '{{ADVISER_ROLE}}': adv_role,
        '{{DIRECTOR_NAME}}': dir_name,
        '{{DIRECTOR_ROLE}}': dir_role,
        '{{DEAN_NAME}}': dean_name,
        '{{DEAN_ROLE}}': dean_role,

        # Totals
        '{{INITIAL_BUDGET_AMOUNT}}': f"P{initial_budget:,.2f}",
        '{{TOTAL_INCOME_AMOUNT}}': f"P{total_income:,.2f}",
        '{{TOTAL_EXPENSES_AMOUNT}}': f"P{total_expenses:,.2f}",
        '{{TOTAL_FUNDS_AMOUNT}}': f"P{total_funds:,.2f}",
        '{{CASH_ON_HAND_AMOUNT}}': f"P{cash_on_hand:,.2f}"
    }

    # Replace placeholders in paragraphs and tables
    replace_placeholders(doc, config)

    # -------------------------------------------------------------
    # 2. TABLE 0: INITIAL BUDGET (Carried over from prior semester)
    # -------------------------------------------------------------
    tbl0 = doc.tables[0]
    ensure_invisible_table_borders(tbl0)
    tbl0.rows[1].cells[4].text = f"P{initial_budget:,.2f}"

    # -------------------------------------------------------------
    # 3. TABLE 1: INCOME SCHEDULE (STRICTLY FROM DATABASE, NO DUMMY DATA)
    # -------------------------------------------------------------
    tbl1 = doc.tables[1]
    ensure_invisible_table_borders(tbl1)
    row_template = copy.deepcopy(tbl1.rows[1]._element)
    
    # Remove all template dummy rows (Cosplay, Org-shirt, E-sports, etc.)
    while len(tbl1.rows) > 1:
        tr = tbl1.rows[-1]._element
        tr.getparent().remove(tr)

    # Populate real database income items
    if not income_items:
        new_tr = copy.deepcopy(row_template)
        tbl1._element.append(new_tr)
        row = tbl1.rows[-1]
        row.cells[0].text = "No income transactions recorded."
        row.cells[1].text = ""
        row.cells[2].text = "P0.00"
    else:
        for item in income_items:
            new_tr = copy.deepcopy(row_template)
            tbl1._element.append(new_tr)
            row = tbl1.rows[-1]
            title = str(item.get('title') or item.get('particulars') or item.get('desc') or 'Income')
            amt = float(item.get('amount', 0) or 0)
            row.cells[0].text = title
            row.cells[1].text = ""
            row.cells[2].text = f"P{amt:,.2f}"

    # Append Total Income summary row
    new_tr = copy.deepcopy(row_template)
    tbl1._element.append(new_tr)
    total_row = tbl1.rows[-1]
    total_row.cells[0].text = "Total Income:"
    total_row.cells[1].text = ""
    total_row.cells[2].text = f"P{total_income:,.2f}"
    set_cell_border(total_row.cells[2], bottom={"val": "single", "sz": "4", "color": "000000"})
    for p in total_row.cells[0].paragraphs:
        for r in p.runs:
            r.bold = True
    for p in total_row.cells[2].paragraphs:
        for r in p.runs:
            r.bold = True

    # -------------------------------------------------------------
    # 4. REMOVE TABLE 2 (DUMMY GAME EXHIBIT SUB-TABLE FROM OLD TEMPLATE)
    # -------------------------------------------------------------
    if len(doc.tables) > 4:
        tbl2 = doc.tables[2]
        tbl2._element.getparent().remove(tbl2._element)

    # -------------------------------------------------------------
    # 5. TABLE 3 (NOW TABLE 2): MISCELLANEOUS EXPENSES (STRICTLY REAL DB DATA)
    # -------------------------------------------------------------
    tbl_exp = doc.tables[2]
    ensure_invisible_table_borders(tbl_exp)
    exp_template = copy.deepcopy(tbl_exp.rows[2]._element)

    # Remove all template dummy rows (Candle, Glue Stick, Dinner, etc.)
    while len(tbl_exp.rows) > 2:
        tr = tbl_exp.rows[-1]._element
        tr.getparent().remove(tr)

    # Populate real database expense items
    if not expense_items:
        new_tr = copy.deepcopy(exp_template)
        tbl_exp._element.append(new_tr)
        row = tbl_exp.rows[-1]
        row.cells[0].text = "No expense transactions recorded."
        row.cells[1].text = ""
        row.cells[2].text = "P0.00"
    else:
        for item in expense_items:
            new_tr = copy.deepcopy(exp_template)
            tbl_exp._element.append(new_tr)
            row = tbl_exp.rows[-1]
            title = str(item.get('title') or item.get('particulars') or item.get('desc') or 'Expense')
            amt = float(item.get('amount', 0) or 0)
            row.cells[0].text = title
            row.cells[1].text = ""
            row.cells[2].text = f"P{amt:,.2f}"

    # Append Total Expenses summary row
    new_tr = copy.deepcopy(exp_template)
    tbl_exp._element.append(new_tr)
    total_exp_row = tbl_exp.rows[-1]
    total_exp_row.cells[0].text = "Total Expenses:"
    total_exp_row.cells[1].text = ""
    total_exp_row.cells[2].text = f"P{total_expenses:,.2f}"
    set_cell_border(total_exp_row.cells[2], bottom={"val": "single", "sz": "4", "color": "000000"})
    for p in total_exp_row.cells[0].paragraphs:
        for r in p.runs:
            r.bold = True
    for p in total_exp_row.cells[2].paragraphs:
        for r in p.runs:
            r.bold = True

    # -------------------------------------------------------------
    # 6. TABLE 4 (NOW TABLE 3): RECONCILIATION SUMMARY
    # -------------------------------------------------------------
    tbl_summary = doc.tables[3]
    ensure_invisible_table_borders(tbl_summary)
    tbl_summary.rows[1].cells[2].text = f"P{total_funds:,.2f}"
    tbl_summary.rows[2].cells[2].text = f"P{total_expenses:,.2f}"
    tbl_summary.rows[3].cells[2].text = f"P{cash_on_hand:,.2f}"
    set_cell_border(tbl_summary.rows[2].cells[2], bottom={"val": "single", "sz": "4", "color": "000000"})
    set_cell_border(tbl_summary.rows[3].cells[2], top={"val": "single", "sz": "4", "color": "000000"})

    # -------------------------------------------------------------
    # 7. SECTION FLOW & EXACT PAGE ORDER (4 PAGES TOTAL)
    # -------------------------------------------------------------
    # Purge consecutive empty spacer paragraphs that caused layout drift
    body = doc._element.body
    for child in list(body):
        tag = child.tag.split('}')[-1]
        if tag == 'p':
            p = docx.text.paragraph.Paragraph(child, doc)
            if not p.text.strip():
                try:
                    body.remove(child)
                except Exception:
                    pass

    # Insert explicit page break after Transmittal Letter (after 'cc: Dean’s Office')
    for p in doc.paragraphs:
        if "cc: Dean" in p.text:
            p_next = parse_xml(r'<w:p %s><w:r><w:br w:type="page"/></w:r></w:p>' % nsdecls('w'))
            p._element.addnext(p_next)
            break

    # Insert explicit page break before Expenses table
    tbl_exp_p = parse_xml(r'<w:p %s><w:r><w:br w:type="page"/></w:r></w:p>' % nsdecls('w'))
    tbl_exp._element.addprevious(tbl_exp_p)

    # Insert explicit page break before Final Summary & Signatories
    for p in doc.paragraphs:
        if final_as_of in p.text:
            p_break = parse_xml(r'<w:p %s><w:r><w:br w:type="page"/></w:r></w:p>' % nsdecls('w'))
            p._element.addprevious(p_break)
            break

    # -------------------------------------------------------------
    # 8. STRICT CALIBRI 11PT ENFORCEMENT & BORDERLESS TABLE STYLING
    # -------------------------------------------------------------
    enforce_calibri_11(doc)

    doc.save(output_path)
    print(f"Successfully generated institutional financial report: {output_path}")
    return output_path

if __name__ == '__main__':
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
        output_file = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_OUTPUT
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        populate_report(data, output_path=output_file)
    else:
        sample = {
            'transmittal_date': 'September 29, 2026',
            'semester': '2nd SEMESTER',
            'academic_year': '2025–2026',
            'period_desc': 'Club week',
            'income_items': [
                {'title': 'ID Lace lanyard', 'amount': 8900.0}
            ],
            'expense_items': [
                {'title': 'Candy for Officers', 'amount': 10.0}
            ]
        }
        populate_report(sample)
