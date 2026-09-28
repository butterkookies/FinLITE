import os
import sys
import json
import shutil
import docx
from docx.shared import Pt
from docx.oxml import parse_xml

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OFFICIAL_SOURCE = r"C:\Users\user\Documents\ANDREI_FILES\PDM_FILES\LITE\LITE\AY 2026-2027\Forms\LITE-Financial-Report-2nd-SEM-2025-2026.docx"
DEFAULT_TEMPLATE = os.path.join(BASE_DIR, 'templates', 'LITE-Financial-Report-Universal-Template.docx')
DEFAULT_OUTPUT = os.path.join(BASE_DIR, 'exports', 'FinLITE-Exported-Report.docx')

def ensure_invisible_table_borders(tbl):
    """Ensure all borders on the table are nil (invisible) so no box gridlines appear."""
    tblPr = tbl._element.tblPr
    tblBorders = tblPr.find('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}tblBorders')
    if tblBorders is None:
        tblBorders = parse_xml(r'<w:tblBorders xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
                               r'<w:top w:val="nil"/>'
                               r'<w:left w:val="nil"/>'
                               r'<w:bottom w:val="nil"/>'
                               r'<w:right w:val="nil"/>'
                               r'<w:insideH w:val="nil"/>'
                               r'<w:insideV w:val="nil"/>'
                               r'</w:tblBorders>')
        tblPr.append(tblBorders)
    else:
        for side in ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']:
            b = tblBorders.find(f'{{http://schemas.openxmlformats.org/wordprocessingml/2006/main}}{side}')
            if b is not None:
                b.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val', 'nil')
                if '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}sz' in b.attrib:
                    del b.attrib['{http://schemas.openxmlformats.org/wordprocessingml/2006/main}sz']

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
        for p in s.footer.paragraphs:
            for r in p.runs:
                r.font.name = 'Calibri'

def replace_text_in_paragraph(p, tag, replacement):
    if tag in p.text:
        full_text = p.text.replace(tag, str(replacement))
        p.text = full_text
        for r in p.runs:
            r.font.name = 'Calibri'
            r.font.size = Pt(11)

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

