# 🎨 AI Prompt: Match Existing Marketplace Theme for New Auction Pages

Use this prompt **as-is** when asking AI (or a design-assist tool) to generate or modify UI code.
The goal is **NOT to create a new theme**, but to **perfectly match the existing theme from `marketplace.page.tsx`.**

---

## 🧠 CONTEXT FOR AI (VERY IMPORTANT)

You are working inside an **existing production frontend codebase**.

* There is an existing page: `marketplace.page.tsx`
* This page already defines the **visual language** of the app
* The new pages you generate must **blend in seamlessly**

❌ Do NOT invent a new design system
❌ Do NOT change fonts, colors, spacing philosophy
❌ Do NOT introduce heavy gradients, shadows, or animations

✅ Match everything that already exists

---

## 🎯 OBJECTIVE

Analyze the existing **Marketplace page UI** and **reuse the same**:

* Theme
* Fonts
* Font sizes
* Font weights
* Color palette
* Card styles
* Border radius
* Hover states
* Shadow / elevation style
* Spacing & layout rhythm

Then apply that **exact same styling logic** to new pages related to:

* Auction Detail
* My Bids
* Settlement / Claim Tokens

---

## 📁 SOURCE OF TRUTH

### Reference File (MANDATORY)

```
marketplace.page.tsx
```

This file is the **single source of truth** for:

* Typography
* Colors
* Card components
* Layout grid
* Buttons

You must **read and infer styling from this file** before generating anything.

---

## 🎨 DESIGN CONSTRAINTS (STRICT)

### Typography

* Use the **same font family** already used in `marketplace.page.tsx`
* Do NOT introduce new fonts
* Reuse the same:

  * Heading sizes
  * Body text sizes
  * Font weights

### Colors

* Reuse existing colors only
* Especially:

  * Primary text color
  * Secondary / muted text color
  * Border color
  * Card background
  * Accent color (used for CTA buttons)

If a color token is unclear, **infer it from usage**, do not guess.

---

## 🧱 CARD & CONTAINER STYLE

All new UI must follow the **same card pattern** used in Marketplace listings:

* Same border radius
* Same background color
* Same shadow (or no-shadow if flat)
* Same hover / focus behavior
* Same padding scale

Cards should feel like they belong to the same grid system.

---

## 🧩 COMPONENT BEHAVIOR RULES

### Buttons

* Reuse existing button variants
* Same height, padding, border radius
* Same hover & disabled states

### Inputs

* Same input styling as marketplace filters or search
* Same focus ring behavior
* Same placeholder styling

### Status Indicators

* Use subtle color cues only
* No loud badges or animations
* Match how status is shown in marketplace cards

---

## 🧭 LAYOUT RULES

* Follow the same **horizontal spacing** used in marketplace cards
* Use the same container width
* Keep vertical rhythm consistent
* Avoid dense or compressed layouts

Think: *"This page could have shipped with the marketplace page."*

---

## 🧠 AI TASK INSTRUCTIONS

When generating code or UI:

1. **First analyze** `marketplace.page.tsx`
2. Extract:

   * Font usage
   * Card wrapper component
   * Color tokens
   * Button styles
3. Reuse those patterns exactly
4. Apply them to the new page
5. Keep implementation clean and minimal

---

## 🧪 SELF-CHECK BEFORE OUTPUT

Before final output, verify:

* ❓ Would a user notice this page is "new"?
* ❓ Does it visually clash with marketplace?

If yes → revise.
If no → correct.

---

## 🏁 FINAL EXPECTATION

The output should:

* Look native to the app
* Feel consistent with Marketplace
* Require **no design review** to approve
* Be production-ready

> **Golden rule:** *Match, don’t redesign.*
