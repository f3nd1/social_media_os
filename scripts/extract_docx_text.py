#!/usr/bin/env python3
"""Extract plain text from a .docx file using only the Python standard library.

A .docx file is a zip archive; the body text lives in word/document.xml.
Paragraph boundaries (w:p) become newlines. Prints a JSON object to stdout:
{"text": ..., "characters": ..., "method": "docx-stdlib"} or {"error": ...}.
"""

import json
import re
import sys
import zipfile


def main() -> None:
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Usage: extract_docx_text.py <file.docx>"}))
        return

    path = sys.argv[1]

    try:
        with zipfile.ZipFile(path) as archive:
            xml = archive.read("word/document.xml").decode("utf-8", "ignore")
    except KeyError:
        print(json.dumps({"error": "The file does not contain word/document.xml. Is it a valid .docx document?"}))
        return
    except zipfile.BadZipFile:
        print(json.dumps({"error": "The file is not a valid .docx archive."}))
        return
    except OSError as error:
        print(json.dumps({"error": f"Could not read the file: {error}"}))
        return

    # Paragraphs and breaks become newlines, then all remaining tags drop out.
    xml = xml.replace("</w:p>", "\n").replace("<w:br/>", "\n").replace("<w:tab/>", "\t")
    text = re.sub(r"<[^>]+>", "", xml)
    text = (
        text.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", '"')
        .replace("&apos;", "'")
    )
    lines = [line.strip() for line in text.split("\n")]
    cleaned = "\n".join(line for line in lines if line)

    print(
        json.dumps(
            {
                "text": cleaned,
                "characters": len(cleaned),
                "method": "docx-stdlib",
            }
        )
    )


if __name__ == "__main__":
    main()
