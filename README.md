# PawKit — Pet Sitter Care Pack Generator

Browser-based tool for professional pet sitters to create care pack PDFs for their clients' pets.

## Live URL
*(deploy to Vercel — not yet live)*

## Access Code
`PAWK-K7N2-X9QT` — universal code, give to every buyer

## Etsy Listing
**ForgioStudio** — *(listing not yet created)*

## How it works
The pet sitter fills this out AFTER an intake call with the pet owner.
The owner provides all pet details (meds, vet, schedule) during the intake conversation.
PawKit turns those notes into a professional PDF care pack.

## Sections (7)
1. About the Sitter — name, business, intro message, contact
2. Pet Profile — name, species, breed, age, weight, microchip, notes
3. Daily Routine — feeding times/amounts, walks, playtime, bedtime
4. House Rules — allowed rooms, crate, furniture, custom rules
5. Emergency Info — owner contacts, secondary contact, vet, emergency vet
6. Special Instructions — medications, allergies, behavioral notes, do/don't list
7. Pickup & Dropoff — dates/times, what to bring, payment, cancellation

## Themes (6)
Fresh · Cozy · Playful · Nature · Gentle · Blush (paw pattern)

## Tech
- Pure HTML + CSS + Vanilla JS (no framework, no build step)
- PDF via `window.print()` on dynamically built HTML in new tab
- `localStorage` keys: `pk_code`, `pk_project`, `pk_disabled`, `pk_theme`
- `codes.js` — hardcoded universal access code array
- Left accent stripe on PDF pages (vs GuestBook's top bar)
- Pill badge section headers (vs GuestBook's colored box headers)
- Centered cover with paw print motif

## Files
```
index.html          — app shell (gate + app)
style.css           — all styles (warm cream/amber UI)
app.js              — all logic + PDF generation
codes.js            — access code validation
vercel.json         — cleanUrls: true
README.md           — this file
delivery/
  download.html     — buyer delivery PDF (URL + code) [TODO]
mockups/
  mockups.html      — Etsy listing images (screenshot each)
```

## Deploy
1. Create GitHub repo, push all files
2. Connect to Vercel → auto-deploy
3. Update `delivery/download.html` with the live URL
