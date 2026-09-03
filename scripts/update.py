#!/usr/bin/env python3
"""
Runs once a day (via .github/workflows/daily-update.yml).
Picks today's journal entry deterministically from content_bank.py,
writes it to data/today.json for the site to display, and appends
it to JOURNAL.md so there's a real, readable history over time.
"""
import json
import os
from datetime import date, datetime, timezone

from content_bank import ENTRIES

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TODAY_JSON = os.path.join(ROOT, "data", "today.json")
JOURNAL_MD = os.path.join(ROOT, "JOURNAL.md")

# Day this project started -- used only to show a friendly "day N" counter.
START_DATE = date(2026, 9, 3)


def main():
    today = date.today()
    day_number = (today - START_DATE).days + 1
    entry = ENTRIES[today.toordinal() % len(ENTRIES)]

    payload = {
        "date": today.isoformat(),
        "day_number": day_number,
        "entry": entry,
        "updated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }

    os.makedirs(os.path.dirname(TODAY_JSON), exist_ok=True)
    with open(TODAY_JSON, "w") as f:
        json.dump(payload, f, indent=2)
        f.write("\n")

    header = f"## {today.isoformat()} (day {day_number})\n\n{entry}\n\n"
    if os.path.exists(JOURNAL_MD):
        with open(JOURNAL_MD, "r") as f:
            existing = f.read()
    else:
        existing = "# Journal\n\nA running log of small daily notes.\n\n"

    if f"## {today.isoformat()}" not in existing:
        with open(JOURNAL_MD, "w") as f:
            f.write(existing + header)

    print(f"Updated day {day_number}: {entry}")


if __name__ == "__main__":
    main()
