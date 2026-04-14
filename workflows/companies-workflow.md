---
name: company-feature-workflow
description: >
  Implement and maintain the Company feature for manager and admin roles.
  Follow existing Prisma schema, current implementation patterns, and feature structure.
  Apply role-based access, terminal request flow, terminal-based subscriptions,
  proper detail views, and clear back navigation.
---

# Company Feature Workflow

## Purpose
Enhance the Company feature so it supports both **Manager** and **Admin** access with clear role-based behavior, aligned with the existing schema and current implementation.

Do not invent a separate architecture if the schema and current implementation already define the flow. Always inspect and extend what already exists.

---

# Core Rule

Before making any change:

1. Read the existing **Prisma schema**
2. Read the existing **Company-related implementation**
3. Reuse existing DTOs, actions, services, UI patterns, and route structure where possible
4. Extend the current flow instead of creating duplicate files or redundant logic
5. Keep the implementation type-safe and role-aware

---

# Access Scope

Only these roles can access this feature:

- **Admin**
- **Manager**

If the current user is not Admin or Manager:
- deny access
- redirect appropriately based on the existing auth and access-control implementation

---

# Feature Goals

## Manager Side
Manager company page must allow the manager to:

- view their own company information
- update company information if already implemented, do not rebuild unnecessarily
- view company terminals
- request a new terminal to the admin

## Admin Side
Admin company page must allow the admin to:

- view all companies
- search companies
- click a company row to open its full detail view
- view and manage:
  - company terminals
  - company settings
  - company subscriptions

Admin can update those sections using the existing structure and schema rules.

---

# Subscription Rule

Subscription is **per terminal**, not just per company.

That means:

- each terminal may have its own subscription record or subscription state
- subscription options must support:
  - monthly
  - quarterly
  - annually

When implementing, always model the UI and service logic around **terminal-based subscription handling**, based on the schema and current relations.

Do not simplify this into one company-wide subscription unless the schema explicitly does that.

---

# Required Implementation Behavior

## 1. Manager Company Page

### Manager can view:
- company profile/details
- company terminals list
- terminal request action/status if applicable

### Manager can do:
- update company info using the existing update implementation
- request additional terminal(s) to admin

### Manager must not do:
- directly manage subscription records intended for admin control
- edit terminal records beyond what current permissions allow
- access other companies

---

## 2. Admin Companies Page

### Admin can view:
- all companies
- searchable company table/list

### On company row click:
open a company detail view that contains sections such as:

- Company Information
- Terminals
- Settings
- Subscription

This detail view must be organized clearly and should follow existing component patterns.

---

## 3. Admin Detail Management

Inside the selected company detail page, admin must be able to update:

### Terminals
Examples:
- terminal status
- terminal assignment or availability
- terminal-related configuration if present in schema

### Settings
Examples:
- company-level configurable settings
- feature toggles or operational preferences if already modeled

### Subscription
Examples:
- plan duration per terminal
- monthly / quarterly / annually
- activation, expiration, renewal, and status if supported by schema

Always validate against schema relations before implementation.

---

# Back Navigation Requirement

Implement back navigation properly.

## Expected behavior
- from company detail view, user can go back to company list
- from nested sections, user can still return cleanly to the previous logical screen
- avoid broken history behavior
- avoid forcing full page reload when not needed

## Rules
- use the existing app router/navigation pattern already used in the codebase
- back navigation must be visible and intuitive
- label clearly, such as:
  - Back to Companies
  - Back to Company Details
- do not rely only on browser back if a stable route-based back action is more appropriate

Prefer predictable route navigation over fragile history-only navigation.

---