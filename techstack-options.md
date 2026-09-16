# FinLITE Technology Stack Decision Guide

**Status:** Decision proposal; no implementation stack has been approved  
**Research date:** 2026-08-15  
**Project:** FinLITE: A Web-Based Financial Assistant System for the League of Information Technology Enthusiasts  
**Team:** Four third-year BSIT-31A students, ITE-SAD final-term case study  

## Executive recommendation

Choose **Option 1: Next.js 16 + Supabase PostgreSQL + Supabase Auth/Storage + AI SDK 6** unless the team is substantially stronger in PHP/Laravel. It best balances delivery speed, one-language development, relational data integrity, authentication, private file storage, AI tool calling, and a presentable modern interface.

Before committing, build the same small vertical slice in Option 1 and Option 2:

1. Sign in as two different roles.
2. Create an income or expense record.
3. Reject an unauthorized edit at both the application and database layers.
4. Show a filtered total calculated by PostgreSQL.
5. Ask the AI assistant for that total through a read-only tool.
6. Deploy the slice and document its actual cost, cold-start behavior, and setup difficulty.

Time-box each spike to one working session. Choose the stack that the whole team can explain and maintain, not the stack with the most fashionable components.

The closest alternative is **Option 2: Laravel 13 + Inertia + Vue 3 + PostgreSQL**. If at least two members already know PHP/Laravel better than TypeScript/React, move it to rank 1. Existing team skill levels were not documented, so the ranking cannot responsibly treat framework familiarity as known.

## What this guide is based on

The project sources currently establish the following:

- FinLITE replaces scattered paper records for LITE income and expenses.
- Intended users are club advisers, the president, treasurer, and auditor.
- Candidate functions include authentication, transaction recording and search, controlled corrections, discrepancy flags, reports, a permission-aware chatbot, and an audit trail.
- Data accuracy, access control, backups, recovery, usability, response time, and security logging are candidate non-functional requirements.
- The implementation architecture, exact permissions, report formats, discrepancy rules, AI data access, attachments, and hosting are not yet approved.
- Financial calculations must be deterministic; AI explanations must not become the authoritative ledger.

Project sources:

