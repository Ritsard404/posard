---
name: posard-workspace-enforcer
description: >
  Enforce strict POSARD workspace architecture with reuse-first implementation,
  minimal file changes, Prisma-driven contracts, and anti-duplication rules.
---

# Purpose
Maintain a scalable, consistent, and type-safe POSard codebase while minimizing redundancy, token usage, and unnecessary file creation.

# Preconditions
- Next.js App Router
- Prisma ORM
- TypeScript strict mode
- Zustand only when shared client state is truly needed

---

# Core Principles

## Single Source Of Truth
> Prisma schema = database truth  
> DTOs = data contract  
> Validators = input rules  
> Services = business logic  
> Actions = orchestration layer  
> UI = presentation only

No duplication across layers.

## Reuse-First Rule
- Reuse before create
- Modify before duplicate
- Inspect before implement
- Keep output minimal and targeted

Redundancy increases maintenance cost and complexity and should be avoided unless strictly necessary.

---

# Workspace Structure

## Feature Structure
Follow this layout:

```txt
app/(protected)/<feature>/
  page.tsx
  _components/
  _services/
    _dto/
    _mappers/
    _validators/
  _actions/
  store/            # optional
```

## Structure Rules
- `page.tsx` = composition only, no business logic
- `_components` = UI only
- `_services` = business logic and Prisma access
- `_actions` = server orchestration only
- `_dto` = pure types only
- `_mappers` = Prisma to DTO mapping only
- `_validators` = Zod schemas only
- `store` = optional and only for shared client state
- Do not create extra folders unless there is a clear architectural need

---

# Mandatory Agent Workflow (STRICT)

All implementation work must follow this sequence.

## Step 1: Inspect
Scan the codebase before writing code.

Identify existing:
- services
- DTOs
- mappers
- validators
- components
- hooks
- utilities

Also inspect:
- related feature folders
- `schema.prisma`
- nearby actions and report/service patterns

## Step 2: Plan
Provide a short plan before implementation:
- files to reuse
- files to modify
- files to create, if any

Do not write code yet.

## Step 3: Implement
- Modify only required files
- Do not regenerate full files unless necessary
- Do not duplicate logic
- Prefer targeted diffs over broad rewrites

## Step 4: Validate
Confirm:
- structure compliance
- no Prisma leakage outside services
- no raw server error exposure
- no duplicate logic or files
- type safety

---

# Anti-Duplication Rules (CRITICAL)

The agent must not:
- create duplicate services
- create duplicate DTOs or types
- create duplicate Zod schemas
- create duplicate Prisma queries when existing service logic can be extended
- create duplicate UI components
- copy-paste business logic across files
- recreate existing hooks or utilities

If similar logic exists:
- extend it
- refactor it
- or extract a shared helper

Do not create parallel implementations for the same concern.

---

# File Creation Rule

Before creating a new file:
1. Confirm no existing file already satisfies the requirement
2. Check related folders:
   - `_services`
   - `_components`
   - `_actions`
   - `_dto`
   - `_mappers`
   - `_validators`
   - `lib`
3. If a new file is still necessary, justify it in 1 to 2 lines

New files are allowed only when extending an existing file would clearly reduce clarity or violate layer boundaries.

---

# Prisma Rules (STRICT)

- Always inspect `schema.prisma` before coding
- Prisma types must not leak outside services
- Always map Prisma models to DTOs through a mapper layer before returning data upward
- Use `$transaction` for multi-step writes
- Inside a transaction, use `tx.*` only
- Never return raw Prisma models to UI or actions

## Enum Rules
- All enums must originate from Prisma schema or align directly with it
- Do not redefine enum meaning in UI-only types when a Prisma enum already exists

---

# Layer Rules

## Services
- Async only
- Explicit input and return types
- No imports from UI or actions
- Throw errors
- Do not format response payloads for the client

## Actions
- Must include `"use server"`
- Must validate input first
- Must wrap logic in `try/catch`
- Must return:

```ts
{ success: true } as const
```

or

```ts
{ success: false, error: string } as const
```

- Never expose raw server errors

## DTOs
- No Prisma imports
- Types only
- Use `interface` for object shapes
- Use `type` for unions and aliases

## Mappers
- Prisma to DTO transformation only
- No business logic beyond output shaping

## Validators
- Zod schemas only
- No Prisma queries
- No side effects

## UI Components
- Explicit client or server usage
- Fully typed props
- Presentation only
- Use Tailwind only
- Use `sonner` for toasts
- Use `lucide-react` for icons

## Zustand
- Use only when shared client state is needed
- Store DTO-safe shapes only
- Do not store raw server records

## Forms
- Use `react-hook-form`
- Use `zod`
- Validate before action call
- No uncontrolled inputs for managed form flows

---

# Error Handling Rules (CRITICAL)

## Client Safety
Do not expose:
- Prisma errors
- SQL or database errors
- stack traces
- internal exception messages
- framework or system errors

## Responsibility Split
- Services throw raw errors
- Actions catch and sanitize errors
- UI consumes only safe messages

## Required Action Pattern

```ts
try {
  // logic
  return { success: true } as const;
} catch (error) {
  console.error(error);

  return {
    success: false,
    error: "Something went wrong. Please try again.",
  } as const;
}
```

---

# Token Optimization Rules

To reduce token usage:
- do not output unchanged files
- do not rewrite entire modules without need
- only show changed functions or changed sections when explaining work
- prefer diff-style updates
- avoid verbose explanations unless requested
- keep plans short and implementation targeted

---

# Code Simplicity Rules

- Avoid unnecessary abstraction
- Avoid extra layers and extra files
- Prefer simple direct logic
- Remove unused code when safe
- Do not build generic infrastructure for one narrow use case unless it will clearly be reused

Simpler code reduces errors and maintenance cost.

---

# Naming Rules

- Components = `PascalCase.tsx`
- Services = `*.service.ts`
- Actions = `*.action.ts`
- DTOs = `*.dto.ts`
- Mappers = `*.mapper.ts`
- Validators = `*.schema.ts`
- Stores = `*.store.ts`

---

# Prompt Behavior Rules

- If the request is unclear, ask for clarification before coding
- If similar implementation exists, show the reuse strategy before rewriting
- If the task is large, break it into phases
- If the current approach would introduce duplication, stop and correct the approach first

---

# Optional Advanced Mode For Complex Features

Use this structure when the task is large:
1. Analysis
2. Reuse Mapping
3. Minimal Changes Plan
4. Implementation (diff-only)
5. Validation Checklist

---

# Required Response Format

At the end of every task, include:

## Summary
- Reused:
- Modified:
- Created:
- Removed duplicates:

## Notes
- Why new files were created, if any
- What redundancy was avoided

---

# Goal Outcome

- Zero redundant code
- Minimal file changes
- Faster execution
- Lower token usage
- Maintainable architecture
