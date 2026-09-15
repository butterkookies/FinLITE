import os
import xml.etree.ElementTree as ET
xml_path = os.path.join(os.path.dirname(__file__), 'document_xml_dump.txt')
tree = ET.parse(xml_path)
root = tree.getroot()
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
body = root.find('w:body', ns)
tbls = body.findall('w:tbl', ns)

for idx, t in enumerate(tbls):
    tblPr = t.find('w:tblPr', ns)
    borders = tblPr.find('w:tblBorders', ns) if tblPr is not None else None
    b_list = []
    if borders is not None:
        for b in borders:
            tag = b.tag.split('}')[-1]
            val = b.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val')
            b_list.append(f'{tag}={val}')
    print(f'Table {idx} borders: {b_list}')
    for r_idx, r in enumerate(t.findall('w:tr', ns)):
        cells = r.findall('w:tc', ns)
        row_vals = []
        for c in cells:
            txt = ''.join(t.text for t in c.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t') if t.text).strip()
            tcPr = c.find('w:tcPr', ns)
            shd = tcPr.find('w:shd', ns) if tcPr is not None else None
            fill = shd.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}fill') if shd is not None else 'none'
            row_vals.append(f'{txt} (bg:{fill})')
        print(f'  R{r_idx}: ' + ' | '.join(row_vals))
