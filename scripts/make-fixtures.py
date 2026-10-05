from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from PIL import Image, ImageDraw, ImageFont
from pypdf import PdfReader
root=Path(__file__).resolve().parents[1]/'tests'/'fixtures'
root.mkdir(parents=True, exist_ok=True)
lines=['SYNTHETIC TEST STATEMENT - NOT A REAL ACCOUNT','Currency: AED','2026-09-24 Carrefour market 125.50','2026-09-25 DEWA utilities 340.00','2026-09-26 Salary 5000.00 CR']
c=canvas.Canvas(str(root/'test-statement.pdf'),pagesize=A4)
c.setFont('Helvetica',12)
for i,line in enumerate(lines):c.drawString(40,780-i*35,line)
c.save()
assert '125.50' in PdfReader(root/'test-statement.pdf').pages[0].extract_text()
im=Image.new('RGB',(1600,600),'white');draw=ImageDraw.Draw(im)
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',32)
for i,line in enumerate(lines):draw.text((45,40+i*80),line,font=font,fill='#142137')
im.save(root/'test-statement.png')
print('Synthetic PDF and screenshot fixtures created.')
