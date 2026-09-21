"""PDF generation smoke tests."""

from io import BytesIO

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas


def test_reportlab_generates_pdf_magic_bytes():
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    pdf.drawString(100, 750, "BuildWyse test PDF")
    pdf.save()
    pdf_bytes = buffer.getvalue()

    assert pdf_bytes[:4] == b"%PDF"
    assert len(pdf_bytes) > 100
