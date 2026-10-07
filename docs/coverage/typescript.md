# TypeScript coverage against roadmap.sh

Roadmap: [roadmap.sh/typescript](https://roadmap.sh/typescript) (93 topics, fetched 2026-10-07). Bank: `content/exams/typescript`, 479 questions after this audit. Audited 7 October 2026.

Coverage counts a topic as 1 when covered and 0.5 when partly covered, out of the 92 topics in scope.

| | Covered | Partial | Missing | Out of scope | Coverage |
|---|---|---|---|---|---|
| Before the audit | 80 | 7 | 5 | 1 | 90.8% |
| After filling gaps | 92 | 0 | 0 | 1 | 100.0% |

Status in the table below is the status before the audit; topics with gap questions are now covered.

| Topic | Status | Questions | Notes |
|---|---|---|---|
| constructor overloading | missing → covered | TSM-GAP-004, TSM-GAP-005, TSM-GAP-006 | Overloaded constructors had no items |
| formatting | missing → covered | TSM-GAP-010 | Prettier vs type checking was not covered |
| hybrid types | missing → covered | TSM-GAP-001, TSM-GAP-002, TSM-GAP-003 | Callable values with properties had no items |
| linting | missing → covered | TSM-GAP-007, TSM-GAP-008, TSM-GAP-009 | typescript-eslint and typed linting were not covered |
| ts node | missing → covered | TSM-GAP-011, TSM-GAP-012, TSM-GAP-013 | How ts-node, tsx and Node type stripping differ was not covered |
| as any | partial → covered | TSM-STR-021, TSM-FNC-024, TSM-GAP-028, TSM-GAP-029 | Double assertions (`as unknown as T`) and their runtime meaning were not tested |
| extending interfaces | partial → covered | TSM-STR-015, TSM-APP-039, TSM-GAP-016, TSM-GAP-017, TSM-GAP-018 | Multiple `extends`, conflicting members and what may be extended were thin |
| extract | partial → covered | TSM-MAP-020, TSM-NAR-030, TSM-GAP-019, TSM-GAP-020 | Only one direct `Extract` item |
| inheritance vs polymorphism | partial → covered | TSM-FNC-019, TSM-FNC-032, TSM-CFG-039, TSM-GAP-023, TSM-GAP-024, TSM-GAP-025 | Runtime dispatch and override compatibility were thin |
| installation and configuration | partial → covered | TSM-CFG-023, TSM-DCL-024, TSM-GAP-014, TSM-GAP-015 | `tsc --init` and local vs global compiler versions were not tested |
| instancetype | partial → covered | TSM-FNC-023, TSM-GAP-021, TSM-GAP-022 | Only a match prompt mentioned `InstanceType` |
| useful packages | partial → covered | TSM-APP-024, TSM-GAP-026, TSM-GAP-027 | Only zod appeared; ts-reset, type-fest and typescript-eslint were absent |
| abstract classes | covered | TSM-FNC-008, TSM-FNC-019, TSM-FNC-025, TSM-FNC-041 |  |
| access modifiers | covered | TSM-FNC-005, TSM-FNC-006, TSM-FNC-022, TSM-FNC-027 |  |
| advanced types | covered | TSM-CND-003, TSM-CND-005, TSM-CND-030, TSM-CND-039, TSM-MAP-027 |  |
| ambient modules | covered | TSM-DCL-005, TSM-DCL-014, TSM-DCL-021, TSM-DCL-031, TSM-DCL-036 |  |
| any | covered | TSM-APP-004, TSM-APP-008, TSM-EVR-023, TSM-STR-021 |  |
| array | covered | TSM-APP-002, TSM-APP-018, TSM-EVR-034, TSM-GEN-016 |  |
| as const | covered | TSM-APP-003, TSM-APP-010, TSM-EVR-012, TSM-EVR-013, TSM-EVR-014 |  |
| as type | covered | TSM-APP-001, TSM-APP-012, TSM-APP-021, TSM-APP-025 |  |
| awaited | covered | TSM-MAP-017, TSM-MAP-044, TSM-CND-032, TSM-APP-034 |  |
| boolean | covered | TSM-EVR-009, TSM-NAR-002, TSM-NAR-023 |  |
| build tools | covered | TSM-CFG-011, TSM-CFG-031, TSM-CFG-038, TSM-CFG-042 |  |
| class | covered | TSM-FNC-005, TSM-FNC-018, TSM-FNC-028, TSM-FNC-032 |  |
| classes | covered | TSM-FNC-005, TSM-FNC-018, TSM-FNC-032, TSM-FNC-042 |  |
| combining types | covered | TSM-APP-005, TSM-APP-016, TSM-STR-015, TSM-CND-017 |  |
| compiler options | covered | TSM-CFG-003, TSM-CFG-004, TSM-CFG-007, TSM-CFG-009 |  |
| conditional types | covered | TSM-CND-001, TSM-CND-002, TSM-CND-003, TSM-CND-011, TSM-CND-012 |  |
| constructor params | covered | TSM-FNC-005, TSM-FNC-020, TSM-FNC-038, TSM-FNC-042 |  |
| decorators | covered | TSM-FNC-034, TSM-FNC-039, TSM-FNC-045 |  |
| ecosystem | covered | TSM-DCL-003, TSM-DCL-007, TSM-DCL-011, TSM-DCL-024 |  |
| enum | covered | TSM-APP-010, TSM-APP-031, TSM-CFG-030, TSM-EVR-025 |  |
| equality | covered | TSM-NAR-001, TSM-NAR-005, TSM-NAR-008, TSM-NAR-010 |  |
| exclude | covered | TSM-CND-011, TSM-MAP-005, TSM-MAP-016, TSM-MAP-020 |  |
| external modules | covered | TSM-CFG-011, TSM-CFG-012, TSM-CFG-013, TSM-DCL-008 |  |
| function overloading | covered | TSM-FNC-011, TSM-FNC-014, TSM-FNC-024, TSM-CND-043, TSM-MAP-033 |  |
| generic constraints | covered | TSM-GEN-005, TSM-GEN-010, TSM-APP-014, TSM-CND-027 |  |
| generic types | covered | TSM-GEN-001, TSM-GEN-002, TSM-GEN-023, TSM-CND-009 |  |
| generics | covered | TSM-GEN-002, TSM-GEN-016, TSM-GEN-018, TSM-GEN-038 |  |
| global augmentation | covered | TSM-DCL-012, TSM-DCL-013, TSM-DCL-026, TSM-DCL-043 |  |
| instanceof | covered | TSM-NAR-004, TSM-NAR-009, TSM-NAR-040, TSM-FNC-031 |  |
| interface | covered | TSM-STR-007, TSM-STR-016, TSM-DCL-009, TSM-DCL-033 |  |
| interface declaration | covered | TSM-DCL-009, TSM-DCL-010, TSM-DCL-015, TSM-DCL-022 |  |
| intersection types | covered | TSM-APP-009, TSM-APP-025, TSM-CND-024, TSM-STR-015 |  |
| introduction to typescript | covered | TSM-NAR-005, TSM-APP-009, TSM-CFG-001 |  |
| keyof operator | covered | TSM-MAP-001, TSM-MAP-003, TSM-APP-014, TSM-APP-021 |  |
| literal types | covered | TSM-EVR-012, TSM-EVR-013, TSM-CND-005, TSM-CND-016 |  |
| mapped types | covered | TSM-MAP-014, TSM-MAP-015, TSM-MAP-027, TSM-MAP-028, TSM-MAP-030 |  |
| method overriding | covered | TSM-FNC-026, TSM-CFG-039, TSM-FNC-019 |  |
| namespace augmentation | covered | TSM-DCL-010, TSM-DCL-013, TSM-DCL-015, TSM-DCL-034 |  |
| namespaces | covered | TSM-DCL-010, TSM-DCL-015, TSM-DCL-027, TSM-CFG-027 |  |
| never | covered | TSM-APP-016, TSM-APP-036, TSM-CND-012, TSM-NAR-019 |  |
| non null assertion | covered | TSM-EVR-008, TSM-EVR-020, TSM-FNC-033 |  |
| nonnullable | covered | TSM-CND-007, TSM-MAP-008, TSM-MAP-020 |  |
| null | covered | TSM-EVR-006, TSM-EVR-020, TSM-CFG-003, TSM-NAR-013 |  |
| number | covered | TSM-EVR-001, TSM-EVR-009, TSM-CND-006 |  |
| object | covered | TSM-EVR-009, TSM-STR-007, TSM-APP-007 |  |
| omit | covered | TSM-MAP-013, TSM-MAP-015, TSM-MAP-026, TSM-MAP-039 |  |
| parameters | covered | TSM-APP-015, TSM-APP-038, TSM-CND-006, TSM-CND-023 |  |
| partial | covered | TSM-MAP-002, TSM-MAP-011, TSM-MAP-031, TSM-APP-022 |  |
| pick | covered | TSM-MAP-004, TSM-MAP-011, TSM-MAP-013, TSM-MAP-023 |  |
| readonly | covered | TSM-APP-009, TSM-APP-012, TSM-CND-045, TSM-STR-013 |  |
| record | covered | TSM-APP-007, TSM-APP-040, TSM-EVR-022, TSM-GEN-020 |  |
| recursive types | covered | TSM-CND-027, TSM-CND-029, TSM-CND-039, TSM-GEN-043 |  |
| returntype | covered | TSM-CND-004, TSM-MAP-009, TSM-MAP-033, TSM-APP-034 |  |
| running typescript | covered | TSM-CFG-026, TSM-CFG-027, TSM-CFG-042, TSM-GAP-013 |  |
| satisfies keyword | covered | TSM-APP-005, TSM-APP-013, TSM-APP-035, TSM-EVR-022 |  |
| string | covered | TSM-EVR-001, TSM-EVR-012, TSM-NAR-001 |  |
| template literal types | covered | TSM-CND-005, TSM-CND-017, TSM-CND-018, TSM-CND-028, TSM-CND-029 |  |
| truthiness | covered | TSM-NAR-002, TSM-NAR-014, TSM-NAR-023 |  |
| ts and js interoperability | covered | TSM-CFG-017, TSM-CFG-030, TSM-CFG-034, TSM-DCL-001 |  |
| tsc | covered | TSM-CFG-001, TSM-CFG-002, TSM-CFG-006, TSM-CFG-015 |  |
| tsconfigjson | covered | TSM-CFG-010, TSM-CFG-011, TSM-CFG-012, TSM-CFG-037 |  |
| tuple | covered | TSM-EVR-043, TSM-FNC-020, TSM-GEN-016, TSM-GEN-039 |  |
| type aliases | covered | TSM-STR-007, TSM-STR-016, TSM-APP-024 |  |
| type compatibility | covered | TSM-STR-001, TSM-STR-005, TSM-STR-019, TSM-STR-035 |  |
| type guards narrowing | covered | TSM-NAR-001, TSM-NAR-004, TSM-NAR-010, TSM-NAR-024 |  |
| type inference | covered | TSM-EVR-002, TSM-GEN-003, TSM-GEN-016, TSM-CND-009 |  |
| type predicates | covered | TSM-NAR-016, TSM-NAR-017, TSM-NAR-027, TSM-FNC-030 |  |
| typeof | covered | TSM-APP-010, TSM-APP-021, TSM-DCL-018, TSM-NAR-001 |  |
| types vs interfaces | covered | TSM-STR-007, TSM-STR-016, TSM-STR-037, TSM-DCL-001 |  |
| typescript functions | covered | TSM-FNC-010, TSM-FNC-011, TSM-FNC-014, TSM-FNC-033 |  |
| typescript interfaces | covered | TSM-STR-007, TSM-STR-015, TSM-DCL-009 |  |
| typescript modules | covered | TSM-CFG-011, TSM-CFG-013, TSM-DCL-008, TSM-DCL-010 |  |
| typescript types | covered | TSM-EVR-001, TSM-EVR-009, TSM-EVR-023 |  |
| typescript vs javascript | covered | TSM-NAR-005, TSM-CFG-001, TSM-CFG-006, TSM-DCL-001 |  |
| typing functions | covered | TSM-FNC-010, TSM-FNC-012, TSM-FNC-033, TSM-APP-015 |  |
| undefined | covered | TSM-EVR-006, TSM-EVR-020, TSM-NAR-014, TSM-CFG-045 |  |
| union types | covered | TSM-NAR-010, TSM-NAR-023, TSM-STR-019, TSM-APP-016 |  |
| unknown | covered | TSM-APP-004, TSM-EVR-023, TSM-NAR-020, TSM-CFG-003 |  |
| utility types | covered | TSM-MAP-002, TSM-MAP-004, TSM-MAP-008, TSM-MAP-020 |  |
| void | covered | TSM-FNC-012, TSM-CND-006, TSM-APP-037 |  |
| ts playground | out of scope | — | A browser tool to try code; nothing to assess beyond the language itself |

## Gaps filled

29 new questions in `content/exams/typescript/questions/roadmap-gaps.json`:

- **constructor overloading:** TSM-GAP-004, TSM-GAP-005, TSM-GAP-006
- **formatting:** TSM-GAP-010
- **hybrid types:** TSM-GAP-001, TSM-GAP-002, TSM-GAP-003
- **linting:** TSM-GAP-007, TSM-GAP-008, TSM-GAP-009
- **ts node:** TSM-GAP-011, TSM-GAP-012, TSM-GAP-013
- **as any:** TSM-GAP-028, TSM-GAP-029
- **extending interfaces:** TSM-GAP-016, TSM-GAP-017, TSM-GAP-018
- **extract:** TSM-GAP-019, TSM-GAP-020
- **inheritance vs polymorphism:** TSM-GAP-023, TSM-GAP-024, TSM-GAP-025
- **installation and configuration:** TSM-GAP-014, TSM-GAP-015
- **instancetype:** TSM-GAP-021, TSM-GAP-022
- **useful packages:** TSM-GAP-026, TSM-GAP-027
- **running typescript:** TSM-GAP-013
