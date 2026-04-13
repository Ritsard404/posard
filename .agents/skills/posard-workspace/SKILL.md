---
name: posard-workspace-enforcer
description: >
  Enforce strict POSARD workspace architecture including feature-based structure,
  Prisma usage, service patterns, actions, DTOs, and TypeScript safety.
---

# Purpose
Maintain a scalable, consistent, and type-safe codebase for the POS system.

# Preconditions
- Next.js App Router
- Prisma ORM
- TypeScript strict mode
- Zustand (optional per feature)

---

# Core Principle
> Prisma Schema = Source of Truth  
All types, enums, and constraints MUST originate or align with Prisma.

---


# Rules

## Folder Structure
- Must follow:

app/(protected)/<feature>/
- page.tsx (no logic)
- _components/
- _services/
  - _dto/
  - _mappers/ (NEW: Prisma → DTO mapping)
  - _validators/ (NEW: Zod schemas)
- _actions/
- store/ (optional)

- No extra folders allowed

---

## Layer Separation
- page.tsx → UI composition only
- components → UI only (no business logic)
- services → business logic + Prisma access
- actions → server orchestration
- DTOs → pure types
- mappers → Prisma → DTO transformation ONLY
- validators → Zod schemas ONLY

---

## Prisma Rules (STRICT)
- Always inspect `schema.prisma` before coding
- Prisma types MUST NOT leak outside services
- Always map Prisma → DTO via mapper layer
- Use `$transaction` for multi-operations
- Inside transaction → use `tx.*` only
- Never return raw Prisma model

---

## Enum Rules (CRITICAL)

### 1. Source of Truth
- All enums MUST come from Prisma schema

Example:
```prisma
enum VatType {
  VATABLE
  ZERO_RATED
  EXEMPT
}

---

## Actions Rules
- Must include `"use server"`
- Must return:

{ success: true } OR { success: false; error: string }

- Use `as const`
- Wrap in try/catch
- Validate input first
- Never expose raw errors

---

## Service Rules
- Async only
- Explicit types (input + return)
- No imports from UI or actions
- Throw errors, do not handle response formatting

---

## DTO Rules
- No Prisma imports
- Types only (no logic)
- Use interface for objects
- Use type for unions

---

## Zustand Rules
- Only if shared state is needed
- No raw server data
- Use DTOs only

---

## Forms Rules
- Must use:
  - react-hook-form
  - zod
- Validate before action call
- No uncontrolled inputs

---

## Component Rules
- Explicit client/server usage
- Fully typed props
- Use:
  - sonner (toast)
  - lucide-react (icons)
- Tailwind only

---

## TypeScript Rules
- No `any`
- No `@ts-ignore`
- Use discriminated unions
- Prefer strict typing always

---

## Naming Rules
- Components → PascalCase
- Services → `.service.ts`
- Actions → `.action.ts`
- DTOs → `.dto.ts`
- Stores → `.store.ts

---

# Workflow

## Step 1: Analyze Feature
- Identify feature scope
- Check existing structure
- Review Prisma schema

## Step 2: Plan Files
- Define:
  - components
  - services
  - DTOs
  - actions
  - store (if needed)

## Step 3: Implement
- Start with service
- Create DTOs
- Add actions
- Build components

## Step 4: Validate
- Check structure compliance
- Ensure no Prisma leaks
- Validate types
- Ensure no duplication

---

# Output Format
- Feature-based structure
- Strict typing
- Clean separation of concerns
- No redundant files