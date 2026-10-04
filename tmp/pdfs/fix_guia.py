from io import BytesIO
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from reportlab.lib import colors
from reportlab.pdfgen import canvas

source = Path(r"C:\Users\deept\OneDrive\Guia_AthlonX_Rugby.pdf")
output = Path(r"C:\Users\deept\AthlonX\output\pdf\Guia_AthlonX_Rugby_corregida.pdf")
output.parent.mkdir(parents=True, exist_ok=True)

reader = PdfReader(str(source))
writer = PdfWriter()

for index, page in enumerate(reader.pages):
    overlay_buffer = BytesIO()
    overlay = canvas.Canvas(overlay_buffer, pagesize=(612, 792))
    modified = False

    if index == 0:
        modified = True
        # Add a compact assistance line in the upper guide area without moving existing content.
        overlay.setStrokeColor(colors.HexColor("#D99A00"))
        overlay.setLineWidth(0.8)
        overlay.line(90, 650, 522, 650)
        overlay.setFillColor(colors.HexColor("#1B5E35"))
        overlay.setFont("Helvetica-Bold", 9)
        overlay.drawCentredString(306, 660, "¿Necesitas asistencia? Escríbenos por WhatsApp: 65591976")

    if index == 1:
        modified = True
        # Remove the isolated punctuation mark left between the section content and example box.
        overlay.setFillColor(colors.white)
        overlay.rect(40, 175, 50, 38, stroke=0, fill=1)

    if index == 8:
        modified = True
        # Replace the loose contact lines with a compact, clearer contact callout.
        overlay.setFillColor(colors.white)
        overlay.rect(45, 70, 525, 125, stroke=0, fill=1)
        overlay.setFillColor(colors.HexColor("#E8F3EC"))
        overlay.roundRect(90, 88, 432, 72, 4, stroke=0, fill=1)
        overlay.setFillColor(colors.HexColor("#1B5E35"))
        overlay.setFont("Helvetica-Bold", 10)
        overlay.drawString(106, 140, "Para mayor asistencia, escríbenos por WhatsApp:")
        overlay.setFont("Helvetica-Bold", 14)
        overlay.drawString(106, 119, "WhatsApp: 65591976")
        overlay.setFont("Helvetica", 10)
        overlay.drawString(106, 101, "Nex Digital")

    if modified:
        overlay.save()
        overlay_buffer.seek(0)
        page.merge_page(PdfReader(overlay_buffer).pages[0])
    writer.add_page(page)

with output.open("wb") as stream:
    writer.write(stream)

print(output)
