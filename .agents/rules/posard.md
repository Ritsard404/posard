---
trigger: always_on
---

# Posard Workspace Rules

> Strict conventions for feature development in this Next.js POS system.
> All contributors must follow these rules. No exceptions without a documented reason.

---

## 1. Feature Folder Structure

Every feature lives under `app/(protected)/<feature>/` and must follow this layout exactly:

```
app/(protected)/<feature>/
├── page.tsx                  # Route entry point only — no logic
├── _components/              # UI components scoped to this feature
│   ├── FeatureWidget.tsx
│   └── ...
├── _services/                # Business logic and data access
│   ├── <feature>.service.ts  # Service class or exported functions
│   └── _dto/                 # Data Transfer Object types
│       └── <feature>.dto.ts
├── _actions/                 # Next.js Server Actions
│   └── <feature>.action.ts
└── store/                    # Zustand store (only if client state is needed)
    └── <feature>.store.ts
```

### Rules

- `page.tsx` must import from `_components/` only — zero business logic inline.
- `_components/` must not import from `_actions/` directly; go through a hook or pass via props.
- `_services/` is the **only** layer that touches Prisma. Actions call services; components never call Prisma.
- `_dto/` holds plain TypeScript types/interfaces. No Prisma imports allowed inside `_dto/`.
- `store/` is optional. Only create it when genuinely shared client state is needed across multiple components in the same feature.
- Never create a folder at the feature root that is not in the list above.

---

## 2. Prisma & Schema Rules

- Always check `prisma/schema.prisma` before writing a service. Use the actual field names — no guessing.
- Use `prisma.$transaction(async (tx) => { ... })` for any write that touches more than one table.
- Inside a transaction callback, use `tx.*` exclusively. Never call a service function that uses the top-level `prisma` client from inside `$transaction`.
- Never expose a raw Prisma model type across layer boundaries. Map it to a DTO before returning from a service.
- Use `findUnique` when querying by a unique/primary key. Use `findFirst` only when no unique constraint exists.

```typescript
// ✅ Correct — uses tx inside transaction
await prisma.$transaction(async (tx) => {
  await tx.order.update({ where: { id }, data: { status: "PAID" } });
  await tx.payment.create({ data: { orderId: id, amount } });
});

// ❌ Wrong — calls service (which uses top-level prisma) inside transaction
await prisma.$transaction(async (tx) => {
  await orderService.markPaid(id); // orderService uses `prisma`, not `tx`
});
```

---

## 3. Server Actions

- File name: `<feature>.action.ts` inside `_actions/`.
- Every action must be marked `"use server"` at the top of the file.
- Return type must always be a **discriminated union**:

```typescript
Promise<{ success: true; data?: T } | { success: false; error: string }>;
```

- Use `as const` on boolean literals to keep the union narrow:

```typescript
return { success: true as const };
return { success: false as const, error: "Something went wrong" };
```

- Wrap the entire body in `try/catch`. The `catch` block must always return `{ success: false as const, error: ... }`.
- Validate all inputs at the top of the action before touching the database.
- Never return raw Prisma errors to the client. Map them to human-readable messages.

```typescript
"use server";

export async function exampleAction(
  input: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    if (!input) return { success: false as const, error: "Input is required" };

    await exampleService.doSomething(input);

    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Internal error",
    };
  }
}
```

---

## 4. Service Layer

- File name: `<feature>.service.ts` inside `_services/`.
- Export as a plain object or class instance (e.g. `export const featureService = { ... }`).
- Services are **async only** — no synchronous database calls.
- Every public method must have explicit parameter types and an explicit return type.
- Services must never import from `_actions/` or `_components/`.
- Throw typed errors with descriptive messages; let the action layer catch and format them.

---

## 5. DTOs

- File name: `<feature>.dto.ts` inside `_services/_dto/`.
- Use TypeScript `interface` for object shapes, `type` for unions and aliases.
- No runtime logic — DTOs are type declarations only.
- No Prisma imports. Derive field names manually from the schema.

```typescript
// ✅
export interface CreateOrderDto {
  companyId: string;
  items: OrderItemDto[];
  totalAmount: number;
}

// ❌ — Prisma type leaked into DTO layer
import type { Order } from "@prisma/client";
export type OrderDto = Order;
```

---

## 6. State Management (Zustand)

