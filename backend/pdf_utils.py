"""PDF text extraction using PyMuPDF (fitz). Simple and reliable."""
from __future__ import annotations

import fitz  # PyMuPDF


def extract_pdf_text(pdf_bytes: bytes) -> str:
    """Extract all text from a PDF. Returns empty string on error."""
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        try:
            return "".join(page.get_text() for page in doc)
        finally:
            doc.close()
    except Exception:
        return ""
