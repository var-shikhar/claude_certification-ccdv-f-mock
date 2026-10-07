# Next.js coverage against roadmap.sh

Roadmap: [roadmap.sh/nextjs](https://roadmap.sh/nextjs) (94 topics, fetched 2026-10-07).
Bank: `content/exams/nextjs`, 494 questions, Next.js 16.3.

**Coverage: 71.4% before the audit, 98.2% after.** Coverage counts a covered topic as 1 and a partly covered topic as 0.5, out of the 84 in-scope topics.

| Status | Before | After |
|---|---|---|
| Covered | 54 | 81 |
| Partly covered | 12 | 3 |
| Missing | 18 | 0 |
| Out of scope | 10 | 10 |

A topic counts as covered when at least two solid questions, or one deep one, test it.
Topics marked out of scope are roadmap section intros, prerequisites taught in other
banks, or tools that aren't Next.js behaviour.

## Topics

| Topic | Status | Questions | Notes |
|---|---|---|---|
| analytics | Partly covered | NXT-PRF-017, NXT-NAV-043 | useReportWebVitals placement; prefetch skewing analytics |
| eslint | Partly covered | NXT-CFG-008 | `next lint` removal in Next.js 16 |
| why use app router | Partly covered | NXT-NAV-001, NXT-RTE-007 | Conceptual comparison |
| adapters | Covered (was missing) | NXT-GAP-025, NXT-GAP-026 | Deployment adapter hooks and NEXT_ADAPTER_PATH |
| api endpoints | Covered | NXT-RTH-001, NXT-RTH-004, NXT-RTH-011, NXT-RTH-019, NXT-RTH-023 | Route handlers |
| app | Covered | NXT-RTE-002, NXT-RTE-007, NXT-RTE-012, NXT-NAV-001 | App Router |
| caching | Covered | NXT-RTE-003, NXT-RTE-008, NXT-RND-007, NXT-RTH-045 | Roadmap topic is dynamic segments and caching of generated routes |
| caching data | Covered | NXT-CCH-002, NXT-CCH-003, NXT-CCH-017, NXT-CCH-018, NXT-CCH-042 |  |
| client | Covered (was partly covered) | NXT-RTH-019, NXT-RND-014, NXT-GAP-040, NXT-GAP-041 | Client-side data fetching |
| client rendered | Covered | NXT-SEC-012, NXT-PRF-029, NXT-RND-014, NXT-RND-034 | Client Components |
| composition | Covered | NXT-RTE-007, NXT-RTE-024, NXT-SEC-012, NXT-PRF-029 | Server/Client composition |
| create next app | Covered (was missing) | NXT-GAP-027, NXT-GAP-028 |  |
| csr | Covered (was partly covered) | NXT-RND-014, NXT-PRF-016, NXT-GAP-041 | Client-side rendering |
| css in js | Covered (was missing) | NXT-GAP-013, NXT-GAP-014 | Style registry with useServerInsertedHTML |
| css modules | Covered (was missing) | NXT-GAP-007, NXT-GAP-008 |  |
| custom server | Covered (was missing) | NXT-GAP-029 | Custom server vs standalone output |
| cypress | Covered (was missing) | NXT-GAP-004, NXT-GAP-006 |  |
| data fetching patterns | Covered (was partly covered) | NXT-RND-008, NXT-RTH-019, NXT-GAP-042, NXT-GAP-043, NXT-GAP-044 | Parallel, sequential and preloading |
| deployment options | Covered | NXT-CFG-013, NXT-CFG-017, NXT-CFG-023, NXT-CFG-025, NXT-CFG-027 | Node server, standalone, static export, multi-instance |
| docker container | Covered | NXT-CFG-020, NXT-CFG-025, NXT-CFG-033 |  |
| edge | Covered | NXT-CFG-039, NXT-RND-039, NXT-PRX-002, NXT-RTH-011 | Edge runtime and its Next.js 16 status |
| environment variables | Covered | NXT-CFG-001, NXT-CFG-002, NXT-CFG-009, NXT-CFG-010, NXT-CFG-012, NXT-SEC-022 |  |
| error states | Covered | NXT-RTE-005, NXT-RTE-006, NXT-RTE-010, NXT-RTE-036, NXT-NAV-025 | error.tsx, global-error, not-found |
| fetching locations | Covered | NXT-CCH-003, NXT-CCH-017, NXT-NAV-016, NXT-RND-008 | Server vs client fetching |
| fonts | Covered | NXT-PRF-002, NXT-PRF-015, NXT-PRF-043 | next/font |
| global css | Covered (was partly covered) | NXT-PRF-035, NXT-GAP-008, NXT-GAP-009 |  |
| handling sensitive data | Covered | NXT-SEC-004, NXT-SEC-006, NXT-SEC-022, NXT-SEC-032 | server-only, taint, DTOs |
| images | Covered | NXT-PRF-001, NXT-PRF-003, NXT-PRF-008, NXT-PRF-009, NXT-PRF-010, NXT-PRF-033 | next/image |
| instrumentation | Covered | NXT-CFG-018, NXT-CFG-044, NXT-GAP-018 | register and onRequestError |
| intercepting routes | Covered | NXT-RTE-027, NXT-RTE-028, NXT-RTE-029, NXT-RTE-040 |  |
| internationalization | Covered | NXT-CFG-032, NXT-PRX-035, NXT-RND-030 |  |
| jest | Covered (was missing) | NXT-GAP-001, NXT-GAP-002, NXT-GAP-006 |  |
| layouts and templates | Covered | NXT-RTE-007, NXT-RTE-024, NXT-RTE-013, NXT-RTE-019 |  |
| lazy loading | Covered | NXT-PRF-016, NXT-PRF-028, NXT-RND-014, NXT-RND-034 | next/dynamic |
| loading and streaming | Covered | NXT-NAV-004, NXT-NAV-011, NXT-NAV-016, NXT-PRF-026, NXT-RND-036 |  |
| markdown and mdx | Covered (was missing) | NXT-GAP-015, NXT-GAP-016, NXT-GAP-017 | @next/mdx |
| memoization in fetch | Covered | NXT-CCH-003, NXT-CCH-018, NXT-CCH-028, NXT-SEC-033 |  |
| memory usage | Covered (was missing) | NXT-GAP-030, NXT-GAP-031 | Build memory diagnostics |
| metadata | Covered | NXT-PRF-007, NXT-PRF-014, NXT-PRF-019, NXT-PRF-024, NXT-PRF-025 | Metadata API, OG images |
| middleware | Covered | NXT-PRX-002, NXT-PRX-003, NXT-PRX-008, NXT-PRX-012, NXT-PRX-043 | Proxy (middleware) in Next.js 16 |
| nextjs routing basics | Covered | NXT-RTE-002, NXT-RTE-003, NXT-RTE-004, NXT-RTE-012 |  |
| nodejs server | Covered | NXT-CFG-013, NXT-CFG-033, NXT-RND-036 | next start and the Node.js server |
| opentelemetry | Covered (was missing) | NXT-GAP-018, NXT-GAP-019 |  |
| package bundling | Covered | NXT-CFG-027, NXT-CFG-028, NXT-CFG-030, NXT-PRF-028 |  |
| pages | Covered (was partly covered) | NXT-PRX-022, NXT-PRX-042, NXT-GAP-034, NXT-GAP-035, NXT-GAP-036, NXT-GAP-037, NXT-GAP-038, NXT-GAP-039 | Pages Router data fetching, _app, _document |
| parallel routes | Covered | NXT-RTE-001, NXT-RTE-006, NXT-RTE-018, NXT-RTE-025, NXT-RTE-026 |  |
| parallel vs sequential | Covered (was partly covered) | NXT-RND-008, NXT-GAP-042, NXT-GAP-043 |  |
| playwright | Covered (was missing) | NXT-GAP-003, NXT-GAP-006 |  |
| preloading data | Covered (was missing) | NXT-GAP-044 | Preload pattern with React.cache |
| preparing for production | Covered (was missing) | NXT-GAP-024 | Production checklist |
| react cache | Covered | NXT-CCH-028, NXT-CCH-030, NXT-SEC-037 |  |
| reditects | Covered | NXT-PRX-013, NXT-PRX-017, NXT-NAV-004, NXT-SEC-024, NXT-ACT-020 | Redirects (roadmap slug has a typo) |
| rendering pages | Covered | NXT-RND-004, NXT-RND-005, NXT-RND-006, NXT-RND-018 |  |
| rendering strategies | Covered | NXT-RND-004, NXT-RND-009, NXT-RND-024, NXT-CCH-002 |  |
| revalidating cached data | Covered | NXT-CCH-004, NXT-CCH-005, NXT-CCH-012, NXT-CCH-014, NXT-CCH-015 |  |
| revalidation errors | Covered | NXT-RND-028, NXT-CCH-045 | ISR regeneration failures |
| route matcher | Covered | NXT-PRX-008, NXT-PRX-009, NXT-PRX-010, NXT-PRX-011, NXT-PRX-018 |  |
| routing patterns | Covered | NXT-RTE-003, NXT-RTE-008, NXT-RTE-013, NXT-NAV-031 | Dynamic, catch-all and group segments |
| routing terminology | Covered | NXT-RTE-002, NXT-RTE-004, NXT-NAV-017 |  |
| runtimes and types | Covered | NXT-CFG-039, NXT-RND-039, NXT-RTH-011 | Node.js vs edge runtimes |
| sass | Covered (was missing) | NXT-GAP-011, NXT-GAP-012 |  |
| scripts | Covered | NXT-PRF-004, NXT-PRF-006, NXT-PRF-018, NXT-PRF-036 | next/script |
| server | Covered | NXT-CCH-003, NXT-RND-008, NXT-NAV-016 | Server-side data fetching |
| server actions | Covered | NXT-ACT-003, NXT-ACT-012, NXT-ACT-017, NXT-ACT-020, NXT-ACT-036 |  |
| server rendered | Covered | NXT-SEC-012, NXT-CCH-002, NXT-RND-004 | Server Components |
| setting headers | Covered | NXT-RTH-004, NXT-RTH-015, NXT-RTH-026, NXT-PRX-014 |  |
| setting things up | Covered | NXT-CFG-003, NXT-CFG-005, NXT-CFG-029, NXT-GAP-032 | Configuration, TypeScript, env |
| spa | Covered (was partly covered) | NXT-NAV-022, NXT-NAV-027, NXT-GAP-040, NXT-GAP-041 | SPA patterns, shallow routing |
| spa vs ssr | Covered (was partly covered) | NXT-NAV-022, NXT-GAP-041 |  |
| ssg | Covered | NXT-RND-004, NXT-RND-005, NXT-RND-006, NXT-RND-007, NXT-CFG-021, NXT-GAP-034, NXT-GAP-039 |  |
| ssr | Covered | NXT-RND-013, NXT-RND-024, NXT-RND-036, NXT-GAP-035 |  |
| static assets | Covered | NXT-PRF-007, NXT-PRF-033 | public folder |
| static export | Covered | NXT-CFG-004, NXT-CFG-017, NXT-CFG-021, NXT-RTE-039 | output: export |
| static vs dynamic | Covered | NXT-RND-004, NXT-RND-013, NXT-SEC-020, NXT-GAP-039 |  |
| streaming | Covered | NXT-NAV-016, NXT-PRF-026, NXT-RND-036, NXT-CCH-018 |  |
| structuring routes | Covered | NXT-RTE-002, NXT-RTE-004, NXT-RTE-043, NXT-PRX-003 | Private folders, groups, src/ |
| tailwind css | Covered (was missing) | NXT-GAP-009, NXT-GAP-010 |  |
| third party libraries | Covered (was missing) | NXT-GAP-022, NXT-GAP-023 | @next/third-parties |
| types of routers | Covered | NXT-NAV-001, NXT-NAV-002, NXT-NAV-003, NXT-RTE-043, NXT-GAP-036 | App Router vs Pages Router |
| typescript | Covered (was partly covered) | NXT-CFG-029, NXT-RTH-043, NXT-GAP-032, NXT-GAP-033 | next-env.d.ts, typed routes, build type check |
| use cases | Covered | NXT-PRX-013, NXT-PRX-035, NXT-PRX-043, NXT-SEC-020 | Middleware use cases |
| using cookies | Covered | NXT-SEC-001, NXT-CCH-010, NXT-CCH-021, NXT-ACT-020 |  |
| videos | Covered (was missing) | NXT-GAP-020, NXT-GAP-021 |  |
| vitest | Covered (was missing) | NXT-GAP-005, NXT-GAP-006 |  |
| introduction | Out of scope | — | Roadmap section intro |
| javascript basics | Out of scope | — | Prerequisite; covered by the JavaScript bank |
| nextjs | Out of scope | — | Roadmap root node |
| nodejs | Out of scope | — | Prerequisite; covered by the Node.js bank |
| prettier | Out of scope | — | Generic formatter, not Next.js behaviour |
| react frameworks | Out of scope | — | Ecosystem overview |
| remix | Out of scope | — | Another framework |
| why frontend frameworks | Out of scope | — | Ecosystem overview |
| why nextjs | Out of scope | — | Marketing overview |
| why react | Out of scope | — | Prerequisite |

## Gaps filled

The audit added 44 questions in `questions/roadmap-gaps.json` (`NXT-GAP-001` to `NXT-GAP-044`).
They cover testing (Jest, Vitest, Playwright, Cypress), styling (CSS Modules, global CSS, Tailwind, Sass, CSS-in-JS),
MDX, OpenTelemetry, videos, third-party libraries, the production checklist, adapters,
create-next-app, custom servers, build memory diagnostics, TypeScript tooling, the
Pages Router, SPA patterns, and parallel and preloaded data fetching. Every claim is
based on the Next.js 16.3.6 docs bundled with the project.

Still partly covered: ESLint (only the `next lint` removal) and two conceptual topics
(analytics, why the App Router), which are hard to test well with multiple choice.
