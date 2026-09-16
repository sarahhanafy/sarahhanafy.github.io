#!/usr/bin/env python3
"""
Builds data/graphics.json from whatever is sitting in graphics/.

Folders become sections on the design page. Make a folder for each one --
graphics/2024/, graphics/2025/, graphics/tedxuw/ -- and drop images inside.
Sections are listed oldest first, sorted by folder name, so numeric names
like years order themselves. Anything left loose in graphics/ shows up in
its own section at the end.

Titles are guessed from filenames: "tedxuw-poster.png" becomes "TEDxUW
Poster". Titles, captions and the order of entries that you've edited in
data/graphics.json are preserved, so you can rearrange the file by hand
and new images are appended.
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


def prettify(text):
    text = text.replace("_", " ").replace("-", " ")
    parts = text.split()
    # Drop a leading sort prefix like "01 " so files can be ordered by name.
    if parts and parts[0].isdigit() and len(parts) > 1:
        parts = parts[1:]
    return " ".join(ACRONYMS.get(w.lower(), w.capitalize()) for w in parts)


def title_from_filename(name):
    return prettify(os.path.splitext(os.path.basename(name))[0]) or name


def collect():
    """Every image under graphics/, as (relative path, section label)."""
    found = []

    for entry in sorted(os.listdir(GRAPHICS_DIR)):
        if entry.startswith("."):
            continue
        path = os.path.join(GRAPHICS_DIR, entry)

        if os.path.isdir(path):
            for name in sorted(os.listdir(path)):
                if name.startswith("."):
                    continue
                if os.path.splitext(name)[1].lower() in EXTENSIONS:
                    found.append((entry + "/" + name, prettify(entry)))
        elif os.path.splitext(entry)[1].lower() in EXTENSIONS:
            found.append((entry, ""))

    # Folders first (oldest section at the top), loose files last.
    found.sort(key=lambda item: (item[1] == "", item[1], item[0]))
    return found


def main():
    os.makedirs(GRAPHICS_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(GRAPHICS_JSON), exist_ok=True)

    found = collect()
    sections = {path: section for path, section in found}
    present = set(sections)

    existing = []
    if os.path.exists(GRAPHICS_JSON):
        try:
            with open(GRAPHICS_JSON) as f:
                loaded = json.load(f)
            if isinstance(loaded, list):
                existing = loaded
        except (ValueError, OSError):
            existing = []

    entries = []
    # Keep the hand-edited order, dropping anything that's been deleted.
    for entry in existing:
        if isinstance(entry, dict) and entry.get("file") in present:
            entry["section"] = sections[entry["file"]]
            entries.append(entry)

    known = {e["file"] for e in entries}
    for path, section in found:
        if path not in known:
            entries.append({
                "file": path,
                "title": title_from_filename(path),
                "note": "",
                "section": section,
            })

    with open(GRAPHICS_JSON, "w") as f:
        json.dump(entries, f, indent=2)
        f.write("\n")

    labels = sorted({e["section"] for e in entries if e["section"]})
    print(f"graphics.json: {len(entries)} image(s)"
          + (f" across sections: {', '.join(labels)}" if labels else ""))


if __name__ == "__main__":
    main()