def populate_report(data, template_path=DEFAULT_TEMPLATE, output_path=DEFAULT_OUTPUT):
    # If template doesn't exist or we want fresh baseline from official source, copy it
    if not os.path.exists(template_path) and os.path.exists(OFFICIAL_SOURCE):
        shutil.copyfile(OFFICIAL_SOURCE, template_path)

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    doc = docx.Document(template_path)
    
    sig = data.get('signatories', {}) or {}
    summary = data.get('summary', {}) or {}

    def get_val(*keys, default=''):
        for k in keys:
            if k in data and data[k] is not None and str(data[k]).strip() != '':
                return data[k]
        return default

    # Transmittal & Meta
    transmittal_date = get_val('transmittal_date', 'transmittalDate', default='April 29, 2026')
    coordinator_name = get_val('coordinator_name', 'coordinatorName', default='Ms. Ligaya H. Estrella')
    coordinator_role = get_val('coordinator_role', 'coordinatorRole', default='Co-curricular Affairs Coordinator')
    coordinator_salutation = get_val('coordinator_salutation', 'coordinatorSalutation', default='Mrs. Estrella')
    semester = get_val('semester', default='2nd SEMESTER')
    academic_year = get_val('academic_year', 'academicYear', default='2025–2026')
    period_desc = get_val('period_desc', 'periodDesc', 'eventName', 'activityTitle', default='As of Club Week 2026')
    final_as_of = get_val('final_as_of', 'finalAsOf', default='As of April 2026')

    # Signatories
    pres_name = get_val('president_name', default=sig.get('presidentName', sig.get('notedBy', 'EULYSIES DOMANTAY')))
    pres_role = get_val('president_role', default=sig.get('presidentRole', sig.get('notedRole', 'LITE PRESIDENT')))
    tres_name = get_val('treasurer_name', default=sig.get('treasurerName', sig.get('preparedBy', 'ANDREI GERONIMO')))
    tres_role = get_val('treasurer_role', default=sig.get('treasurerRole', sig.get('preparedRole', 'LITE TREASURER')))
    aud_name = get_val('auditor_name', default=sig.get('auditorName', sig.get('reviewedBy', 'MARIELLE CABANAG')))
    aud_role = get_val('auditor_role', default=sig.get('auditorRole', sig.get('reviewedRole', 'LITE AUDITOR')))
    adv_name = get_val('adviser_name', default=sig.get('adviserName', sig.get('adviser1', 'KIMBERLY DAWN JATULAN')))
    adv_role = get_val('adviser_role', default=sig.get('adviserRole', 'LITE ADVISER'))
    dir_name = get_val('director_name', default=sig.get('directorName', 'JOVYLYN ORTIZ-CESAR, MBA, MSIT'))
    dir_role = get_val('director_role', default=sig.get('directorRole', 'PROGRAM DIRECTOR'))
    dean_name = get_val('dean_name', default=sig.get('deanName', 'DR. EMRAIDA MARIE M. MANUCOM'))
    dean_role = get_val('dean_role', default=sig.get('deanRole', 'DEAN, COLLEGE OF COMPUTER STUDIES'))

    # Totals
    initial_budget = float(get_val('initial_budget', default=summary.get('initial_budget', 5308.00)))
    total_income = float(get_val('total_income', default=summary.get('total_inflows', 31438.00)))
    total_funds = float(get_val('total_funds', default=summary.get('total_funds', 31438.00)))
    total_expenses = float(get_val('total_expenses', default=summary.get('total_outflows', 22988.00)))
    cash_on_hand = float(get_val('cash_on_hand', default=summary.get('cash_on_hand', 8450.00)))

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

    replace_placeholders(doc, config)

    # Dynamic Table Updates if user has customized income or expense items
    income_items = data.get('income_items', [])
    if income_items:
        # Table 1: Inflow items
        # If user passed custom income items, update amounts
        for idx, inc in enumerate(income_items):
            amt = float(inc.get('amount', 0)) if inc.get('amount') is not None else 0.0
            amt_str = f"P{amt:,.2f}"
            desc_str = inc.get('particulars') or inc.get('desc') or ''
            if idx == 0 and len(doc.tables[1].rows) > 3:
                doc.tables[1].rows[3].cells[2].text = amt_str
            elif idx == 1 and len(doc.tables[1].rows) > 8:
                doc.tables[1].rows[8].cells[2].text = amt_str
            elif idx == 2 and len(doc.tables[2].rows) > 3:
                doc.tables[2].rows[3].cells[3].text = amt_str

    expense_items = data.get('expense_items', [])
    if expense_items:
        # Table 3: Expense items (rows 2 to 21)
        tbl_exp = doc.tables[3]
        for idx in range(20):
            r_idx = idx + 2
            if r_idx < len(tbl_exp.rows) - 1:
                if idx < len(expense_items):
                    exp = expense_items[idx]
                    amt = float(exp.get('amount', 0)) if exp.get('amount') is not None else 0.0
                    desc = exp.get('particulars') or exp.get('desc') or ''
                    tbl_exp.rows[r_idx].cells[0].text = desc
                    tbl_exp.rows[r_idx].cells[2].text = f"P{amt:,.2f}" if desc else ""
                else:
                    tbl_exp.rows[r_idx].cells[0].text = ""
                    tbl_exp.rows[r_idx].cells[2].text = ""

    # STRICT FINAL PASS: ENFORCE CALIBRI SIZE 11 ON ALL RUNS AND INVISIBLE BORDERS
    enforce_calibri_11(doc)

    doc.save(output_path)
    print(f"Successfully generated report with consistent Calibri 11pt and invisible borders: {output_path}")
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
            'transmittal_date': 'October 14, 2026',
            'coordinator_name': 'Ms. Ligaya H. Estrella',
            'coordinator_role': 'Co-curricular Affairs Coordinator',
            'coordinator_salutation': 'Mrs. Estrella',
            'semester': '2nd SEMESTER',
            'academic_year': '2025–2026',
            'period_desc': 'As of Club Week 2026 & E-Sports Cup',
            'final_as_of': 'As of April 2026',
            'president_name': 'EULYSIES DOMANTAY',
            'treasurer_name': 'ANDREI GERONIMO',
            'auditor_name': 'MARIELLE CABANAG',
            'adviser_name': 'KIMBERLY DAWN JATULAN',
            'director_name': 'JOVYLYN ORTIZ-CESAR, MBA, MSIT',
            'dean_name': 'DR. EMRAIDA MARIE M. MANUCOM',
            'initial_budget': 5308.00,
            'total_income': 21778.00,
            'total_expenses': 7961.00,
            'total_funds': 21778.00,
            'cash_on_hand': 13817.00
        }
        populate_report(sample)
