#!/usr/bin/env python3
import json
import sys


def extract_with_pdfplumber(path):
    import pdfplumber

    page_texts = []

    with pdfplumber.open(path) as pdf:
        for index, page in enumerate(pdf.pages, start=1):
            pieces = []
            text = page.extract_text(x_tolerance=1, y_tolerance=3) or ""

            if text.strip():
                pieces.append(text)

            try:
                tables = page.extract_tables() or []
            except Exception:
                tables = []

            for table in tables:
                rows = []
                for row in table:
                    cleaned = [
                        str(cell).strip() if cell is not None else ""
                        for cell in row
                    ]
                    if any(cleaned):
                        rows.append(" | ".join(cleaned))
                if rows:
                    pieces.append("\n".join(rows))

            if pieces:
                page_texts.append(f"--- Page {index} ---\n" + "\n".join(pieces))

        return "\n\n".join(page_texts), len(pdf.pages)


def extract_with_pypdf(path):
    from pypdf import PdfReader

    reader = PdfReader(path)
    page_texts = []

    for index, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        if text.strip():
            page_texts.append(f"--- Page {index} ---\n{text}")

    return "\n\n".join(page_texts), len(reader.pages)


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing PDF path."}))
        return 2

    path = sys.argv[1]
    method = "pdfplumber"

    try:
        text, pages = extract_with_pdfplumber(path)
    except Exception as first_error:
        try:
            text, pages = extract_with_pypdf(path)
            method = "pypdf"
        except Exception as second_error:
            print(
                json.dumps(
                    {
                        "error": "PDF text extraction failed.",
                        "detail": f"{first_error}; {second_error}",
                    }
                )
            )
            return 1

    print(
        json.dumps(
            {
                "text": text,
                "pages": pages,
                "method": method,
                "characters": len(text),
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