- Only create a store when state must be shared across **two or more components** in the same feature.
- File name: `<feature>.store.ts` inside `store/`.
- Use Zustand with the `create` function. Always type the store interface explicitly.
- Never store server data (Prisma models, raw API responses) directly in Zustand. Map to DTOs first.
- Do not use Zustand for form state — use `react-hook-form` instead.

```typescript
import { create } from "zustand";

interface CartStore {
  items: CartItemDto[];
  addItem: (item: CartItemDto) => void;
  clear: () => void;
}

export const useCartStore = create<CartStore>((set) => ({
  items: [],
  addItem: (item) => set((s) => ({ items: [...s.items, item] })),
  clear: () => set({ items: [] }),
}));
```

---

## 7. Forms

- Always use `react-hook-form` + `zod` for forms. No uncontrolled inputs.
- Define a Zod schema in the component file or in a dedicated `<feature>.schema.ts` at the feature root.
- Use `@hookform/resolvers/zod` as the resolver.
- Never pass raw form data to an action — validate with `schema.parse()` or rely on the resolver before submission.

```typescript
const schema = z.object({
  amount: z.number().positive("Amount must be greater than 0"),
  pin: z.string().min(4, "PIN must be at least 4 characters"),
});
```

---

## 8. Component Rules

- Components are **client or server**, never ambiguous. Add `"use client"` only when you need browser APIs, event handlers, or hooks.
- Props must be fully typed — no `any`, no implicit `{}`.
- Use `sonner` for toast notifications. Never use `alert()` or `console.log` for user feedback.
- Use `lucide-react` for icons. No other icon libraries.
- Styling: Tailwind utility classes only. No inline `style={{}}` except for dynamic values that cannot be expressed as classes.

---

## 9. Approved Libraries

Use only what is in `package.json`. Do not install new dependencies without team discussion.

| Purpose          | Library                                                             |
| ---------------- | ------------------------------------------------------------------- |
| Framework        | `next` (latest)                                                     |
| Database ORM     | `@prisma/client`                                                    |
| Auth / Session   | `@supabase/ssr`, `@supabase/supabase-js`                            |
| Forms            | `react-hook-form` + `@hookform/resolvers`                           |
| Validation       | `zod`                                                               |
| State management | `zustand`                                                           |
| UI primitives    | `@radix-ui/*`, `radix-ui`                                           |
| Styling          | `tailwindcss`, `clsx`, `tailwind-merge`, `class-variance-authority` |
| Icons            | `lucide-react`                                                      |
| Toasts           | `sonner`                                                            |
| Theming          | `next-themes`                                                       |
| DB driver        | `pg`, `@prisma/adapter-pg`                                          |

---

## 10. TypeScript Rules

- `strict: true` is assumed. Never use `@ts-ignore` or `@ts-expect-error` to silence errors — fix them.
- No `any` types. Use `unknown` and narrow with type guards if the shape is truly unknown.
- Use discriminated unions for all action return types (see Section 3).
- Use `as const` to narrow literal types instead of casting.
- Prefer `interface` for object shapes you may extend; prefer `type` for unions, intersections, and aliases.

---

## 11. File & Naming Conventions

| Item       | Convention                | Example              |
| ---------- | ------------------------- | -------------------- |
| Components | PascalCase                | `OrderCard.tsx`      |
| Services   | camelCase + `.service.ts` | `order.service.ts`   |
| Actions    | camelCase + `.action.ts`  | `order.action.ts`    |
| DTOs       | camelCase + `.dto.ts`     | `order.dto.ts`       |
| Stores     | camelCase + `.store.ts`   | `cart.store.ts`      |
| Schemas    | camelCase + `.schema.ts`  | `order.schema.ts`    |
| Hooks      | `use` prefix + PascalCase | `useOrderSummary.ts` |

- No default exports from services, actions, or stores. Named exports only.
- Default exports are allowed only in `page.tsx` and component files (Next.js convention).

---

## 12. New Feature Checklist

Before submitting a PR for a new feature, verify:

- [ ] Folder structure matches Section 1 exactly
- [ ] Prisma schema reviewed before writing any service method
- [ ] All actions return the discriminated union with `as const`
- [ ] No Prisma types leak outside `_services/`
- [ ] Multi-table writes use `$transaction` with `tx.*` throughout
- [ ] Forms use `react-hook-form` + `zod`
- [ ] No new `npm` packages added without discussion
- [ ] No `any`, no `@ts-ignore`
- [ ] `"use client"` / `"use server"` directives are present where required
