# sarahhanafy.github.io

Sarah Hanafy's personal site — a small "now" page with a daily journal
entry, deployed with GitHub Pages.

A scheduled GitHub Actions workflow (`.github/workflows/daily-update.yml`)
runs once a day, picks the next entry from `scripts/content_bank.py`,
writes it to `data/today.json`, appends it to `JOURNAL.md`, commits the
change, and redeploys the site.

## Local structure

- `index.html`, `style.css` — the site
- `data/today.json` — today's entry, read by the page at load time
- `JOURNAL.md` — the full history of daily entries
- `scripts/update.py` — picks and writes today's entry
- `scripts/content_bank.py` — the pool of entries to rotate through; edit
  freely to add your own notes

## Customizing

Edit the `<!-- EDIT ME -->` spots in `index.html` with your own bio and
links, and add to `scripts/content_bank.py` whenever you want fresh
material in the rotation.
