#!/usr/bin/env python3
"""
Builds data/graphics.json from whatever is sitting in graphics/.

Drop an image into graphics/ and the next run picks it up -- the title is
guessed from the filename, so "tedxuw-poster.png" becomes "TEDxUW Poster".

Titles and notes you've already edited in data/graphics.json are kept, and
so is the order of the entries, so you can rearrange the file by hand and
new images just get appended to the end.
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GRAPHICS_DIR = os.path.join(ROOT, "graphics")
GRAPHICS_JSON = os.path.join(ROOT, "data", "graphics.json")

EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".avif"}

# Words that should keep their own capitalisation in a guessed title.
ACRONYMS = {
    "uw": "UW", "tedx": "TEDx", "tedxuw": "TEDxUW", "cair": "CAIR",
    "cairwa": "CAIR-WA", "misce": "MISCE", "cs": "CS", "ai": "AI",
    "ui": "UI", "ux": "UX", "nyc": "NYC", "usa": "USA", "wa": "WA",
    "dubhacks": "DubHacks", "pnw": "PNW",
}


def title_from_filename(name):
    stem = os.path.splitext(name)[0]
    stem = stem.replace("_", " ").replace("-", " ")
    # Drop a leading sort prefix like "01 " so files can be ordered by name.
    parts = stem.split()
    if parts and parts[0].isdigit():
        parts = parts[1:]
    words = []
    for word in parts:
        key = word.lower()
        words.append(ACRONYMS.get(key, word.capitalize()))
    return " ".join(words) or stem


def main():
    os.makedirs(GRAPHICS_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(GRAPHICS_JSON), exist_ok=True)

    present = sorted(
        f for f in os.listdir(GRAPHICS_DIR)
        if os.path.splitext(f)[1].lower() in EXTENSIONS and not f.startswith(".")
    )

    existing = []
    if os.path.exists(GRAPHICS_JSON):
        try:
            with open(GRAPHICS_JSON) as f:
                existing = json.load(f)
        except (ValueError, OSError):
            existing = []

    by_file = {e.get("file"): e for e in existing if isinstance(e, dict)}

    entries = []
    # Keep the order already in the file, dropping anything that's been deleted.
    for entry in existing:
        if isinstance(entry, dict) and entry.get("file") in present:
            entries.append(entry)

    known = {e["file"] for e in entries}
    for name in present:
        if name not in known:
            entries.append({
                "file": name,
                "title": title_from_filename(name),
                "note": "",
            })

    with open(GRAPHICS_JSON, "w") as f:
        json.dump(entries, f, indent=2)
        f.write("\n")

    print(f"graphics.json: {len(entries)} image(s)")


if __name__ == "__main__":
    main()
