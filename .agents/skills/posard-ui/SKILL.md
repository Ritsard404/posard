---
name: posard-ui-system
description: >
  Enforce POSARD UI/UX system including mobile-first design,
  shadcn components, responsiveness, scrollable overflow handling,
  and usability rules for small business POS interfaces.
---

# Purpose
Ensure consistent, simple, and mobile-first UI for POS systems targeting
non-technical users. Every screen must be fully responsive and handle
overflow via scrollable containers — never clip or hide content silently.

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
- Content must NEVER overflow its container without a scroll affordance

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
  - mobile → bottom sheet (drawer, slides up from bottom)
  - desktop → fixed side panel (right, `w-80 xl:w-96`)
- Root layout must be `h-screen` with `flex flex-col` or `flex flex-row`
  so every child area fills available space predictably
- Never let a page grow beyond `100vh` — use inner scroll zones instead

## Responsive Rules
- Every view must be tested at: 375px · 768px · 1280px · 1440px
- Use `sm:` `md:` `lg:` `xl:` prefixes — never hard-code pixel widths
- Text: `text-sm md:text-base`, headings `text-lg md:text-2xl`
- Buttons: full-width on mobile (`w-full`), auto on desktop (`md:w-auto`)
- Sidebars: hidden on mobile (`hidden md:flex`), revealed via drawer/sheet
- Images & product cards: always `min-w-0` inside flex parents to prevent blowout
- Use `flex-1 min-h-0` on scrollable children inside flex columns —
  without `min-h-0` the child ignores the parent's height constraint

## Overflow & Scroll Rules
- **Product grid area**: `overflow-y-auto` with `flex-1 min-h-0`
  so the grid scrolls inside the viewport without pushing the footer/cart bar off-screen
- **Cart item list**: always `overflow-y-auto max-h-[60vh] md:max-h-full`
  so long carts scroll within the panel instead of extending the page
- **Order history / tables**: wrap in `overflow-x-auto` for horizontal scroll
  on narrow screens; never truncate columns silently
- **Bottom sheet (mobile cart)**: set a `max-h-[80vh]` on the sheet content
  and add `overflow-y-auto` inside so it scrolls rather than clipping
- **Scrollbar styling** (optional but recommended):
  ```css
  .scroll-zone {
    scrollbar-width: thin;
    scrollbar-color: hsl(var(--border)) transparent;
  }
  ```
- **Never** use `overflow-hidden` on a container that holds dynamic
  user-generated lists — only use it for decorative clipping (card images, etc.)
- Sticky headers inside scroll zones: use `sticky top-0 z-10 bg-background`
  so column headers or section labels remain visible while scrolling

## Scroll Container Pattern (reference)
```tsx
{/* Full-height POS shell */}
<div className="h-screen flex flex-col md:flex-row overflow-hidden">

  {/* Product area — scrolls independently */}
  <main className="flex-1 min-h-0 overflow-y-auto p-4">
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((p) => <ProductCard key={p.id} product={p} />)}
    </div>
  </main>

  {/* Cart panel — desktop sidebar */}
  <aside className="hidden md:flex flex-col w-80 xl:w-96 border-l">
    {/* Cart items scroll */}
    <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
      {cartItems.map((item) => <CartItem key={item.id} item={item} />)}
    </div>
    {/* Sticky checkout footer */}
    <div className="border-t p-4">
      <CheckoutSummary />
    </div>
  </aside>

</div>
```

## Interaction Rules
- Minimum touch target: 48×48px
- Provide feedback for all actions (toast / loading spinner)
- No hover-only interactions
- Scroll areas must show a visible scrollbar or fade gradient hint on mobile

## Visual Rules
- No purple gradients or glassmorphism
- Use consistent spacing (`p-4`, `gap-4`)
- Maintain clear visual hierarchy (1-2-3 structure)
- Empty scroll zones must show an empty state, not a blank void

## UX Rules
- Use clear labels: "Add to Cart", not "+"
- Max 5 steps from product → checkout
- Always show loading, empty, and error states
- Confirm destructive actions
- When a list is scrollable, show a subtle shadow/gradient at the bottom
  edge to hint more content exists below:
  ```tsx
  <div className="relative">
    <div className="overflow-y-auto max-h-[60vh]">{children}</div>
    <div className="pointer-events-none absolute bottom-0 left-0 right-0
                    h-8 bg-gradient-to-t from-background to-transparent" />
  </div>
  ```

---

# Workflow

## Step 1: Identify UI Context
- Determine screen (POS grid, cart, payment, order history, etc.)
- Identify device layout (mobile vs desktop)
- Identify which areas contain dynamic/variable-length lists

## Step 2: Apply Layout
- Set root shell to `h-screen overflow-hidden`
- Assign `flex-1 min-h-0` to every scrollable inner zone
- Apply `overflow-y-auto` to product grids, cart lists, and tables
- Apply `overflow-x-auto` to any tabular data

## Step 3: Generate Components
- Use shadcn base components (ScrollArea, Sheet, Drawer, Card, Button)
- Prefer shadcn `<ScrollArea>` over raw `overflow-y-auto` when inside
  a dialog or sheet — it handles cross-browser scrollbar styling
- Apply POS-specific UI patterns from the Scroll Container Pattern above

## Step 4: Add Interaction
- Add loading skeletons (shadcn `<Skeleton>`) for async lists
- Add toasts for cart actions
- Add validation feedback on payment forms
- Add scroll-hint gradients on capped-height lists

## Step 5: Validate
- [ ] Touch targets ≥ 48×48px
- [ ] Tested at 375px, 768px, 1280px
- [ ] No content clipped without a scroll affordance
- [ ] Cart scrolls independently of product grid
- [ ] Tables have `overflow-x-auto` wrapper
- [ ] Empty and error states exist for every list
- [ ] No UX anti-patterns (hover-only, icon-only, etc.)

---

# Output Format
- Feature-based components only (`ProductGrid`, `CartPanel`, `CheckoutBar`)
- Clean Tailwind usage — no inline styles
- No logic inside `page.tsx`
- Fully responsive layout with explicit scroll zones
- Every component self-contained with its own scroll boundary