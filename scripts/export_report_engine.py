import os
import sys
import json
import docx

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_TEMPLATE = os.path.join(BASE_DIR, 'templates', 'LITE-Financial-Report-Universal-Template.docx')
DEFAULT_OUTPUT = os.path.join(BASE_DIR, 'exports', 'FinLITE-Exported-Report.docx')

DEFAULT_INCOME_ITEMS = [
    {'particulars': 'Cosplay 5-Peso Vote & Org-Shirt Rebate', 'amount': 18580.00},
    {'particulars': 'E-sports: Honor of Kings & Crossfire', 'amount': 2000.00},
    {'particulars': 'Game Exhibit: Day 1 & Day 2', 'amount': 5550.00},
]

DEFAULT_EXPENSE_ITEMS = [
    {'particulars': 'Candle', 'amount': 7.00},
    {'particulars': 'Glue Stick', 'amount': 10.00},
    {'particulars': 'Envelope', 'amount': 20.00},
    {'particulars': 'Green Folder', 'amount': 48.00},
    {'particulars': 'BestBuy Certificate Holder', 'amount': 135.00},
    {'particulars': 'Ribbon', 'amount': 150.00},
    {'particulars': 'Vellum Board A4', 'amount': 152.00},
    {'particulars': "Students' Travel Fare", 'amount': 200.00},
    {'particulars': 'Sash', 'amount': 380.00},
    {'particulars': 'Cosplay Tarpaulin', 'amount': 670.00},
    {'particulars': 'Career Day', 'amount': 1840.00},
    {'particulars': 'Judge Token', 'amount': 2510.00},
    {'particulars': 'Outreach Donation', 'amount': 1000.00},
    {'particulars': 'Leadership Seminar', 'amount': 500.00},
    {'particulars': 'Day 1 & 2 Lunch', 'amount': 3655.00},
    {'particulars': 'Big Brew Drinks', 'amount': 800.00},
    {'particulars': 'Cash Prize', 'amount': 4000.00},
    {'particulars': 'Dinner', 'amount': 5000.00},
    {'particulars': 'Public Forum (Net)', 'amount': 1750.00},
    {'particulars': 'Cash Shortage', 'amount': 161.00},
]

def replace_text_in_paragraph(p, tag, replacement):
    if tag in p.text:
        full_text = p.text.replace(tag, str(replacement))
        p.text = full_text
        if p.runs:
            p.runs[0].font.name = 'Times New Roman'

def replace_placeholders(doc, config):
    # Paragraphs in main body
    for p in doc.paragraphs:
        for tag, val in config.items():
            if tag in p.text:
                replace_text_in_paragraph(p, tag, val)
                
    # Tables in main body
    for tbl in doc.tables:
        for row in tbl.rows:
            for cell in row.cells:
                for p in cell.paragraphs:
                    for tag, val in config.items():
                        if tag in p.text:
                            replace_text_in_paragraph(p, tag, val)

    # Headers and Footers in all sections
    for section in doc.sections:
        for p in section.header.paragraphs:
            for tag, val in config.items():
                if tag in p.text:
                    replace_text_in_paragraph(p, tag, val)
        for tbl in section.header.tables:
            for row in tbl.rows:
                for cell in row.cells:
                    for p in cell.paragraphs:
                        for tag, val in config.items():
                            if tag in p.text:
                                replace_text_in_paragraph(p, tag, val)

