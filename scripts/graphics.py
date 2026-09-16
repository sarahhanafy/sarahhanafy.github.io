#!/usr/bin/env python3
"""
Builds data/graphics.json from whatever is sitting in graphics/.

Folders become sections on the design page. Make a folder for each one --
graphics/01-maps-youth/, graphics/02-wamy4p/ -- and drop images inside.

Number the folders OLDEST FIRST. The page shows them newest first, so the
highest-numbered folder sits at the top: a new section just needs the next
number and it lands at the top on its own, no renumbering. Images inside a
folder run in filename order, top of the section to the end of the row.
Anything left loose in graphics/ shows up in its own section at the bottom.

Titles are guessed from filenames: "tedxuw-poster.png" becomes "TEDxUW
Poster". Order always comes from the folders and filenames, never from
data/graphics.json -- renaming a file is how you move it. Titles and
captions you've edited in that file ARE kept.
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GRAPHICS_DIR = os.path.join(ROOT, "graphics")
GRAPHICS_JSON = os.path.join(ROOT, "data", "graphics.json")
SECTIONS_JSON = os.path.join(ROOT, "data", "sections.json")

EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".avif"}

# Words that should keep their own capitalisation in a guessed title.
ACRONYMS = {
    "uw": "UW", "tedx": "TEDx", "tedxuw": "TEDxUW", "cair": "CAIR",
    "cairwa": "CAIR-WA", "misce": "MISCE", "cs": "CS", "ai": "AI",
    "ui": "UI", "ux": "UX", "nyc": "NYC", "usa": "USA", "wa": "WA",
    "dubhacks": "DubHacks", "pnw": "PNW", "maps": "MAPS", "mcrc": "MCRC",
    "laserx": "LaserX", "msa": "MSA", "asa": "ASA", "tedxuofw": "TEDxUofW",
    "wamy4p": "WAMY4P", "uw": "UW", "psl": "PSL", "cse": "CSE", "micse": "MiCSE",
}

# Words that stay lowercase in a title unless they lead it.
SMALL_WORDS = {"and", "or", "of", "the", "a", "an", "at", "in", "on", "for", "as",
               "to", "with", "from", "by"}


def prettify(text):
    text = text.replace("_", " ").replace("-", " ")
    parts = text.split()
    # Drop a leading sort prefix like "01 " so files can be ordered by name.
    if parts and parts[0].isdigit() and len(parts) > 1:
        parts = parts[1:]
    words = []
    for i, word in enumerate(parts):
        key = word.lower()
        if key in ACRONYMS:
            words.append(ACRONYMS[key])
        elif i > 0 and key in SMALL_WORDS:
            words.append(key)
        else:
            words.append(word.capitalize())
    return " ".join(words)


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
                    found.append((entry + "/" + name, entry))
        elif os.path.splitext(entry)[1].lower() in EXTENSIONS:
            found.append((entry, ""))

    # Filenames ascending within a folder, then newest folder first.
    # Two stable passes: the second only reorders sections.
    found.sort(key=lambda item: item[0])
    found.sort(key=lambda item: item[1], reverse=True)
    return found


def load_sections():
    """Folder -> {title, dates}. New folders are scaffolded with a blank
    date range for you to fill in; anything you've typed is kept."""
    meta = {}
    if os.path.exists(SECTIONS_JSON):
        try:
            with open(SECTIONS_JSON) as f:
                loaded = json.load(f)
            if isinstance(loaded, dict):
                meta = loaded
        except (ValueError, OSError):
            meta = {}
    return meta


def save_sections(meta):
    with open(SECTIONS_JSON, "w") as f:
        json.dump(meta, f, indent=2, sort_keys=True)
        f.write("\n")


def main():
    os.makedirs(GRAPHICS_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(GRAPHICS_JSON), exist_ok=True)

    found = collect()

    meta = load_sections()
    for _, folder in found:
        if folder and folder not in meta:
            meta[folder] = {"title": prettify(folder), "dates": ""}
    for folder in list(meta):
        if folder not in {f for _, f in found}:
            del meta[folder]
    save_sections(meta)

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

    def decorate(entry):
        folder = sections[entry["file"]]
        entry["section"] = folder
        info = meta.get(folder, {})
        entry["section_title"] = info.get("title") or prettify(folder)
        entry["section_dates"] = info.get("dates", "")
        return entry

    # Order always follows the scan -- newest folder first, filenames in
    # order within it. Renaming a file is how you move it. Titles and notes
    # edited by hand in graphics.json are carried across.
    previous = {e.get("file"): e for e in existing if isinstance(e, dict)}

    entries = []
    for path, section in found:
        old_entry = previous.get(path, {})
        entries.append(decorate({
            "file": path,
            "title": old_entry.get("title") or title_from_filename(path),
            "note": old_entry.get("note", ""),
        }))

    with open(GRAPHICS_JSON, "w") as f:
        json.dump(entries, f, indent=2)
        f.write("\n")

    labels = sorted({e["section"] for e in entries if e["section"]})
    print(f"graphics.json: {len(entries)} image(s)"
          + (f" across sections: {', '.join(labels)}" if labels else ""))


if __name__ == "__main__":
    main()
