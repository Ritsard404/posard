---
trigger: always_on
---

# POSard UI rule

For UI work, follow `/AGENTS.md` and `.agents/skills/posard-ui/SKILL.md`.

- Design from 375px upward; verify 375, 768, and 1280 widths.
- Reuse shared shadcn-style components and existing Tailwind tokens.
- Keep primary mobile actions at least 48px and use readable labels.
- Provide loading, empty, error, disabled, and success states.
- Preserve supported dark mode and existing visual language.
- Tables and dynamic content may scroll when needed; never clip them silently.
- Avoid hover-only and icon-only actions.
- Update the operator guide and searchable Help Center for material workflow changes.

Do not run design-generation scripts automatically. Use them only when the task genuinely requires new visual exploration.