def populate_report(data, template_path=DEFAULT_TEMPLATE, output_path=DEFAULT_OUTPUT):
    if not os.path.exists(template_path):
        raise FileNotFoundError(f"Template not found at: {template_path}")

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    doc = docx.Document(template_path)
    
    sig = data.get('signatories', {}) or {}
    summary = data.get('summary', {}) or {}

    def get_val(*keys, default=''):
        for k in keys:
            if k in data and data[k] is not None and str(data[k]).strip() != '':
                return data[k]
        return default

    # 1. Base dynamic configuration
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

        # Financial Totals & Labels
        '{{INITIAL_BUDGET_LABEL}}': get_val('budget_label', default='INITIAL BUDGET AS OF FEBRUARY (Carried over from 1st Sem)'),
        '{{INITIAL_BUDGET_AMOUNT}}': f"P{initial_budget:,.2f}",
        '{{TOTAL_INCOME_AMOUNT}}': f"P{total_income:,.2f}",
        '{{TOTAL_EXPENSES_AMOUNT}}': f"P{total_expenses:,.2f}",
        '{{TOTAL_FUNDS_AMOUNT}}': f"P{total_funds:,.2f}",
        '{{CASH_ON_HAND_AMOUNT}}': f"P{cash_on_hand:,.2f}"
    }

    # Income items (1 to 3 in master template)
    income_items = data.get('income_items')
    if not income_items or len(income_items) == 0:
        income_items = DEFAULT_INCOME_ITEMS

    for idx in range(1, 4):
        if idx <= len(income_items):
            inc = income_items[idx - 1]
            amt = float(inc.get('amount', 0)) if inc.get('amount') is not None else 0.0
            amt_str = f"P{amt:,.2f}"
            desc_str = inc.get('particulars') or inc.get('desc') or inc.get('title') or ''
            config[f'{{{{INCOME_ITEM_{idx}_PARTICULARS}}}}'] = desc_str
            config[f'{{{{INCOME_ITEM_{idx}_DESC}}}}'] = desc_str
            config[f'{{{{INCOME_ITEM_{idx}_AMOUNT}}}}'] = amt_str
        else:
            config[f'{{{{INCOME_ITEM_{idx}_PARTICULARS}}}}'] = ""
            config[f'{{{{INCOME_ITEM_{idx}_DESC}}}}'] = ""
            config[f'{{{{INCOME_ITEM_{idx}_AMOUNT}}}}'] = ""

    # Expense items (1 to 20 in master template)
    expense_items = data.get('expense_items')
    if not expense_items or len(expense_items) == 0:
        expense_items = DEFAULT_EXPENSE_ITEMS

    for idx in range(1, 21):
        if idx <= len(expense_items):
            exp = expense_items[idx - 1]
            amt = float(exp.get('amount', 0)) if exp.get('amount') is not None else 0.0
            amt_str = f"P{amt:,.2f}"
            desc_str = exp.get('particulars') or exp.get('desc') or exp.get('title') or ''
            config[f'{{{{EXPENSE_{idx}_PARTICULARS}}}}'] = desc_str
            config[f'{{{{EXPENSE_{idx}_DESC}}}}'] = desc_str
            config[f'{{{{EXPENSE_{idx}_AMOUNT}}}}'] = amt_str
        else:
            config[f'{{{{EXPENSE_{idx}_PARTICULARS}}}}'] = ""
            config[f'{{{{EXPENSE_{idx}_DESC}}}}'] = ""
            config[f'{{{{EXPENSE_{idx}_AMOUNT}}}}'] = ""

    # Clear up to 25 just in case
    for i in range(21, 26):
        config[f'{{{{EXPENSE_{i}_PARTICULARS}}}}'] = ""
        config[f'{{{{EXPENSE_{i}_DESC}}}}'] = ""
        config[f'{{{{EXPENSE_{i}_AMOUNT}}}}'] = ""

    replace_placeholders(doc, config)
    doc.save(output_path)
    print(f"Successfully generated dynamic report from master template: {output_path}")
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
            'transmittal_date': 'April 29, 2026',
            'coordinator_name': 'Ms. Ligaya H. Estrella',
            'coordinator_role': 'Co-curricular Affairs Coordinator',
            'coordinator_salutation': 'Mrs. Estrella',
            'semester': '2nd SEMESTER',
            'academic_year': '2025–2026',
            'period_desc': 'As of Club Week 2026',
            'final_as_of': 'As of April 2026',
            'president_name': 'EULYSIES DOMANTAY',
            'treasurer_name': 'ANDREI GERONIMO',
            'auditor_name': 'MARIELLE CABANAG',
            'adviser_name': 'KIMBERLY DAWN JATULAN',
            'director_name': 'JOVYLYN ORTIZ-CESAR, MBA, MSIT',
            'dean_name': 'DR. EMRAIDA MARIE M. MANUCOM',
            'initial_budget': 5308.00,
            'total_income': 31438.00,
            'total_expenses': 22988.00,
            'total_funds': 31438.00,
            'cash_on_hand': 8450.00
        }
        populate_report(sample)