- [FinLITE Project Manager](https://app.notion.com/p/f9f27102528782e4bc3901caf670fc7c)
- [Project Context](https://app.notion.com/p/3bc271025287810288a3d70d387124fa)
- [Requirements & Scope](https://app.notion.com/p/3bc27102528781d38303d6d98eae58fb)
- [Architecture & Design](https://app.notion.com/p/3bc2710252878115942cd583bc054173)
- [Decision Log](https://app.notion.com/p/3bc27102528781679d1cef52623bb1d7)
- [Local Project Context](./Project%20Context.md)

## Corrections to the earlier generated proposal

The previous proposal was useful as a brainstorm, but it should not be adopted without these corrections:

- **Do not claim that double-entry bookkeeping is required.** The approved context currently describes income and expense records. Double-entry accounting is a valuable option only if the client and instructor require formal journals, accounts, debits, credits, and accounting statements.
- **Do not promise balance sheets, cash-flow statements, digital signatures, receipt OCR, RAG, or fixed approval flows yet.** These are unvalidated scope additions.
- **Do not describe four roles as a “strict four-tier RBAC.”** The users are known; their exact permissions are not.
- **Do not let an ORM or AI model calculate authoritative balances.** Use database transactions, constraints, and tested SQL/RPC functions. The AI may summarize the returned result.
- **Do not add a vector database just because the app has a chatbot.** Structured transaction questions are better handled by validated tool calls to parameterized queries. Add vector search only for unstructured policies or documents.
- **Do not treat free hosting as production-ready or permanent.** Supabase Free has no automatic backups and pauses inactive projects; Render Free databases expire; Railway is usage-priced after its trial; Vercel Hobby is restricted to personal, non-commercial use.
- **Do not start a new 2026 project on Next.js 14/15, Laravel 11, Nuxt 3, Spring Boot 3.3, Gemini 1.5, google-generativeai, ai/rsc, or middleware.ts.** Those references are stale for a greenfield build.
- **MongoDB is not “non-ACID.”** It supports transactions, but a relational schema is still a better default here because constraints, joins, audit reports, and reproducible aggregates map naturally to PostgreSQL.

## Evaluation method

Scores are comparative decision aids, not measurements. Each criterion is scored from 1 to 5 and weighted for FinLITE:

| Criterion | Weight | What it means for FinLITE |
|---|---:|---|
| Delivery feasibility | 25% | A four-person student team can finish and demonstrate the system |
| Data integrity and auditability | 20% | Relational constraints, transactions, migrations, and traceable changes |
| Security and authorization | 15% | Mature authentication, server-side enforcement, least privilege |
| Maintainability and learning | 15% | Clear conventions, documentation, testability, reasonable complexity |
| AI and reporting fit | 10% | Safe tool calling, streaming, exports, deterministic aggregation |
| Deployment and cost predictability | 10% | Practical demo deployment with understood limits and recovery |
| Academic explainability | 5% | Architecture is easy to document, defend, and map to SAD artifacts |

The scores assume equal starting familiarity. Apply these adjustments after the team skills check:

- Add 5 points to Laravel if two or more members have built a Laravel CRUD system.
- Add 5 points to Next.js if two or more members are comfortable with TypeScript and React.
- Add 5 points to Django/FastAPI if two or more members are comfortable with Python.
- Subtract 5 points from any option that only one member can run, debug, or deploy.
- Reject any option if the team cannot complete the vertical-slice spike together.

## Ranked comparison

| Rank | Combination | Score / 100 | Best reason to choose it | Main risk |
|---:|---|---:|---|---|
| 1 | Next.js 16 + Supabase PostgreSQL/Auth/Storage + AI SDK 6 | 91 | Fast, cohesive full-stack delivery with strong managed services | Next.js and RLS have important security concepts to learn |
| 2 | Laravel 13 + Inertia + Vue 3 + PostgreSQL | 88 | Mature monolith, excellent CRUD/auth conventions, easy academic explanation | PHP hosting and AI streaming need an early deployment spike |
| 3 | Django 6 + HTMX + PostgreSQL | 85 | Batteries-included auth/admin plus Python AI ecosystem | UI can feel less app-like unless designed carefully |
| 4 | React 19 + Vite 8 + FastAPI + PostgreSQL | 82 | Clear frontend/backend split and excellent API/AI tooling | Two runtimes, CORS, contracts, and deployments add coordination |
| 5 | React 19 + Vite 8 + Express 5 + Prisma 7 + PostgreSQL | 80 | Familiar JavaScript client-server architecture | More custom auth/security work than Options 1–3 |
| 6 | Nuxt 4 + Supabase PostgreSQL/Auth/Storage | 78 | Productive Vue full-stack development with a clean structure | Less likely to match existing course examples and team experience |
| 7 | ASP.NET Core 10 LTS + Blazor + EF Core + PostgreSQL | 76 | Strong typing, Identity, mature tooling, long support window | Higher ceremony and deployment learning cost |
| 8 | Svelte 5 + SvelteKit + Supabase PostgreSQL | 72 | Small codebase and fast UI development | Smaller local knowledge base and fewer course-aligned examples |
| 9 | Spring Boot 4.1 + React + PostgreSQL | 69 | Enterprise-grade security and transaction tooling | Too much setup and split-stack overhead for most four-person term teams |
| 10 | React 19 + Express 5 + MongoDB | 61 | Familiar MERN learning resources | Poorer fit for relational reporting and integrity constraints |

### Score detail

Each cell is a 1–5 assessment. The total applies the weights above: delivery 25%, data 20%, security 15%, maintainability 15%, AI/reporting 10%, deployment 10%, and academic explainability 5%.

| Option | Delivery | Data | Security | Maintainability | AI/reporting | Deployment | Academic | Weighted total |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 5 | 5 | 4 | 4 | 5 | 4 | 4 | 91 |
| 2 | 5 | 4 | 5 | 4 | 4 | 4 | 4 | 88 |
| 3 | 4 | 5 | 5 | 4 | 4 | 3 | 4 | 85 |
| 4 | 4 | 5 | 4 | 3 | 5 | 3 | 5 | 82 |
| 5 | 4 | 5 | 3 | 4 | 4 | 3 | 5 | 80 |
| 6 | 4 | 5 | 4 | 3 | 4 | 3 | 3 | 78 |
| 7 | 3 | 5 | 5 | 4 | 3 | 2 | 4 | 76 |
| 8 | 4 | 4 | 4 | 3 | 3 | 3 | 3 | 72 |
| 9 | 2 | 5 | 5 | 3 | 3 | 2 | 5 | 69 |
| 10 | 4 | 2 | 3 | 3 | 4 | 2 | 3 | 61 |

## Current version baseline

Use a lockfile and pin exact package versions when implementation starts. The table records the current stable major/minor lines verified on 2026-08-15; patches can change quickly.

| Technology | Verified current baseline | Important note |
|---|---|---|
| Next.js | 16.2.x | Next.js 16 renamed middleware.ts to proxy.ts; stay on the latest security patch |
| React | 19.2.x | React lists 19.2 as current; use the newest patched 19.2 release |
| Node.js | 24 LTS | Node 26 is Current, not LTS; production guidance favors LTS |
| Tailwind CSS | 4.3.x | Do not copy Tailwind 3 configuration blindly |
| Vite | 8.1.x | Vite 8 uses Rolldown; use a supported line |
| AI SDK | 6.x | Use AI SDK UI/Core, not experimental ai/rsc |
| Prisma ORM | 7.x | Requires ESM and a driver adapter for direct connections |
| Laravel | 13.x | Supports PHP 8.3–8.5 and receives security fixes through March 2028 |
| Django | 6.0.x | Supports Python 3.12–3.14; Django 5.2 remains the current LTS alternative |
| Nuxt | 4.5.x | Nuxt 4 is the current stable major; use its app/ structure |
| PostgreSQL | 18 | Hosting providers may expose an earlier supported major; provider support wins over novelty |
| .NET / ASP.NET Core | 10 LTS | Supported through November 2028; install current patches |
| Spring Boot | 4.1.x | Use a compatible supported Java LTS runtime |
| Express | 5.x | Express 5 is the current major and supports rejected-promise handling |

## Detailed options

### 1. Next.js 16 + Supabase PostgreSQL/Auth/Storage + AI SDK 6

**Recommended default**

**Components**

- UI: Next.js App Router, React 19.2, TypeScript, Tailwind CSS 4.3, shadcn/ui, Recharts.
- Server: Server Components for reads; Server Actions for form mutations; Route Handlers for AI streaming and file/report downloads.
- Data: Supabase-managed PostgreSQL, SQL migrations in version control, database functions for multi-step financial changes.
- Auth: Supabase Auth plus PostgreSQL Row-Level Security (RLS).
- Files: Private Supabase Storage bucket if supporting evidence is approved.
- AI: AI SDK 6 with a provider selected through configuration; read-only, schema-validated tools.
- Tests: Vitest, React Testing Library, Playwright, and database policy tests.

**Why it ranks first**

One TypeScript application reduces handoffs. Supabase supplies the services FinLITE is likely to need without the team building password storage, sessions, file storage, and database administration from scratch. PostgreSQL RLS can enforce authorization close to the data, while Next.js provides an effective presentation and server layer.

**Critical implementation rule**

RLS is not a substitute for server authorization, and hiding a button is not authorization. Every Server Action and Route Handler must verify the session and permission. Tables exposed through Supabase must have explicit RLS policies. Administrative service credentials must never reach the browser.

**Tradeoffs**

- RLS policies require deliberate testing; an incorrect policy can expose or block data.
- Next.js caching and server/client boundaries have a learning curve.
- Using Prisma on top of Supabase is optional, not automatic. Direct server connections often bypass user-scoped RLS and create two data-access models. For this project, begin with Supabase JS, SQL migrations, generated database types, and narrow RPC functions. Add an ORM only after a spike proves a clear benefit.
- Vercel is convenient, but deployment should remain portable to a Node server or another supported adapter.

**Best fit:** A team with reasonable TypeScript/React comfort that wants the shortest path to a polished web application.

### 2. Laravel 13 + Inertia + Vue 3 + PostgreSQL

**Recommended when PHP is the team’s strongest shared skill**

**Components**

- UI: Vue 3 through Inertia, Tailwind CSS, a maintained Vue component library.
- Server: Laravel 13 controllers, form requests, policies, service classes, queues only when actually needed.
- Data: PostgreSQL and Eloquent migrations/models.
- Auth: Laravel starter-kit authentication, policies/gates, server-side sessions.
- AI: Laravel 13 AI primitives or provider SDK behind a small application service; read-only tools for the first release.
- Reports: Server-rendered HTML/print view first; add PDF/Excel only after formats are approved.

**Advantages**

- A cohesive monolith is easy to diagram and defend.
- Laravel’s validation, migrations, policies, testing, and Eloquent conventions reduce custom infrastructure.
- Inertia provides an app-like UI without designing a separate public REST API.
- Laravel 13 has first-party AI-oriented capabilities, making the old claim that PHP is inherently unsuitable for AI integration outdated.

**Tradeoffs**

- The team must verify PHP 8.3+ and Laravel 13 support in the chosen host.
- Streaming AI responses and long-running report generation should be tested on the actual host early.
- Avoid adding Redis, queues, WebSockets, or a separate SPA unless a requirement demands them.

**Best fit:** A team and faculty environment already comfortable with PHP, MVC, and relational CRUD systems.

### 3. Django 6 + HTMX + PostgreSQL

**Components**

- UI: Django templates, HTMX for partial updates, Tailwind CSS; use Alpine.js only for small client interactions.
- Server: Django 6 views/services/forms.
- Data: PostgreSQL with Django ORM and migrations.
- Auth: Django users, groups, permissions, and server-side sessions.
- Operations: Django Admin for controlled administration, not as the end-user product.
- AI: Official provider SDK or a thin abstraction; deterministic Python services and SQL for figures.

**Advantages**

- Built-in authentication, CSRF protection, admin, migrations, forms, and permissions accelerate a secure monolith.
- Python is convenient for later anomaly-detection experiments and report processing.
- Django 6 adds built-in Content Security Policy support.

**Tradeoffs**

- Django 6 requires Python 3.12 or later; Django 5.2 LTS may be safer if a dependency is not ready.
- A template/HTMX application is simple, but the team must invest in visual design for a polished defense demo.
- Do not add Django REST Framework and React unless a real API consumer exists; doing so removes much of the monolith advantage.

**Best fit:** A Python-capable team that values built-in security and administration over a heavily client-rendered UI.

### 4. React 19 + Vite 8 + FastAPI + PostgreSQL

**Components**

- UI: React 19.2, Vite 8.1, TypeScript, Tailwind, TanStack Query.
- API: FastAPI, Pydantic, SQLAlchemy 2 or SQLModel, Alembic migrations.
- Data: PostgreSQL.
- Auth: Prefer a proven identity provider or well-reviewed server-session design; do not improvise long-lived JWT storage.
- AI/data: Provider SDK, typed tools, and Python libraries when analysis truly requires them.

**Advantages**

- The API contract is visible through OpenAPI and easy to test.
- Python is strong for AI and data analysis.
- Frontend and backend work can proceed independently after the contract is stable.

**Tradeoffs**

- Two languages, dependency managers, test suites, deployment targets, and error-reporting paths.
- CORS, cookies, CSRF, API versioning, and DTO synchronization must be designed.
- Dividing “two frontend/two backend” can create silos; every feature still needs end-to-end ownership.

**Best fit:** A team with existing Python and React experience that has a genuine need for Python-side analysis.

### 5. React 19 + Vite 8 + Express 5 + Prisma 7 + PostgreSQL

**Components**

- UI: React, Vite, TypeScript, Tailwind, TanStack Query.
- API: Express 5 with TypeScript and runtime schema validation.
- Data: PostgreSQL, Prisma 7, migrations, explicit database transactions.
- Runtime: Node.js 24 LTS.
- AI: AI SDK Core or a provider SDK in the Express service.

**Advantages**

- Familiar and explicit three-layer architecture.
- TypeScript on both sides and Prisma’s generated client improve developer experience.
- Express 5 now handles rejected async handlers more cleanly than Express 4.

**Tradeoffs**

- Prisma 7 requires ESM and a database driver adapter; older tutorials are misleading.
- Express is intentionally minimal, so the team owns secure sessions, CSRF protection, rate limiting, validation, logging, and policy organization.
- Separate frontend and backend deployments are more operational work than a monolith.

**Best fit:** A team already comfortable with REST APIs and willing to build the missing application structure carefully.

### 6. Nuxt 4 + Supabase PostgreSQL/Auth/Storage

**Components**

- UI/server: Nuxt 4.5, Vue 3, TypeScript, Nuxt UI 4, Nitro server routes.
- Data/auth/files: Supabase PostgreSQL, RLS, Auth, private Storage.
- AI: AI SDK or provider SDK from Nitro routes.

**Advantages**

- Nuxt 4 has a cleaner app/ structure and good TypeScript separation.
- Vue’s templates may be easier for some students than React’s client/server component model.
- It retains the managed-service benefits of Option 1.

**Tradeoffs**

- Nuxt module compatibility and deployment behavior must be tested against the selected host.
- The team may have fewer local examples and mentors than for React or Laravel.
- Authorization must still be enforced in Nitro routes and RLS, not just Vue navigation guards.

**Best fit:** A team with stronger Vue than React experience.

### 7. ASP.NET Core 10 LTS + Blazor + EF Core + PostgreSQL

**Components**

- UI/server: ASP.NET Core 10 and Blazor Web App.
- Data: EF Core with Npgsql/PostgreSQL.
- Auth: ASP.NET Core Identity, policies, and server-side authorization.
- AI: Provider SDK behind typed application services.
- Reports: Razor/HTML print views and server-generated exports as required.

**Advantages**

- Strong typing, mature authentication/authorization, dependency injection, logging, and testing.
- .NET 10 is an active LTS release through November 2028.
- A Blazor monolith avoids a separate JavaScript SPA and API.

**Tradeoffs**

- More framework concepts and project ceremony than Options 1–3.
- Confirm that all selected packages support .NET 10 and the PostgreSQL provider version.
- Hosting may be less convenient or more costly than PHP/Node/Python student options.

**Best fit:** A team already trained in C#/.NET.

### 8. Svelte 5 + SvelteKit + Supabase PostgreSQL

**Components**

- UI/server: Svelte 5, current stable SvelteKit, TypeScript, Tailwind.
- Data/auth/files: Supabase PostgreSQL, RLS, Auth, private Storage.
- AI: AI SDK’s Svelte support or provider SDK.

**Advantages**

- Concise component code and excellent performance.
- Full-stack routing keeps the system in one repository.
- Managed PostgreSQL still provides the required relational foundation.

**Tradeoffs**

- Svelte 5 changed its reactivity model; old tutorials may use legacy syntax.
- The team may have less access to faculty guidance or experienced reviewers.
- Package ecosystem and sample financial dashboards are smaller than React/Vue equivalents.

**Best fit:** A team already productive with Svelte 5, not a team choosing it only for novelty.

### 9. Spring Boot 4.1 + React + PostgreSQL

**Components**

- UI: React 19 and Vite 8, or Thymeleaf if reducing complexity.
- API/server: Spring Boot 4.1, Spring Security, Bean Validation.
- Data: Spring Data JPA, PostgreSQL, Flyway migrations.
- AI: Spring AI or provider SDK behind restricted services.

**Advantages**

- Excellent transaction management, authorization tooling, validation, and production diagnostics.
- Strong fit for a formally layered architecture and extensive automated tests.
- Highly defensible if the curriculum emphasizes Java enterprise development.

**Tradeoffs**

- React plus Spring creates two substantial stacks.
- Configuration, DTOs, mappings, security filters, and deployment consume time that could go to validated user workflows.
- “Banking-grade” is not a property gained merely by selecting Java or Spring.

**Best fit:** A Java-strong team with enough schedule for the added ceremony.

### 10. React 19 + Express 5 + MongoDB

**Components**

- UI: React and Vite.
- API: Express 5 and Node.js 24 LTS.
- Data: MongoDB with validation rules and transactions where required.
- Auth/AI: Same concerns as the Express option above.

**Advantages**

- Large tutorial ecosystem and flexible document modeling.
- Appropriate for document-shaped data and fast prototypes.

**Tradeoffs**

- FinLITE’s users, terms, categories, transactions, corrections, permissions, audit events, and reports are naturally relational.
- Foreign keys, cross-entity constraints, and reporting joins require more application discipline.
- The flexibility that speeds a prototype can permit inconsistent financial records.

**Best fit:** Only when the team has materially greater MongoDB expertise and proves integrity/reporting requirements in a spike. Otherwise choose PostgreSQL.

## Recommended architecture for Option 1

Use a **modular monolith**, not microservices. One deployable application and one relational database are enough for the current scope.

~~~text
Browser
  |
  v
Next.js application
  |- Server-rendered pages and forms
  |- Server Actions / Route Handlers
  |- centralized authorization and validation
  |- report views and AI tool boundary
  |
  v
Supabase
  |- Auth
  |- PostgreSQL + constraints + RLS + RPC functions
  |- private Storage, only if attachments are approved
  |
  v
AI provider
  |- receives the minimum necessary context
  |- can invoke only approved read-only tools in the MVP
  |- never becomes the system of record
~~~

### Data-integrity baseline

- Store money as PostgreSQL numeric, with an agreed precision and scale; never use JavaScript floating-point math for authoritative totals.
- Define check constraints for positive amounts and valid status transitions.
- Use database transactions for any multi-record operation.
- Prefer correction/void records and audit events over silent destructive edits.
- Record actor, timestamp, reason, and before/after values for sensitive changes.
- Calculate balances and report totals in tested SQL/database functions or trusted server services.
- Make term/year boundaries explicit in the data model.
- Design and test backup restoration before entering real organizational data.

Whether FinLITE uses a simple cashbook or double-entry ledger must be a signed scope decision. If formal financial statements are required, adopt a real chart of accounts and journal-entry model before implementation; do not retrofit it near the deadline.

### AI boundary

For the first usable release:

- Give the model no raw SQL tool and no unrestricted database connection.
- Expose narrow tools such as getBalance(termId), summarizeTransactions(filters), and listMissingEvidence(filters).
- Validate every tool input with a schema and enforce the current user’s permission inside the tool.
- Let PostgreSQL calculate totals; let the model explain already-calculated results.
- Return transaction identifiers or report filters so users can verify each answer.
- Make tools read-only. Any future write action must show a preview and require explicit human confirmation outside the model.
- Rate-limit requests, cap tool iterations, set timeouts, and log tool name/result metadata without unnecessarily retaining sensitive prompts.
- Treat receipt text and uploaded documents as untrusted input because they can contain prompt injection.
- Use RAG only for unstructured, approved documents. Do not embed all transactions merely to answer structured queries.

Google’s current Gemini free tier states that content may be used to improve its products, while its paid tier states otherwise. Use synthetic/redacted data during development, obtain organizational approval before sending real financial data to any provider, and document retention/training terms in the final provider decision.

### Reporting baseline

Implement reports in this order:

1. Reproducible on-screen report with filters and totals.
2. Print-friendly HTML using the same query and calculation service.
3. CSV export for transparent verification.
4. PDF or Excel only when the required format is approved.

Do not maintain separate calculations for dashboard cards, chatbot answers, and exports. All three should call the same tested financial query/service.

## Recommended development model

Use an **iterative and incremental model with one-week timeboxes and academic phase gates**. This is more accurate than claiming full Scrum unless the team truly has a Product Owner, Scrum Master accountabilities, Sprint events, a Product Backlog, and a usable Increment each Sprint.

### Working cycle

1. **Discover:** interview stakeholders, resolve scope questions, define acceptance criteria.
2. **Design:** update the use case, data model, permissions, threat model, and architecture decision records.
3. **Build a vertical slice:** UI, authorization, database, audit event, and test for one workflow.
4. **Verify:** peer review, automated tests, stakeholder demonstration, and evidence capture.
5. **Adapt:** update requirements and backlog based on feedback.

### Suggested increments

| Increment | Outcome and exit evidence |
|---|---|
| 0 — Decision spike | Selected stack, deployment proof, architecture decision record, initial risks |
| 1 — Foundation | Repository, CI, environments, authentication, role skeleton, migration workflow |
| 2 — Transaction flow | Create/view/search income and expenses with validation and authorization |
| 3 — Corrections and audit | Approved correction workflow, audit log, discrepancy definition and test cases |
| 4 — Reports | Approved report filters, deterministic totals, print/CSV export |
| 5 — AI assistance | Read-only tool calling, citations to records, permission tests, prompt-injection tests |
| 6 — Hardening and UAT | Backup/restore drill, security checklist, accessibility, performance, user acceptance |

Each increment should produce documentation needed for the course: updated diagrams, acceptance tests, decisions, and demonstration evidence. Integrate a small subset of NIST SSDF practices into every increment and use OWASP ASVS 5.0 as a verifiable security checklist.

## Recommended repository structure

This structure is for Option 1 and intentionally separates routing, reusable UI, server-only logic, database migrations, tests, and academic documentation.

~~~text
FinLITE/
|- src/
|  |- app/
|  |  |- (public)/
|  |  |  +- login/
|  |  |     +- page.tsx
|  |  |- (protected)/
|  |  |  |- layout.tsx
|  |  |  |- dashboard/
|  |  |  |- transactions/
|  |  |  |- discrepancies/
|  |  |  |- reports/
|  |  |  |- assistant/
|  |  |  +- settings/
|  |  |- api/
|  |  |  |- assistant/route.ts
|  |  |  +- reports/[format]/route.ts
|  |  |- error.tsx
|  |  |- global-error.tsx
|  |  |- globals.css
|  |  +- layout.tsx
|  |- components/
|  |  +- ui/
|  |- features/
|  |  |- auth/
|  |  |- transactions/
|  |  |- discrepancies/
|  |  |- reports/
|  |  +- assistant/
|  |- server/
|  |  |- auth/
|  |  |  |- authorize.ts
|  |  |  +- permissions.ts
|  |  |- db/
|  |  |  |- client.ts
|  |  |  +- generated.types.ts
|  |  |- modules/
|  |  |  |- transactions/
|  |  |  |- discrepancies/
|  |  |  |- reports/
|  |  |  +- audit/
|  |  |- ai/
|  |  |  |- model.ts
|  |  |  |- system-prompt.ts
|  |  |  |- tools/
|  |  |  +- guardrails.ts
|  |  +- validation/
|  |- lib/
|  |  |- currency.ts
|  |  |- dates.ts
|  |  +- result.ts
|  +- proxy.ts
|- supabase/
|  |- migrations/
|  |- tests/
|  |  |- constraints/
|  |  +- rls/
|  |- config.toml
|  +- seed.sql
|- tests/
|  |- unit/
|  |- integration/
|  +- e2e/
|- docs/
|  |- adr/
|  |- requirements/
|  |- diagrams/
|  |- security/
|  |- test-evidence/
|  +- runbooks/
|- public/
|- .env.example
|- .gitignore
|- AGENTS.md
|- eslint.config.mjs
|- next.config.ts
|- package.json
|- package-lock.json
|- README.md
+- tsconfig.json
~~~

### Structure rules

- Keep page.tsx, route.ts, and Server Actions thin; business rules belong in server modules.
- A feature folder owns presentation components and form schemas, not privileged database credentials.
- Keep all secrets server-only and document every environment variable in .env.example without values.
- Version database schema, RLS policies, triggers, and functions as reviewed migrations; do not rely on undocumented dashboard edits.
- Put each important choice in docs/adr/, including stack, authorization, ledger model, AI provider, hosting, and backup decisions.
- Use src/proxy.ts only for optimistic redirects or headers. Perform secure authorization again in the data-access/service layer.
- Co-locate focused unit tests where useful, but retain top-level integration and end-to-end suites for complete workflows.

## Hosting and cost reality

### Recommended student demo baseline

- Application: Vercel Hobby only if the project qualifies as personal/non-commercial under its current terms, or another Node-compatible host approved by the team.
- Data/Auth/Storage: Supabase Free for synthetic demo data.
- AI: a provider’s free tier only with synthetic/redacted information and strict spending/rate limits.
- Backups: scheduled manual logical database dumps stored outside Supabase; separately back up Storage objects.

### Before real organizational use

- Confirm who owns the accounts, repository, domain, billing, and recovery credentials.
- Move away from free tiers that lack automatic backups or reliable availability.
- Set a small, explicit monthly budget and provider spend caps where available.
- Test restore procedures and officer handover.
- Confirm AI data-use terms and obtain stakeholder approval.
- Do not store real receipts or sensitive financial records until access, retention, backup, and deletion policies are approved.

## Decision checklist

The team should answer these before the stack becomes “approved”:

- Which technologies can at least two members debug without AI assistance?
- Is the required accounting model a cashbook or double-entry ledger?
- Who can create, correct, approve, void, and audit each record?
- Which reports and export formats are actually required?
- Are attachments required, and what file types, sizes, and retention apply?
- What precisely counts as a discrepancy?
- May the chatbot receive real organizational data? Which fields?
- Is the AI read-only for the entire project?
- What is the real deadline and number of usable development weeks?
- What deployment budget and payment method are available?
- Who owns backups and performs the restore drill?
- What browsers and devices must be supported?

## Final recommendation

Adopt Option 1 provisionally, with these explicit constraints:

1. Modular monolith; no microservices.
2. PostgreSQL as the authoritative data store.
3. Supabase migrations and tested RLS policies in version control.
4. Central server authorization on every mutation and sensitive read.
5. Read-only AI tools for the MVP; database-computed figures only.
6. No RAG, OCR, double-entry ledger, receipt workflow, or extra report formats until approved requirements justify them.
7. One-week iterative increments with documented phase gates and test evidence.
8. A backup/restore plan before real data is entered.
9. Exact dependency versions locked at project initialization and maintained through automated update checks.
10. Re-rank Laravel to first if the vertical-slice spike demonstrates clearly better team delivery.

## Official references

### Current platforms and versions

- [Next.js releases](https://nextjs.org/blog)
- [Next.js 16 authentication and authorization](https://nextjs.org/docs/app/guides/authentication)
- [Next.js project organization](https://nextjs.org/docs/app/getting-started/project-structure)
- [Next.js Proxy convention](https://nextjs.org/docs/app/getting-started/proxy)
- [React versions](https://react.dev/versions)
- [Node.js release status](https://nodejs.org/en/about/previous-releases)
- [Tailwind CSS releases](https://tailwindcss.com/blog)
- [Vite releases and support](https://vite.dev/releases)
- [AI SDK 6 migration guide](https://ai-sdk.dev/docs/migration-guides/migration-guide-6-0)
- [AI SDK tool calling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling)
- [Prisma ORM 7 documentation](https://docs.prisma.io/docs/orm)
- [Laravel 13 release and support policy](https://laravel.com/docs/13.x/releases)
- [Django 6 release notes](https://docs.djangoproject.com/en/6.0/releases/6.0/)
- [Nuxt releases](https://nuxt.com/blog)
- [Express 5 migration guide](https://expressjs.com/en/guide/migrating-5/)
- [.NET support policy](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core)
- [Spring Boot releases](https://spring.io/projects/spring-boot/)
- [PostgreSQL current version](https://www.postgresql.org/about/press/faq/)

### Database, deployment, and AI constraints

- [Supabase Row-Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase local development and migrations](https://supabase.com/docs/guides/local-development/overview)
- [Supabase pricing and Free-plan limitations](https://supabase.com/pricing)
- [Supabase backup guidance](https://supabase.com/docs/guides/platform/backups)
- [Vercel Hobby plan](https://vercel.com/docs/plans/hobby)
- [Render Free limitations](https://render.com/docs/free)
- [Railway pricing](https://railway.com/pricing)
- [Gemini models](https://ai.google.dev/gemini-api/docs/models)
- [Gemini API pricing and data-use distinction](https://ai.google.dev/gemini-api/docs/pricing)

### Process and security

- [Official Scrum Guide](https://scrumguides.org/download.html)
- [NIST Secure Software Development Framework 1.1](https://www.nist.gov/publications/secure-software-development-framework-ssdf-version-11-recommendations-mitigating-risk)
- [OWASP ASVS 5.0](https://owasp.org/www-project-application-security-verification-standard/)
- [OWASP Top 10:2025](https://owasp.org/Top10/2025/0x00_2025-Introduction/)
- [OWASP Top 10 for LLM Applications 2025](https://owasp.org/www-project-top-10-for-large-language-model-applications/assets/PDF/OWASP-Top-10-for-LLMs-v2025.pdf)
