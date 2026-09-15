#!/usr/bin/env python3
"""
Runs once a day (via .github/workflows/daily-update.yml).
Picks today's journal entry deterministically from content_bank.py,
writes it to data/today.json for the site to display, appends it to
JOURNAL.md, and rebuilds data/entries.json (the full history the
site's streak grid and timeline read from).
"""
import json
import os
import re
from datetime import date, datetime, timezone

from content_bank import ENTRIES

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TODAY_JSON = os.path.join(ROOT, "data", "today.json")
ENTRIES_JSON = os.path.join(ROOT, "data", "entries.json")
JOURNAL_MD = os.path.join(ROOT, "JOURNAL.md")

# Day this project started -- used only to show a friendly "day N" counter.
START_DATE = date(2026, 9, 3)

HEADING = re.compile(r"^## (\d{4}-\d{2}-\d{2}) \(day (\d+)\)\s*$")


def parse_journal(text):
    """Pull every '## YYYY-MM-DD (day N)' section out of JOURNAL.md."""
    entries = []
    current = None
    body = []

    for line in text.splitlines():
        match = HEADING.match(line)
        if match:
            if current:
                entries.append({
                    "date": current[0],
                    "day": int(current[1]),
                    "entry": " ".join(body).strip(),
                })
            current = (match.group(1), match.group(2))
            body = []
        elif current is not None and line.strip():
            body.append(line.strip())

    if current:
        entries.append({
            "date": current[0],
            "day": int(current[1]),
            "entry": " ".join(body).strip(),
        })

    entries.sort(key=lambda e: e["date"])
    return entries


def main():
    today = date.today()
    day_number = (today - START_DATE).days + 1
    entry = ENTRIES[today.toordinal() % len(ENTRIES)]

    os.makedirs(os.path.dirname(TODAY_JSON), exist_ok=True)

    with open(TODAY_JSON, "w") as f:
        json.dump({
            "date": today.isoformat(),
            "day_number": day_number,
            "entry": entry,
            "updated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        }, f, indent=2)
        f.write("\n")

    if os.path.exists(JOURNAL_MD):
        with open(JOURNAL_MD, "r") as f:
            journal = f.read()
    else:
        journal = "# Journal\n\nA running log of small daily notes.\n\n"

    if f"## {today.isoformat()}" not in journal:
        journal = journal + f"## {today.isoformat()} (day {day_number})\n\n{entry}\n\n"
        with open(JOURNAL_MD, "w") as f:
            f.write(journal)

    with open(ENTRIES_JSON, "w") as f:
        json.dump(parse_journal(journal), f, indent=2)
        f.write("\n")

    print(f"Updated day {day_number}: {entry}")


if __name__ == "__main__":
    main()
