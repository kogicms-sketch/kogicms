## Goal

Make the voter ID card's typography render **exactly** like the original INEC card you provided — same font shapes, same weights, same sizes.

## Why it still looks off

Two root causes from comparing the render to your reference card:

1. **The font isn't really Arial.** The card asks for `Arial`, but most rendering devices/browsers don't have Arial installed, so it silently falls back to a different system sans-serif. The letter shapes (the "a", "R", numbers) then don't match the original. Fix: embed **Arimo**, a font that is metrically and visually identical to Arial, so every device shows the exact same letterforms as the original.

2. **The weights are wrong.** In the original:
   - Inline labels `CODE:`, `VIN:`, `DELIM:` → **bold** (Arial Bold)
   - Stacked field labels `DATE OF BIRTH`, `GENDER`, `OCCUPATION`, `ADDRESS` → **regular/thin** (not bold)
   - All values (`20-21-07-020`, `YAHA, TUKUR`, `01-01-1960`, `MALE`, `STUDENT`, etc.) → **Arial Bold (700)**, NOT the ultra-heavy Black (900) currently used.

   The current code uses one weight (600) for every label and 900 for every value, which makes labels too heavy and values too thick compared to the original.

## Changes

### 1. Embed the Arial-identical font
Add **Arimo** (weights 400 + 700) via the project's font setup so the card always renders with correct Arial shapes regardless of device.

### 2. `src/components/members/VoterIdCard.tsx`
- Set font family to `'Arimo', Arial, 'Liberation Sans', sans-serif`, pure black ink.
- Replace the single label style with two:
  - **Inline label** (CODE:, VIN:, DELIM:) → weight **700**, black.
  - **Field label** (DATE OF BIRTH, GENDER, OCCUPATION, ADDRESS) → weight **400** (regular), black.
- Change all **values** from weight 900 → **700** (true Arial Bold), including name and the vertical register column.
- Fine-tune font sizes against the original proportions (labels and values are nearly the same size; the name is the only larger element). Keep the existing `cqw` container-query units so it scales identically on every screen.

### 3. `public/_idtest.html`
Mirror the same font, weights, and sizes so the test page stays an accurate preview.

## Verification
Render the test page with headless Chromium (Arimo embedded) and visually compare CODE/VIN header, name, DOB, gender, occupation, and address against your reference card to confirm a 1:1 match.

## Notes
This is a presentation-only change — no data, schema, or business-logic edits.