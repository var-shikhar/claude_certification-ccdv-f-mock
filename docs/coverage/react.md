# React coverage against roadmap.sh

Roadmap: [roadmap.sh/react](https://roadmap.sh/react) (83 topic files, 81 unique topics; "React Router" and "useState" appear twice). Audited 2026-10-07 against the `react` bank.

Coverage counts `covered` as 1 and `partial` as 0.5, over in-scope topics.

| | In scope | Covered | Partial | Missing | Coverage |
|---|---|---|---|---|---|
| Before the audit | 78 | 39 | 5 | 34 | 53% |
| After filling gaps | 78 | 64 | 14 | 0 | 91% |

Statuses: **covered** means at least two solid questions, or one deep one; **partial** means the topic is touched but not tested in depth; **out of scope** means the topic is a niche alternative to something already covered.

The bank already covered every core React concept (hooks, rendering, effects, Suspense, Server Components, state management, testing). The gaps were in the ecosystem: TypeScript, routing, styling, animation, build tools, end-to-end testing, data-fetching libraries and React Native.

## Topics

| Topic | Status | Questions | Notes |
|---|---|---|---|
| Axios | partial (was missing) | RCT-GAP-028 |  |
| Chakra Ui | partial (was missing) | RCT-GAP-020 |  |
| Css Modules | partial (was missing) | RCT-GAP-015 |  |
| Cypress | partial (was missing) | RCT-GAP-027 |  |
| Formik | partial (was missing) | RCT-GAP-033 |  |
| Jest | partial (was missing) | RCT-GAP-025 |  |
| Material Ui | partial (was missing) | RCT-GAP-020 |  |
| Panda Css | partial (was missing) | RCT-GAP-017 | Covered as a zero-runtime CSS option. |
| React Aria | partial (was missing) | RCT-GAP-020 |  |
| React Spring | partial (was missing) | RCT-GAP-023 |  |
| Relay | partial (was missing) | RCT-GAP-031 |  |
| Shadcn Ui | partial (was missing) | RCT-GAP-018 |  |
| Tanstack Router | partial (was missing) | RCT-GAP-014 |  |
| Urql | partial (was missing) | RCT-GAP-031 |  |
| Animation | covered (was missing) | RCT-GAP-021, RCT-GAP-022, RCT-GAP-023, RCT-GAP-024 |  |
| Api Calls | covered | RCT-EFF-016, RCT-HKS-040, RCT-STM-010 |  |
| Apollo | covered (was missing) | RCT-GAP-031 |  |
| Astro | covered (was missing) | RCT-GAP-038 |  |
| Cli Tools | covered (was missing) | RCT-GAP-036, RCT-GAP-037 |  |
| Component Libraries | covered (was missing) | RCT-GAP-018, RCT-GAP-020 |  |
| Component Lifecycle | covered | RCT-EFF-008, RCT-EFF-011, RCT-EFF-013 |  |
| Components | covered | RCT-JSX-013, RCT-RND-001, RCT-JSX-030 |  |
| Composition | covered | RCT-PAT-006, RCT-PAT-010, RCT-PAT-034 |  |
| Conditional Rendering | covered | RCT-JSX-001, RCT-JSX-020, RCT-JSX-036 |  |
| Context | covered | RCT-STM-001, RCT-PRF-002, RCT-RND-041 |  |
| Creating Custom Hooks | covered | RCT-HKS-002, RCT-HKS-004, RCT-HKS-037 |  |
| Error Boundaries | covered | RCT-CNC-008, RCT-CNC-009, RCT-CNC-015 |  |
| Events | covered | RCT-JSX-024, RCT-JSX-025, RCT-JSX-029 |  |
| Forms | covered | RCT-JSX-019, RCT-PAT-032, RCT-HKS-021 |  |
| Framer Motion | covered (was missing) | RCT-GAP-021, RCT-GAP-023 | Now called Motion. |
| Frameworks | covered | RCT-RSC-001, RCT-RSC-007, RCT-RSC-019 |  |
| Functional Components | covered | RCT-JSX-013, RCT-RND-001, RCT-PAT-012 |  |
| Gsock | covered (was missing) | RCT-GAP-023, RCT-GAP-024 | GSAP (GreenSock). |
| Headless Component Libraries | covered (was missing) | RCT-GAP-019, RCT-GAP-020 |  |
| Headless Components | covered | RCT-PAT-022, RCT-PAT-023 |  |
| High Order Components | covered | RCT-PAT-006, RCT-PAT-010, RCT-PAT-012 |  |
| Hooks | covered | RCT-HKS-001, RCT-HKS-002, RCT-HKS-006 |  |
| Hooks Best Practices | covered | RCT-HKS-004, RCT-HKS-022, RCT-EFF-025 |  |
| Jotai | covered | RCT-STM-045 |  |
| Jsx | covered | RCT-JSX-001, RCT-JSX-004, RCT-JSX-033 |  |
| Lists And Keys | covered | RCT-JSX-009, RCT-JSX-035, RCT-PRF-010 |  |
| Mobile Applications | covered (was missing) | RCT-GAP-034, RCT-GAP-035 |  |
| Mobx | covered (was missing) | RCT-GAP-032 |  |
| Nextjs | covered | RCT-RSC-001, RCT-RSC-018, RCT-RSC-027 | Framework-level detail lives in the separate Next.js bank. |
| Playwright | covered (was missing) | RCT-GAP-026, RCT-GAP-027 |  |
| Portals | covered | RCT-JSX-025, RCT-JSX-038, RCT-PAT-033 |  |
| Props Vs State | covered | RCT-STA-026, RCT-PAT-035, RCT-STM-004 |  |
| Radix Ui | covered (was missing) | RCT-GAP-019, RCT-GAP-020 |  |
| React Hook Form | covered | RCT-STM-017, RCT-STM-044 |  |
| React Native | covered (was missing) | RCT-GAP-034, RCT-GAP-035 |  |
| React Router | covered (was missing) | RCT-GAP-011, RCT-GAP-012, RCT-GAP-013 | Listed twice in the roadmap. |
| React Testing Library | covered | RCT-PAT-001, RCT-PAT-002, RCT-PAT-007 |  |
| Refs | covered | RCT-EFF-002, RCT-EFF-029, RCT-HKS-007 |  |
| Render Props | covered (was partial) | RCT-PAT-006, RCT-GAP-039 |  |
| Rendering | covered | RCT-RND-009, RCT-RND-023, RCT-RND-039 |  |
| Routers | covered (was missing) | RCT-GAP-011, RCT-GAP-012, RCT-GAP-013, RCT-GAP-014 |  |
| Rtk Query | covered (was partial) | RCT-STM-012, RCT-GAP-030 |  |
| Server Apis | covered | RCT-CNC-027, RCT-CNC-037, RCT-RSC-023 |  |
| State Management | covered | RCT-STM-002, RCT-STM-006, RCT-STM-032 |  |
| Suspense | covered | RCT-CNC-001, RCT-CNC-010, RCT-CNC-024 |  |
| Swr | covered (was missing) | RCT-GAP-029 |  |
| Tailwind Css | covered (was partial) | RCT-PAT-036, RCT-GAP-016 |  |
| Tanstack Query | covered | RCT-STM-005, RCT-STM-010, RCT-STM-013 |  |
| Testing | covered | RCT-PAT-004, RCT-PAT-008, RCT-EFF-044 |  |
| Types Validation | covered (was missing) | RCT-GAP-004, RCT-GAP-010 |  |
| Typescript | covered (was missing) | RCT-GAP-001, RCT-GAP-002, RCT-GAP-003, RCT-GAP-005, RCT-GAP-006, RCT-GAP-007, RCT-GAP-008, RCT-GAP-009 |  |
| Usecallback | covered | RCT-PRF-027, RCT-PRF-036, RCT-PRF-038 |  |
| Usecontext | covered | RCT-HKS-034, RCT-PRF-011, RCT-STM-001 |  |
| Useeffect | covered | RCT-EFF-001, RCT-EFF-003, RCT-EFF-008 |  |
| Usememo | covered | RCT-PRF-021, RCT-PRF-037 |  |
| Usereducer | covered | RCT-STA-014, RCT-STA-022, RCT-STM-022 |  |
| Useref | covered | RCT-HKS-009, RCT-HKS-011, RCT-EFF-045 |  |
| Usestate | covered | RCT-STA-001, RCT-STA-008, RCT-STA-019 | Listed twice in the roadmap. |
| Vite | covered (was missing) | RCT-GAP-036, RCT-GAP-037 |  |
| Vitest | covered (was partial) | RCT-PAT-021, RCT-GAP-025 |  |
| Writing Css | covered (was partial) | RCT-JSX-004, RCT-JSX-040, RCT-GAP-015, RCT-GAP-016, RCT-GAP-017 |  |
| Zod | covered (was missing) | RCT-GAP-010 |  |
| Zustand | covered | RCT-STM-002, RCT-STM-024, RCT-STM-030 |  |
| Ark Ui | out of scope | — | Niche headless library; headless concepts are covered by Radix and React Aria items. |
| Formish | out of scope | — | Niche form library; form-library concepts are covered by React Hook Form and Formik items. |
| Valibot | out of scope | — | Same role as Zod, which is covered; the API differs only in detail. |

## Gaps filled

39 questions in `content/exams/react/questions/roadmap-gaps.json` (`RCT-GAP-001` to `RCT-GAP-039`). The bank now has 489 questions.

- By level: 0 Basic, 15 Intermediate, 19 Advanced, 5 Expert.
- By skill: jsx-components 8, state-updates 1, hooks-advanced 1, patterns-testing 12, state-management 7, performance 6, effects 2, rendering 1, server-components 1.
- Verification: every TypeScript claim was compiled with TypeScript 6 and @types/react 19.3; runtime claims were run against React 19.3, Zod 4.6, Radix Dialog 1.1, Motion 13.4 (in jsdom) and Vite 8.3's source. Library behaviour that isn't installed (React Router, SWR, RTK Query, Apollo, MobX, Formik, React Native, Astro, Playwright, Cypress) follows each project's official documentation.
