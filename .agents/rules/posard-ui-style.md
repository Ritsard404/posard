---
trigger: always_on
---

# 🧾 POSARD — UI/UX Design Instructions

> Agent + Developer Reference | Stack: Next.js · shadcn/ui · Tailwind CSS · Zustand

---

## 🎯 Project Context

**Product:** Point-of-Sale (POS) System  
**Target Users:** Small businesses — sari-sari stores, local food shops, karinderyas  
**Primary Device:** Mobile phone (≤767px) — **default design target**  
**Stack:** Next.js App Router · shadcn/ui · Tailwind CSS v3 · Zustand · Prisma · Supabase  
**Agent Skill:** `ui-ux-pro-max-skill` — run before any UI task

---

## 🧠 Design System

Generate via:

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py \
  "small business POS retail food shop" --design-system -p "POSARD" -f markdown
```

| Token          | Value                                      |
| -------------- | ------------------------------------------ |
| **Style**      | Soft UI Evolution + Flat Design            |
| **Primary**    | `#1A56DB` — trust, action                  |
| **Secondary**  | `#16A34A` — confirm, success               |
| **Accent**     | `#F59E0B` — highlight                      |
| **Background** | `#F9FAFB`                                  |
| **Surface**    | `#FFFFFF`                                  |
| **Text**       | `#111827` / `#6B7280` muted                |
| **Danger**     | `#EF4444`                                  |
| **Font**       | `DM Sans` headings · `Inter` body          |
| **Radius**     | `rounded-xl` default · `rounded-2xl` cards |
| **Shadow**     | `shadow-sm` cards · `shadow-md` modals     |

### ❌ Anti-Patterns — Never Use

