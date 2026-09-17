import urllib.request
import base64
import shutil
import os

def render(mmd_path, svg_path, png_path):
    with open(mmd_path, 'r', encoding='utf-8') as f:
        code = f.read()
    
    encoded = base64.b64encode(code.encode('utf-8')).decode('ascii')
    
    # Fetch SVG
    svg_url = f"https://mermaid.ink/svg/{encoded}"
    req_svg = urllib.request.Request(svg_url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req_svg, timeout=25) as resp:
        svg_data = resp.read()
    with open(svg_path, "wb") as f:
        f.write(svg_data)
    print(f"Wrote {svg_path} ({len(svg_data)} bytes)")
    
    # Fetch PNG
    png_url = f"https://mermaid.ink/img/{encoded}"
    req_png = urllib.request.Request(png_url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req_png, timeout=25) as resp:
        png_data = resp.read()
    with open(png_path, "wb") as f:
        f.write(png_data)
    print(f"Wrote {png_path} ({len(png_data)} bytes)")

# Render Context Diagram
render("docs/context_diagram.mmd", "docs/context_diagram.svg", "docs/context_diagram.png")

# Render Diagram 0
render("docs/diagram_0.mmd", "docs/diagram_0.svg", "docs/diagram_0.png")

# Copy to public/diagrams/
shutil.copy("docs/context_diagram.svg", "public/diagrams/context_diagram.svg")
shutil.copy("docs/context_diagram.png", "public/diagrams/context_diagram.png")
shutil.copy("docs/diagram_0.svg", "public/diagrams/diagram_0.svg")
shutil.copy("docs/diagram_0.png", "public/diagrams/diagram_0.png")
print("Successfully synced all diagrams to docs/ and public/diagrams/!")
