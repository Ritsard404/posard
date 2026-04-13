---
name: posard-ui-system
description: >
  Enforce POSARD UI/UX system including mobile-first design,
  shadcn components, and usability rules for small business POS interfaces.
---

# Purpose
Ensure consistent, simple, and mobile-first UI for POS systems targeting non-technical users.

# Preconditions
- Next.js App Router
- Tailwind CSS
- shadcn/ui components
- Mobile-first design required

---

# Rules

## Design Principles
- Mobile-first always (≤767px baseline)
- UI must be usable by non-technical users
- Maximize clarity and speed of interaction
- Avoid unnecessary complexity

## Component Rules
- Use shadcn/ui components only
- No raw HTML inputs or buttons
- No inline styles unless necessary
- No icon-only actions — always include labels

## Layout Rules
- Use responsive grid:
  `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`
- Bottom navigation on mobile, sidebar on desktop
- Cart:
  - mobile → bottom sheet
  - desktop → side panel

## Interaction Rules
- Minimum touch target: 48x48px
- Provide feedback for all actions (toast/loading)
- No hover-only interactions

## Visual Rules
- No purple gradients or glassmorphism
- Use consistent spacing (`p-4`, `gap-4`)
- Maintain clear visual hierarchy (1-2-3 structure)

## UX Rules
- Use clear labels: "Add to Cart", not "+"
- Max 5 steps from product → checkout
- Always show loading, empty, and error states
- Confirm destructive actions

---

# Workflow

## Step 1: Identify UI Context
- Determine screen (POS, cart, payment, etc.)
- Identify device layout (mobile vs desktop)

## Step 2: Apply Layout
- Select correct layout pattern
- Apply grid and spacing rules

## Step 3: Generate Components
- Use shadcn base components
- Apply POS-specific UI patterns

## Step 4: Add Interaction
- Add loading states
- Add toasts
- Add validation feedback

## Step 5: Validate
- Check touch targets
- Check responsiveness
- Ensure no UX anti-patterns

---

# Output Format
- Feature-based components only
- Clean Tailwind usage
- No logic inside page.tsx
- Fully responsive layout