# JavaScript coverage against roadmap.sh

Roadmap: [roadmap.sh/javascript](https://roadmap.sh/javascript), 126 topics (from `docs/coverage/roadmap-topics.json`).
Bank: `content/exams/javascript` (exam id `javascript`). The 40-item `js-essentials` quiz is not part of this audit.
Audited: 2026-10-07, by reading all 450 existing questions and mapping each topic by hand.

Coverage % = (covered + 0.5 × partial) ÷ in-scope topics.

| | Covered | Partial | Missing | Out of scope | In scope | Coverage |
|---|---|---|---|---|---|---|
| Before | 91 | 23 | 9 | 3 | 123 | 83.3% |
| After | 123 | 0 | 0 | 3 | 123 | 100.0% |

Statuses: **covered** means at least two solid questions, or one deep one. **Partial** means the topic only appears incidentally or one angle is missing. **Out of scope** means a heading or trivia node with nothing testable. The Status column shows the state before the gap fill; the Questions column lists the current questions, with new ones in `JSM-GAP-*`.

| Topic | Status | Questions | Notes |
|---|---|---|---|
| bitwise operators | missing → covered | JSM-GAP-001, JSM-GAP-002, JSM-GAP-003, JSM-GAP-004 | ToInt32 wrap, `~indexOf`, bit flags |
| callback hell | missing → covered | JSM-GAP-047, JSM-GAP-048 | Refactoring and inversion of control |
| comma operators | missing → covered | JSM-GAP-005, JSM-GAP-006 | Value of a comma expression; `(0, obj.m)()` drops `this` |
| conditional operators | missing → covered | JSM-GAP-007 | Ternary precedence and right-associativity |
| debugging issues | missing → covered | JSM-GAP-021, JSM-GAP-022, JSM-GAP-023 | `debugger`, live console objects, breakpoint types |
| dowhile | missing → covered | JSM-GAP-012, JSM-GAP-013 |  |
| switch | missing → covered | JSM-GAP-008, JSM-GAP-009, JSM-GAP-010, JSM-GAP-011 | Strict matching, fall-through, shared scope, TDZ |
| variable naming rules | missing → covered | JSM-GAP-016, JSM-GAP-017 | Valid identifiers; shadowing `undefined` |
| xmlhttprequest | missing → covered | JSM-GAP-019, JSM-GAP-020 | `onload` on 404, upload progress |
| apply | partial → covered | JSM-GAP-024, JSM-GAP-025, JSM-COD-043, JSM-FUN-019 |  |
| arithmetic operators | partial → covered | JSM-GAP-027, JSM-GAP-028, JSM-TYP-002, JSM-TYP-038, JSM-MOD-005 | Added `**` associativity and `%` sign rules |
| bigint operators | partial → covered | JSM-GAP-029, JSM-TYP-028 | Added truncating division, unary plus, default sort |
| break continue | partial → covered | JSM-GAP-013, JSM-GAP-014, JSM-GAP-015, JSM-MOD-026 | Added labels, `continue` in do...while, `break` in forEach |
| comparison operators | partial → covered | JSM-GAP-030, JSM-TYP-014 | Added string vs number relational comparison |
| conditional statements | partial → covered | JSM-GAP-008, JSM-GAP-009, JSM-GAP-010, JSM-GAP-011, JSM-GAP-031 |  |
| control flow | partial → covered | JSM-GAP-009, JSM-GAP-012, JSM-GAP-013, JSM-GAP-014 | Section heading |
| error objects | partial → covered | JSM-GAP-032, JSM-GAP-033, JSM-GAP-034, JSM-PRM-026 | Added custom Error classes, `cause`, built-in error types |
| forin loop | partial → covered | JSM-GAP-046, JSM-OBJ-005 | Added array keys and inherited enumerable properties |
| function borrowing | partial → covered | JSM-GAP-026, JSM-COD-032 | Generic array methods on strings and array-likes |
| ifelse | partial → covered | JSM-GAP-007, JSM-GAP-031 | `indexOf` truthiness bug; ternary as an expression |
| iifes | partial → covered | JSM-GAP-038, JSM-FUN-009 | Added the ASI hazard before an IIFE |
| in event handlers | partial → covered | JSM-GAP-039, JSM-FUN-029 | Added `this` = currentTarget vs arrow listener |
| javascript versions | partial → covered | JSM-GAP-040, JSM-COL-009, JSM-MOD-011 | Added a feature-to-edition match |
| loops and iterations | partial → covered | JSM-GAP-012, JSM-GAP-013, JSM-GAP-014, JSM-GAP-046, JSM-FUN-012 | Section heading |
| scope function stack | partial → covered | JSM-GAP-041, JSM-GAP-042, JSM-FUN-034 | Added stack overflow and stack trace order |
| string | partial → covered | JSM-GAP-043, JSM-GAP-044, JSM-COL-030, JSM-MOD-035 | Added replace vs replaceAll, slice vs substring |
| throw statement | partial → covered | JSM-GAP-035, JSM-PRM-003 | Added throwing non-Error values |
| trycatchfinally | partial → covered | JSM-GAP-036, JSM-GAP-037, JSM-PRM-030 | Added `finally` overriding return and throw |
| unary operators | partial → covered | JSM-GAP-045, JSM-TYP-018 | Added `void`, unary `+`/`-`, `delete` on arrays |
| using browser devtools | partial → covered | JSM-GAP-021, JSM-GAP-022, JSM-GAP-023, JSM-PRF-017, JSM-PRF-029 | Added Sources-panel debugging features |
| weak set | partial → covered | JSM-GAP-018, JSM-COL-022 |  |
| while | partial → covered | JSM-GAP-012, JSM-GAP-013, JSM-PRF-016 |  |
| == | covered | JSM-TYP-003, JSM-TYP-014, JSM-TYP-015, JSM-TYP-026, JSM-TYP-031, JSM-TYP-035, JSM-TYP-045 | Loose equality algorithm, null/undefined rules |
| === | covered | JSM-TYP-004, JSM-TYP-034, JSM-OBJ-006, JSM-COL-007 |  |
| all about variables | covered | JSM-FUN-003, JSM-FUN-004, JSM-FUN-010, JSM-FUN-014 | Section heading; see var, let, const |
| arguments object | covered | JSM-FUN-011, JSM-FUN-026, JSM-FUN-030, JSM-FUN-041 |  |
| arrays | covered | JSM-COL-001, JSM-COL-002, JSM-COL-012, JSM-COL-014, JSM-COL-025, JSM-COL-043 |  |
| arrow functions | covered | JSM-FUN-011, JSM-FUN-017, JSM-FUN-030, JSM-FUN-039, JSM-OBJ-019 |  |
| assignment operators | covered | JSM-MOD-004, JSM-MOD-020, JSM-COL-024 | Logical assignment and destructuring swap |
| asyncawait | covered | JSM-PRM-005, JSM-PRM-010, JSM-PRM-022, JSM-PRM-030, JSM-PRM-036, JSM-EVL-003 |  |
| asynchronous javascript | covered | JSM-PRM-001, JSM-PRM-002, JSM-EVL-001, JSM-EVL-013 | Section heading |
| bigint | covered | JSM-TYP-006, JSM-TYP-028 |  |
| bind | covered | JSM-FUN-018, JSM-FUN-027, JSM-FUN-031, JSM-COD-030 |  |
| block | covered | JSM-FUN-004, JSM-FUN-005, JSM-FUN-014 |  |
| boolean | covered | JSM-TYP-011, JSM-TYP-019 |  |
| built in functions | covered | JSM-TYP-013, JSM-TYP-041 | parseInt edge cases |
| built in objects | covered | JSM-TYP-027, JSM-MOD-002, JSM-MOD-010, JSM-TYP-040 | Date, Intl, RegExp, Math/Number |
| call | covered | JSM-COD-043, JSM-FUN-019, JSM-FUN-045, JSM-GAP-025 |  |
| callbacks | covered | JSM-PRM-015, JSM-COD-010, JSM-EVL-001 |  |
| classes | covered | JSM-OBJ-004, JSM-OBJ-014, JSM-OBJ-019, JSM-OBJ-025, JSM-OBJ-029, JSM-OBJ-043 |  |
| closures | covered | JSM-FUN-006, JSM-FUN-012, JSM-FUN-023, JSM-FUN-028, JSM-FUN-042, JSM-PRF-039 |  |
| commonjs | covered | JSM-MOD-024, JSM-MOD-031, JSM-EVL-007 |  |
| const | covered | JSM-FUN-003, JSM-FUN-010 |  |
| data structures | covered | JSM-COL-006, JSM-COL-015, JSM-COL-022, JSM-COL-040 | Section heading |
| data types | covered | JSM-TYP-001, JSM-TYP-006, JSM-TYP-009, JSM-TYP-010 |  |
| debugging memory leaks | covered | JSM-PRF-014, JSM-PRF-017, JSM-PRF-024, JSM-PRF-030, JSM-PRF-039 |  |
| debugging performance | covered | JSM-PRF-018, JSM-PRF-025, JSM-PRF-033, JSM-PRF-036, JSM-PRF-043, JSM-PRF-044 |  |
| default params | covered | JSM-FUN-013, JSM-FUN-024, JSM-FUN-025, JSM-COL-005 |  |
| dom apis | covered | JSM-DOM-001, JSM-DOM-009, JSM-DOM-012, JSM-DOM-013, JSM-DOM-022 |  |
| equality comparisons | covered | JSM-TYP-003, JSM-TYP-034, JSM-TYP-042, JSM-COL-003 | Section heading |
| esm | covered | JSM-MOD-001, JSM-MOD-012, JSM-MOD-013, JSM-MOD-014, JSM-MOD-025, JSM-MOD-039 |  |
| event loop | covered | JSM-EVL-002, JSM-EVL-013, JSM-EVL-023, JSM-EVL-036 | Whole skill (45 items) |
| exceptional handling | covered | JSM-PRM-030, JSM-PRM-039, JSM-GAP-036, JSM-GAP-037 |  |
| explicit binding | covered | JSM-FUN-018, JSM-FUN-019, JSM-FUN-027 |  |
| explicit type casting | covered | JSM-TYP-007, JSM-TYP-018, JSM-TYP-032 |  |
| expressions operators | covered | JSM-TYP-002, JSM-TYP-005, JSM-GAP-007, JSM-GAP-045 | Section heading |
| fetch | covered | JSM-PRM-023, JSM-DOM-017, JSM-DOM-028, JSM-DOM-042 |  |
| for | covered | JSM-FUN-012, JSM-FUN-028, JSM-FUN-042 |  |
| forof loop | covered | JSM-MOD-006, JSM-MOD-007, JSM-COL-045 |  |
| function | covered | JSM-FUN-001, JSM-FUN-002, JSM-FUN-031 |  |
| function parameters | covered | JSM-FUN-013, JSM-FUN-025, JSM-FUN-041 |  |
| functions | covered | JSM-FUN-001, JSM-FUN-008, JSM-FUN-020 | Section heading |
| garbage collection | covered | JSM-PRF-002, JSM-PRF-009, JSM-PRF-038 |  |
| global | covered | JSM-FUN-021, JSM-FUN-033, JSM-FUN-040 |  |
| hoisting | covered | JSM-FUN-001, JSM-FUN-002, JSM-FUN-014, JSM-FUN-036, JSM-FUN-044 |  |
| how to run javascript | covered | JSM-DOM-004, JSM-DOM-023, JSM-MOD-001, JSM-EVL-007 | Script loading in browser and Node |
| implicit type casting | covered | JSM-TYP-002, JSM-TYP-012, JSM-TYP-026 |  |
| in a function | covered | JSM-FUN-021, JSM-FUN-040 | `this` in a plain function call |
| in a method | covered | JSM-FUN-016, JSM-OBJ-008 |  |
| in arrow functions | covered | JSM-FUN-017, JSM-FUN-039 |  |
| indexed collections | covered | JSM-COL-014, JSM-COL-025, JSM-COL-040 |  |
| islooselyequal | covered | JSM-TYP-035, JSM-TYP-026, JSM-TYP-031 |  |
| isstrictlyequal | covered | JSM-TYP-004, JSM-TYP-034, JSM-OBJ-006 |  |
| iterators and generators | covered | JSM-MOD-008, JSM-MOD-016, JSM-MOD-017, JSM-MOD-026, JSM-MOD-036, JSM-MOD-040 |  |
| json | covered | JSM-TYP-021, JSM-TYP-033, JSM-EVL-010 |  |
| keyed collections | covered | JSM-COL-006, JSM-COL-015, JSM-COL-022, JSM-COL-029 |  |
| let | covered | JSM-FUN-004, JSM-FUN-007, JSM-FUN-014 |  |
| lexical scoping | covered | JSM-FUN-024, JSM-FUN-038 |  |
| logical operators | covered | JSM-TYP-005, JSM-TYP-022, JSM-MOD-004 |  |
| map | covered | JSM-COL-006, JSM-COL-015, JSM-COL-022 |  |
| memory lifecycle | covered | JSM-PRF-002, JSM-PRF-009 |  |
| memory management | covered | JSM-PRF-014, JSM-PRF-021, JSM-PRF-034 |  |
| modules in javascript | covered | JSM-MOD-009, JSM-MOD-012, JSM-MOD-024 |  |
| null | covered | JSM-TYP-003, JSM-TYP-014, JSM-OBJ-024 |  |
| number | covered | JSM-TYP-004, JSM-TYP-024, JSM-TYP-029, JSM-TYP-040 |  |
| object | covered | JSM-OBJ-006, JSM-OBJ-007, JSM-OBJ-013, JSM-OBJ-015 |  |
| object prototype | covered | JSM-OBJ-001, JSM-OBJ-002, JSM-OBJ-020, JSM-OBJ-024 |  |
| objectis | covered | JSM-TYP-034, JSM-TYP-042 |  |
| promises | covered | JSM-PRM-001, JSM-PRM-004, JSM-PRM-012, JSM-PRM-025 | Whole skill (45 items) |
| prototypal inheritance | covered | JSM-OBJ-001, JSM-OBJ-010, JSM-OBJ-027, JSM-OBJ-038 |  |
| recursion | covered | JSM-FUN-034, JSM-COD-011, JSM-COD-028, JSM-GAP-041 |  |
| rest | covered | JSM-FUN-013, JSM-COL-020 |  |
| samevalue | covered | JSM-TYP-034, JSM-OBJ-031 |  |
| samevaluezero | covered | JSM-COL-003, JSM-TYP-042, JSM-COL-042 |  |
| set | covered | JSM-COL-011, JSM-COL-029, JSM-COL-045 |  |
| setinterval | covered | JSM-EVL-017, JSM-EVL-027, JSM-PRF-003 |  |
| settimeout | covered | JSM-EVL-001, JSM-EVL-004, JSM-EVL-012 |  |
| strict mode | covered | JSM-OBJ-018, JSM-OBJ-022, JSM-FUN-026, JSM-FUN-040 |  |
| string operators | covered | JSM-TYP-002, JSM-TYP-012, JSM-TYP-038 |  |
| structured data | covered | JSM-TYP-021, JSM-TYP-033 | JSON and structuredClone |
| symbol | covered | JSM-MOD-003, JSM-MOD-018, JSM-MOD-019, JSM-MOD-033 |  |
| type casting | covered | JSM-TYP-007, JSM-TYP-018, JSM-TYP-025 | Section heading |
| type conversion vs coercion | covered | JSM-TYP-020, JSM-TYP-025, JSM-TYP-030, JSM-TYP-036 |  |
| typed arrays | covered | JSM-COL-040, JSM-COL-041, JSM-PRF-040 |  |
| typeof operator | covered | JSM-TYP-001, JSM-TYP-006, JSM-TYP-008, JSM-OBJ-004 |  |
| undefined | covered | JSM-TYP-003, JSM-TYP-021, JSM-COL-005, JSM-GAP-017 |  |
| using it alone | covered | JSM-FUN-021, JSM-FUN-039 | `this` at the top level of scripts and modules |
| using this keyword | covered | JSM-FUN-016, JSM-FUN-017, JSM-FUN-019, JSM-FUN-021 |  |
| var | covered | JSM-FUN-002, JSM-FUN-004, JSM-FUN-044 |  |
| variable declarations | covered | JSM-FUN-004, JSM-FUN-010, JSM-FUN-014 |  |
| variable scopes | covered | JSM-FUN-004, JSM-FUN-005, JSM-FUN-033 |  |
| weak map | covered | JSM-PRF-008, JSM-COL-033, JSM-COD-038 |  |
| working with apis | covered | JSM-PRM-023, JSM-DOM-017, JSM-DOM-028 |  |
| history of javascript | out of scope | — | Historical trivia, not asked in technical interviews |
| introduction to javascript | out of scope | — | Section heading with no testable content |
| what is javascript | out of scope | — | Introductory heading with no testable content |

## Gaps filled

48 new questions in `content/exams/javascript/questions/roadmap-gaps.json` (`JSM-GAP-001`–`JSM-GAP-048`), taking the bank from 450 to 498. Every code snippet was run in Node 24 and the keys match the actual output.

| Topic | New questions |
|---|---|
| bitwise operators | JSM-GAP-001, JSM-GAP-002, JSM-GAP-003, JSM-GAP-004 |
| callback hell | JSM-GAP-047, JSM-GAP-048 |
| comma operators | JSM-GAP-005, JSM-GAP-006 |
| conditional operators | JSM-GAP-007 |
| debugging issues | JSM-GAP-021, JSM-GAP-022, JSM-GAP-023 |
| dowhile | JSM-GAP-012, JSM-GAP-013 |
| switch | JSM-GAP-008, JSM-GAP-009, JSM-GAP-010, JSM-GAP-011 |
| variable naming rules | JSM-GAP-016, JSM-GAP-017 |
| xmlhttprequest | JSM-GAP-019, JSM-GAP-020 |
| apply | JSM-GAP-024, JSM-GAP-025 |
| arithmetic operators | JSM-GAP-027, JSM-GAP-028 |
| bigint operators | JSM-GAP-029 |
| break continue | JSM-GAP-013, JSM-GAP-014, JSM-GAP-015 |
| comparison operators | JSM-GAP-030 |
| conditional statements | JSM-GAP-008, JSM-GAP-009, JSM-GAP-010, JSM-GAP-011, JSM-GAP-031 |
| control flow | JSM-GAP-009, JSM-GAP-012, JSM-GAP-013, JSM-GAP-014 |
| error objects | JSM-GAP-032, JSM-GAP-033, JSM-GAP-034 |
| forin loop | JSM-GAP-046 |
| function borrowing | JSM-GAP-026 |
| ifelse | JSM-GAP-007, JSM-GAP-031 |
| iifes | JSM-GAP-038 |
| in event handlers | JSM-GAP-039 |
| javascript versions | JSM-GAP-040 |
| loops and iterations | JSM-GAP-012, JSM-GAP-013, JSM-GAP-014, JSM-GAP-046 |
| scope function stack | JSM-GAP-041, JSM-GAP-042 |
| string | JSM-GAP-043, JSM-GAP-044 |
| throw statement | JSM-GAP-035 |
| trycatchfinally | JSM-GAP-036, JSM-GAP-037 |
| unary operators | JSM-GAP-045 |
| using browser devtools | JSM-GAP-021, JSM-GAP-022, JSM-GAP-023 |
| weak set | JSM-GAP-018 |
| while | JSM-GAP-012, JSM-GAP-013 |
| call | JSM-GAP-025 |
| exceptional handling | JSM-GAP-036, JSM-GAP-037 |
| expressions operators | JSM-GAP-007, JSM-GAP-045 |
| recursion | JSM-GAP-041 |
| undefined | JSM-GAP-017 |
