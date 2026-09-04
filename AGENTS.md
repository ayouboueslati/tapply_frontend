<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
<!-- BEGIN:tapply-project-rules -->
## Tapply Frontend Rules

Applies to work in this folder. Shared product context and git workflow live in `AGENTS.md` and `AGENT_PLAYBOOK.md` at the `tapply/` workspace root — read those too.

### Stack
- Next.js (App Router), React 19, Tailwind CSS, Clerk for auth.
- Route groups: `(admin)` for the staff dashboard, `(public)` for tap-token pages. Keep new routes in the correct group.

### Conventions
- No `any` types, including in `catch` blocks. Use `catch (error) { const err = error as Error }` or a proper type guard.
- No empty `catch` blocks. Every caught error must be logged, surfaced to the user (toast/error state), or explicitly commented on why it's intentionally ignored.
- No `console.log` left in committed code.
- Follow existing component structure/naming in `src/components/`.

### Known trouble spots (from the audit — don't reintroduce these)
- `src/app/(public)/tap/[token]/page.tsx` — had empty catch blocks; this is the public submission flow, silent failures here directly hurt users.
- `src/components/dashboard/TeamSection.tsx`, `SubmissionDetailPanel.tsx` — same issue, now fixed.
- `src/app/(admin)/sign-in/page.tsx` — had a stray `console.log` of auth state; never log auth/session objects.

### Testing
- No test framework yet (Phase 1 task in the roadmap). Once Vitest/Playwright are added, every new component/flow needs at least one test.
- Until then, note in your PR description what you manually verified.

### Git workflow
- Feature branch per task, commit after every logical unit (not one dump at the end), Conventional Commits format, push after every commit or every 2-3.
<!-- END:tapply-project-rules -->