- Purple/pink gradient backgrounds
- Text under `14px` on mobile
- Icon-only buttons (users won't recognize them)
- Hover-only interactions (no hover on touch)
- Horizontal-scrolling tables on mobile
- Toasts that auto-dismiss under 3 seconds

---

## 📱 Mobile-First Rules

> `useIsMobile()` hook (breakpoint `max-width: 767px`) is the **source of truth**.

```
Mobile  ≤767px   → bottom nav, full-screen sheets, 2-col grid
Tablet  768–1023 → sidebar visible, 3-col grid
Desktop ≥1024px  → full sidebar, 4-col grid
```

### Layout Rules

1. **Nav** — `fixed bottom-0` bottom bar on mobile, sidebar on desktop.
2. **Tap targets** — `min-h-[48px] min-w-[48px]` on all interactive elements.
3. **Product grid** — `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`
4. **Cart** — bottom sheet (`Sheet side="bottom"`) on mobile, right panel on desktop.
5. **Qty controls** — large `−` / `+` buttons in a pill, not text input alone.
6. **Modals** — full-screen on mobile, centered dialog on desktop.
7. **Forms** — single column, labels above inputs always.
8. **Font size** — `text-sm` (14px) body min · `text-base` (16px) inputs (prevents iOS zoom).
9. **Keyboard** — wrap in scroll container so keyboard doesn't cover inputs.

```tsx
const isMobile = useIsMobile()
{isMobile ? <BottomSheetCart /> : <SideCartPanel />}
{isMobile ? <BottomNavBar />   : <SidebarNav />}
<div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
```

---

## 🗂️ File Convention (Strict)

```
app/(protected)/<feature>/
├── page.tsx              # Route only — zero logic
├── _components/          # Feature UI components (PascalCase.tsx)
├── _services/
│   ├── <feature>.service.ts
│   └── _dto/<feature>.dto.ts
├── _actions/
│   └── <feature>.action.ts
└── store/
    └── <feature>.store.ts
```

- No barrel `index.ts` in feature folders — import directly.
- Shared UI → `components/ui/` (shadcn) or `components/shared/`.

---

## 🧩 Key Component Specs

**Product Card**

- `aspect-square` image · `rounded-xl` · max 2-line name
- Price: `text-base font-bold text-primary`
- Add button: full width · `min-h-[44px]`
- Out of stock: `"WALA"` badge overlay · button `disabled opacity-50`

**Cart Item Row**

- Name · unit price · `− [qty] +` pill · subtotal right-aligned
- Swipe-to-delete on mobile · `×` button on desktop

**Payment Screen**

- Full screen mobile · order summary collapsible
- Total: very large, bold · payment method as large pill buttons
- Cash input → change shown in large green text
- Confirm: `full-width min-h-[56px] bg-green-600 text-lg`

**Bottom Sheet**

- `Sheet side="bottom"` · max `90vh` · `overflow-y-auto`
- Drag handle at top · backdrop tap closes

**Number Pad**

- `3×4` grid · buttons `min-64px` square · backspace + clear included

---

## 🎨 shadcn/ui Mapping

| POS Element         | Component              | Notes                      |
| ------------------- | ---------------------- | -------------------------- |
| Product grid        | `Card`                 | Custom layout inside       |
| Cart (mobile)       | `Sheet side="bottom"`  | 50–90vh                    |
| Payment             | `Dialog` or full page  | Full screen mobile         |
| Category filter     | `Tabs` / `ToggleGroup` | Horizontal scroll mobile   |
| Search              | `Input` + `Command`    | Debounced                  |
| Order history       | `Table` / list         | Switch via `useIsMobile()` |
| Notifications       | `sonner` toast         | 4s success · 5s error      |
| Loading             | `Skeleton`             | Match content shape        |
| Destructive confirm | `AlertDialog`          | Void, delete, logout       |

---

## ✅ UX Principles (Non-Tech Users)

1. **Labels, not icons alone** — "Add to Cart", not "+" alone.
2. **Big primary actions** — largest, most colorful button = most important action.
3. **≤5 taps** — product → receipt in five taps max.
4. **Always feedback** — toast on every mutation, button loading state on submit.
5. **Plain error messages** — "Hindi ma-save. Subukan ulit." not "Error 422".
6. **No dead ends** — every screen has back / cancel.
7. **Skeleton loaders** — never blank screen on slow connections.
8. **Confirm before destroy** — `AlertDialog` for void / delete.

---

## 🔧 Zustand Conventions

- One store per feature: `pos.store.ts`, `inventory.store.ts`
- Store shape mirrors DTOs from `_dto/`
- Never store raw server data — fetch via Server Actions, hydrate in store
- Reset all stores on logout

```ts
interface POSStore {
  cartItems: CartItemDto[];
  addItem: (item: CartItemDto) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  total: number;
}
```

---

## 🚦 Pre-Delivery Checklist

- [ ] Touch targets ≥ 48×48px
- [ ] No horizontal scroll at 375px
- [ ] Inputs ≥ 16px (no iOS zoom)
- [ ] Bottom nav correct active tab
- [ ] Loading / empty / error states all handled
- [ ] `sonner` toast on all mutations
- [ ] `AlertDialog` on all destructive actions
- [ ] Sheet closes on backdrop tap + back
- [ ] `useIsMobile()` drives layout switches
- [ ] No hardcoded colors
- [ ] Skeleton matches content shape

---

## 🗺️ Feature Screen Map

| Screen          | Route                      | Priority  |
| --------------- | -------------------------- | --------- |
| POS / Cashier   | `/pos`                     | 🔴 Core   |
| Cart + Checkout | `_components/CartSheet`    | 🔴 Core   |
| Payment         | `_components/PaymentModal` | 🔴 Core   |
| Receipt         | `_components/Receipt`      | 🔴 Core   |
| Order History   | `/orders`                  | 🟡 High   |
| Inventory       | `/inventory`               | 🟡 High   |
| Dashboard       | `/dashboard`               | 🟢 Medium |
| Settings        | `/settings`                | 🟢 Medium |
| Login           | `/login`                   | 🔴 Core   |

---

## 🛠️ Agent Rules (ui-ux-pro-max-skill)

1. Run design system command before first UI task.
2. Mobile-first always — adapt up, never down.
3. shadcn/ui base — no raw HTML form elements.
4. Follow file convention exactly — zero logic in `page.tsx`.
5. Use `useIsMobile()` for ALL layout switches.
6. Style = Soft UI Evolution — rounded, calm, generous padding.
7. **Never** purple gradients, glassmorphism, or dark mode.
8. Pass the **"lola test"**: can a 55-year-old non-tech user use it without instructions?
9. Copy: Filipino-English mix OK ("I-void", "Bayad na"). Verb-first labels.
10. Run checklist above before marking any component done.

---

_POSARD v1 · April 2026_

---

## 💬 Copy & Language Guidelines

- Use **simple Filipino-English** where natural: "I-void", "I-cancel", "Bayad na", "Wala nang stock"
- Error messages in plain language — never show raw HTTP errors or stack traces
- Button labels: **verb-first** — "Add Product", "Save Order", "Print Receipt", "View History"
- Confirmation dialogs: state exactly what will happen — "This will permanently delete the item and cannot be undone."
- Success messages: affirm the completed action — "Order saved!", "Payment received!", "Product added!"
- Empty states: explain + offer an action — "Wala pang products. Mag-add na ng items sa inventory."

---

## 🖼️ Visual Hierarchy Rules

Every screen must have a clear **1-2-3 hierarchy**:

1. **Level 1 — Page purpose** (`text-xl font-bold` or `text-2xl`) — one per screen
2. **Level 2 — Section labels** (`text-base font-semibold`) — group related content
3. **Level 3 — Body / data** (`text-sm` or `text-base`) — actual content

**Color hierarchy for actions:**

- `bg-primary` (blue) — main CTA, one per screen
- `bg-green-600` — confirm payment / complete order
- `variant="outline"` — secondary actions
- `variant="ghost"` — tertiary / nav actions
- `variant="destructive"` — void, delete, cancel order

**Spacing system:**

- Page padding: `p-4` mobile · `p-6` desktop
- Card inner padding: `p-4` standard
- Between sections: `gap-4` or `space-y-4`
- Between items in a list: `gap-2` or `space-y-2`

---

## 🔄 State Management Patterns

### Server State (via Server Actions)

```ts
// In _actions/pos.action.ts
"use server";
export async function createOrder(data: CreateOrderDto) {
  // validate → call service → return result
}
```

### Client State (via Zustand)

```ts
// In store/pos.store.ts
// Cart items, UI state (selected category, search query, open modals)
// Never duplicate server data here — only UI-specific state
```

### Loading / Error Pattern (every data-fetching component)

```tsx
if (isLoading) return <SkeletonList />;
if (error) return <ErrorState message="Hindi ma-load. I-refresh ang page." />;
if (!data.length)
  return <EmptyState message="Walang laman." action={<AddButton />} />;
return <ActualContent data={data} />;
```

---

## 🏗️ Page Structure Template

Every `page.tsx` must follow this exact shell:

```tsx
// app/(protected)/pos/page.tsx
import { POSLayout } from "./_components/POSLayout";
import { ProductGrid } from "./_components/ProductGrid";
import { CartSheet } from "./_components/CartSheet";

export default function POSPage() {
  return (
    <POSLayout>
      <ProductGrid />
      <CartSheet />
    </POSLayout>
  );
}
```

All logic lives in `_components/`, `_services/`, `_actions/`, or `store/`. The `page.tsx` is only a composition shell.

---

## 📐 Spacing & Sizing Quick Reference

| Element                 | Mobile          | Desktop         |
| ----------------------- | --------------- | --------------- |
| Page padding            | `p-4`           | `p-6 lg:p-8`    |
| Card padding            | `p-4`           | `p-4 lg:p-5`    |
| Button height (primary) | `h-12` (48px)   | `h-10` (40px)   |
| Button height (confirm) | `h-14` (56px)   | `h-12` (48px)   |
| Input height            | `h-12` (48px)   | `h-10` (40px)   |
| Icon size (in buttons)  | `size-5` (20px) | `size-4` (16px) |
| Bottom nav height       | `h-16` (64px)   | —               |
| Bottom nav icon         | `size-6` (24px) | —               |
| Product card image      | `aspect-square` | `aspect-square` |
| Section gap             | `gap-4`         | `gap-6`         |

---

## ⚡ Performance Rules

- **Images:** use `next/image` with `sizes` prop. Product thumbnails: `sizes="(max-width:767px) 50vw, 25vw"`
- **Lists:** virtualize if > 50 items (use `react-window` or paginate server-side)
- **Search:** debounce input by 300ms before triggering query
- **Fonts:** load via `next/font` — no external font CDN calls
- **Animations:** `transition-all duration-150` for interactions · respect `prefers-reduced-motion`
- **Toasts:** max 1 toast visible at a time — dismiss previous before showing new
