import os
import sys
import docx
from docx.enum.text import WD_ALIGN_PARAGRAPH

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_TEMPLATE = os.path.join(BASE_DIR, 'templates', 'LITE-Financial-Report-Universal-Template.docx')
DEFAULT_OUTPUT = os.path.join(BASE_DIR, 'exports', 'FinLITE-Exported-Report.docx')

def replace_text_in_paragraph(p, tag, replacement):
    if tag in p.text:
        # Simple replace preserving paragraph
        full_text = p.text.replace(tag, str(replacement))
        p.text = full_text
        if p.runs:
            p.runs[0].font.name = 'Times New Roman'

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
    if not os.path.exists(template_path):
        raise FileNotFoundError(f"Template not found at: {template_path}")

    doc = docx.Document(template_path)
    
    # 1. Base default configuration (Dynamic User Inputs)
    config = {
        '{{TRANSMITTAL_DATE}}': data.get('transmittal_date', 'September 10, 2026'),
        '{{COORDINATOR_NAME}}': data.get('coordinator_name', 'Ms. Ligaya H. Estrella'),
        '{{COORDINATOR_ROLE}}': data.get('coordinator_role', 'Co-curricular Affairs Coordinator'),
        '{{SEMESTER}}': data.get('semester', '1st SEMESTER'),
        '{{ACADEMIC_YEAR}}': data.get('academic_year', '2026-2027'),
        '{{PERIOD_DESCRIPTION}}': data.get('period_desc', 'As of September 2026'),
        '{{FINAL_AS_OF_DATE}}': data.get('final_as_of', 'As of September 2026'),
        
        # Signatories
        '{{PRESIDENT_NAME}}': data.get('president_name', 'ANDREI GERONIMO'),
        '{{PRESIDENT_ROLE}}': data.get('president_role', 'LITE PRESIDENT'),
        '{{TREASURER_NAME}}': data.get('treasurer_name', 'JUAN DELA CRUZ'),
        '{{TREASURER_ROLE}}': data.get('treasurer_role', 'LITE TREASURER'),
        '{{AUDITOR_NAME}}': data.get('auditor_name', 'MARIELLE CABANAG'),
        '{{AUDITOR_ROLE}}': data.get('auditor_role', 'LITE AUDITOR'),
        '{{ADVISER_NAME}}': data.get('adviser_name', 'KIMBERLY DAWN JATULAN'),
        '{{ADVISER_ROLE}}': data.get('adviser_role', 'LITE ADVISER'),
        '{{DIRECTOR_NAME}}': data.get('director_name', 'JOVYLYN ORTIZ-CESAR, MBA, MSIT'),
        '{{DIRECTOR_ROLE}}': data.get('director_role', 'PROGRAM DIRECTOR'),
        '{{DEAN_NAME}}': data.get('dean_name', 'DR. EMRAIDA MARIE M. MANUCOM'),
        '{{DEAN_ROLE}}': data.get('dean_role', 'DEAN, COLLEGE OF COMPUTER STUDIES'),

        # Financial Totals & Labels
        '{{INITIAL_BUDGET_LABEL}}': data.get('budget_label', 'INITIAL BUDGET (Carried over from Previous Term)'),
        '{{INITIAL_BUDGET_AMOUNT}}': f"P{float(data.get('initial_budget', 5308.00)):,.2f}",
        '{{TOTAL_INCOME_AMOUNT}}': f"P{float(data.get('total_income', 31438.00)):,.2f}",
        '{{TOTAL_EXPENSES_AMOUNT}}': f"P{float(data.get('total_expenses', 22988.00)):,.2f}",
        '{{TOTAL_FUNDS_AMOUNT}}': f"P{float(data.get('total_funds', 31438.00)):,.2f}",
        '{{CASH_ON_HAND_AMOUNT}}': f"P{float(data.get('cash_on_hand', 8450.00)):,.2f}"
    }

    # Add dynamic income / exhibit placeholders
    for idx, inc in enumerate(data.get('income_items', []), 1):
        config[f'{{{{INCOME_ITEM_{idx}_DESC}}}}'] = inc.get('desc', '')
        config[f'{{{{INCOME_ITEM_{idx}_AMOUNT}}}}'] = f"P{float(inc.get('amount', 0)):,.2f}"
    config['{{INCOME_SUBTOTAL_1}}'] = f"P{float(data.get('income_subtotal_1', 18580.00)):,.2f}"

    for idx, esp in enumerate(data.get('esports_items', []), 1):
        config[f'{{{{ESPORTS_ITEM_{idx}_DESC}}}}'] = esp.get('desc', '')
        config[f'{{{{ESPORTS_ITEM_{idx}_AMOUNT}}}}'] = f"P{float(esp.get('amount', 0)):,.2f}"
    config['{{INCOME_SUBTOTAL_2}}'] = f"P{float(data.get('income_subtotal_2', 2000.00)):,.2f}"

    for idx, exh in enumerate(data.get('exhibit_items', []), 1):
        config[f'{{{{EXHIBIT_ITEM_{idx}_DESC}}}}'] = exh.get('desc', '')
        config[f'{{{{EXHIBIT_ITEM_{idx}_AMOUNT}}}}'] = f"P{float(exh.get('amount', 0)):,.2f}"
    config['{{EXHIBIT_SUBTOTAL}}'] = f"P{float(data.get('exhibit_subtotal', 5550.00)):,.2f}"

    for idx, exp in enumerate(data.get('expense_items', []), 1):
        config[f'{{{{EXPENSE_{idx}_DESC}}}}'] = exp.get('desc', '')
        config[f'{{{{EXPENSE_{idx}_AMOUNT}}}}'] = f"P{float(exp.get('amount', 0)):,.2f}"

    replace_placeholders(doc, config)
    doc.save(output_path)
    print(f"Successfully generated dynamic report from master template: {output_path}")
    return output_path

if __name__ == '__main__':
    sample = {
        'president_name': 'ANDREI GERONIMO',
        'academic_year': '2026-2027',
        'semester': '1st SEMESTER',
        'initial_budget': 5308.00
    }
    populate_report(sample)
