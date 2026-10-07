# Node.js coverage against roadmap.sh

This maps the `nodejs` bank to the [roadmap.sh Node.js roadmap](https://roadmap.sh/nodejs), audited on 7 October 2026. The roadmap lists 113 topic entries, 111 of them unique; 87 are in scope for an interview mock.

| | Covered | Partial | Missing | Out of scope | Coverage |
|---|---|---|---|---|---|
| Before | 69 | 11 | 7 | 24 | 85.6% |
| After | 87 | 0 | 0 | 24 | 100.0% |

Coverage is (covered + half of partial) / in-scope topics. A topic counts as covered with at least two solid questions or one deep one. Out-of-scope topics are single-purpose third-party packages (terminal colours, prompts, specific template engines) and history; where the underlying Node concept matters, it is covered under another topic, as noted.

## Topics

Status is the status before the audit; topics that changed show the new status after the arrow. Rows are sorted with the gaps first.

| Topic | Status | Questions | Notes |
|---|---|---|---|
| glob | Missing → Covered | NJS-TST-001, NJS-GAP-021 | Built-in `fs.globSync` and path separators |
| monitor changes dev | Missing → Covered | NJS-GAP-001, NJS-GAP-002, NJS-GAP-003 |  |
| nodemon | Missing → Covered | NJS-GAP-001, NJS-GAP-003 | Built-in watch mode as the replacement |
| npm workspaces | Missing → Covered | NJS-GAP-016, NJS-GAP-017 |  |
| template engines | Missing → Covered | NJS-GAP-025, NJS-GAP-026 | Escaping and view lookup |
| updating packages | Missing → Covered | NJS-GAP-018, NJS-GAP-019 | `npm update` and `npm outdated` |
| watch | Missing → Covered | NJS-GAP-001, NJS-GAP-002, NJS-GAP-003 | Built-in watch mode and `--watch-path` |
| assertion errors | Partial → Covered | NJS-TST-002, NJS-TST-010, NJS-GAP-004, NJS-GAP-006 | AssertionError fields and class mismatch |
| command line apps | Partial → Covered | NJS-FSP-018, NJS-FSP-045, NJS-GAP-010, NJS-GAP-012, NJS-GAP-013 | argv, stdin, `bin` and shebang |
| global installation | Partial → Covered | NJS-MOD-005, NJS-GAP-013, NJS-GAP-020 |  |
| global keyword | Partial → Covered | NJS-GAP-022, NJS-GAP-023 | Module scope vs `globalThis`, the `navigator` global |
| nodejs vs browser | Partial → Covered | NJS-HTP-024, NJS-GAP-022, NJS-GAP-023 |  |
| processargv | Partial → Covered | NJS-FSP-018, NJS-GAP-010, NJS-GAP-011 |  |
| processstdin | Partial → Covered | NJS-FSP-040, NJS-GAP-012 |  |
| running nodejs code | Partial → Covered | NJS-EVL-009, NJS-GAP-011, NJS-GAP-027 | `node -e`, `node -p`, ESM entry points |
| running scripts | Partial → Covered | NJS-MOD-042, NJS-SEC-017, NJS-GAP-014, NJS-GAP-015 | `npm run`, pre and post, `node --run` |
| user specified errors | Partial → Covered | NJS-TST-007, NJS-GAP-005, NJS-GAP-007, NJS-GAP-008 | Custom classes, `cause`, serialisation |
| using apm | Partial → Covered | NJS-TST-044, NJS-API-034, NJS-GAP-024 | diagnostics_channel, OpenTelemetry preload |
| __dirname | Covered | NJS-FSP-003, NJS-MOD-006 |  |
| __filename | Covered | NJS-FSP-003, NJS-MOD-006 | ESM replacement `import.meta.filename` |
| async programming | Covered | NJS-EVL-005, NJS-ASY-027, NJS-FSP-011 |  |
| asyncawait | Covered | NJS-ASY-031, NJS-ASY-032, NJS-API-021 |  |
| building consuming apis | Covered | NJS-API-001, NJS-API-016, NJS-HTP-022 |  |
| callbacks | Covered | NJS-ASY-001, NJS-ASY-004, NJS-ASY-010 | Error-first callbacks, promisify |
| callstack stack trace | Covered | NJS-TST-017, NJS-TST-034, NJS-GAP-005 | Stack trace limit, async stack traces, captureStackTrace |
| child process | Covered | NJS-FSP-006, NJS-FSP-015, NJS-FSP-031, NJS-SEC-003 |  |
| cluster | Covered | NJS-PRF-006, NJS-PRF-010, NJS-PRF-032 |  |
| common built in modules | Covered | NJS-ASY-004, NJS-ASY-010, NJS-SEC-005 | util, os, crypto, path, fs |
| commonjs | Covered | NJS-MOD-002, NJS-MOD-003, NJS-MOD-020 |  |
| creating importing | Covered | NJS-MOD-002, NJS-MOD-015, NJS-MOD-021 |  |
| creating packages | Covered | NJS-MOD-005, NJS-MOD-013, NJS-MOD-025 | `exports`, `bin`, fields |
| debugging | Covered | NJS-TST-003, NJS-TST-018, NJS-TST-036 |  |
| dotenv package | Covered | NJS-FSP-013, NJS-FSP-042 | Built-in `--env-file` replaces the package |
| drizzle | Covered | NJS-API-028, NJS-API-044 |  |
| error handling | Covered | NJS-API-007, NJS-API-033, NJS-API-029 |  |
| esm | Covered | NJS-MOD-001, NJS-MOD-003, NJS-EVL-009 |  |
| event emitter | Covered | NJS-ASY-002, NJS-ASY-023, NJS-ASY-030, NJS-ASY-033 |  |
| event loop | Covered | NJS-EVL-001 – NJS-EVL-045 | Whole skill |
| exiting exit codes | Covered | NJS-FSP-008, NJS-ASY-038, NJS-EVL-036 |  |
| expressjs | Covered | NJS-HTP-003, NJS-HTP-009, NJS-API-015, NJS-GAP-026 |  |
| fastify | Covered | NJS-HTP-031, NJS-HTP-041 |  |
| fetch | Covered | NJS-HTP-002, NJS-HTP-022, NJS-HTP-034 |  |
| fs module | Covered | NJS-FSP-001, NJS-FSP-005, NJS-FSP-007 |  |
| garbage collection | Covered | NJS-PRF-002, NJS-PRF-005, NJS-PRF-012 |  |
| handling async errors | Covered | NJS-ASY-006, NJS-ASY-036, NJS-ASY-037 |  |
| http module | Covered | NJS-HTP-001, NJS-HTP-005, NJS-HTP-016 |  |
| introduction to nodejs | Covered | NJS-EVL-001, NJS-PRF-007 | V8 plus libuv model |
| javascript errors | Covered | NJS-ASY-008, NJS-MOD-022, NJS-GAP-007 |  |
| jest | Covered | NJS-TST-015, NJS-TST-016, NJS-TST-042 |  |
| jsonwebtoken | Covered | NJS-SEC-014, NJS-API-011, NJS-API-024 |  |
| keep app running | Covered | NJS-FSP-008, NJS-FSP-043, NJS-PRF-032 |  |
| knex | Covered | NJS-API-044 | Concept-level, in the data-access match item |
| local installation | Covered | NJS-MOD-004, NJS-MOD-007, NJS-MOD-017 |  |
| logging | Covered | NJS-API-017, NJS-API-033, NJS-TST-031 | Structured logging, request ids |
| memory leaks | Covered | NJS-PRF-012, NJS-PRF-039, NJS-TST-004 |  |
| modules | Covered | NJS-MOD-001 – NJS-MOD-045 | Whole skill |
| native drivers | Covered | NJS-API-004, NJS-API-027 | node-postgres |
| nestjs | Covered | NJS-API-045 | One deep item on provider scopes |
| node inspect | Covered | NJS-TST-003, NJS-TST-018, NJS-TST-036 |  |
| nodetest | Covered | NJS-TST-001, NJS-TST-005, NJS-TST-022 |  |
| npm | Covered | NJS-MOD-004, NJS-MOD-017, NJS-MOD-042 |  |
| npx | Covered | NJS-MOD-045, NJS-GAP-013 |  |
| path module | Covered | NJS-FSP-003, NJS-SEC-010, NJS-SEC-020 |  |
| pm2 | Covered | NJS-PRF-032, NJS-FSP-043 |  |
| prisma | Covered | NJS-API-012, NJS-API-040, NJS-API-044 |  |
| processcwd | Covered | NJS-FSP-005, NJS-MOD-006, NJS-GAP-026 |  |
| processenv | Covered | NJS-FSP-002, NJS-FSP-013, NJS-API-014 |  |
| processnexttick | Covered | NJS-EVL-002, NJS-EVL-020, NJS-ASY-022 |  |
| promises | Covered | NJS-ASY-003, NJS-ASY-010, NJS-ASY-028 |  |
| semantic versioning | Covered | NJS-MOD-007, NJS-MOD-009, NJS-MOD-036, NJS-GAP-018 |  |
| setimmediate | Covered | NJS-EVL-006, NJS-EVL-010, NJS-EVL-023 |  |
| setinterval | Covered | NJS-EVL-026, NJS-PRF-012 |  |
| settimeout | Covered | NJS-EVL-008, NJS-EVL-040 |  |
| stdout stderr | Covered | NJS-FSP-009, NJS-FSP-016, NJS-FSP-040 |  |
| streams | Covered | NJS-STR-001 – NJS-STR-045 | Whole skill |
| system errors | Covered | NJS-FSP-007, NJS-HTP-001, NJS-GAP-009 |  |
| testing | Covered | NJS-TST-001 – NJS-TST-045 | Whole skill |
| threads | Covered | NJS-EVL-003, NJS-EVL-012, NJS-EVL-013 | libuv thread pool |
| typeorm | Covered | NJS-API-044 | Concept-level, in the data-access match item |
| uncaught exceptions | Covered | NJS-ASY-006, NJS-ASY-038, NJS-FSP-008 |  |
| using debugger | Covered | NJS-TST-003, NJS-TST-018 |  |
| vitest | Covered | NJS-TST-013, NJS-TST-016, NJS-TST-043 |  |
| what is nodejs | Covered | NJS-EVL-001, NJS-EVL-003 |  |
| why use nodejs | Covered | NJS-PRF-007, NJS-PRF-016 |  |
| worker threads | Covered | NJS-PRF-001, NJS-PRF-011, NJS-PRF-037 |  |
| working with databases | Covered | NJS-API-002 – NJS-API-045 | Pools, transactions, N+1 |
| working with files | Covered | NJS-FSP-001, NJS-FSP-037, NJS-STR-012 |  |
| axios | Out of scope | — | HTTP client library; the concepts are covered under `fetch` |
| chalk package | Out of scope | — | Terminal colour library, not a Node concept |
| chokidar | Out of scope | NJS-FSP-019 | Library; the underlying `fs.watch` behaviour is covered |
| cli progress | Out of scope | — | Terminal UI library |
| commander | Out of scope | NJS-FSP-018 | Argument-parser library; `util.parseArgs` is covered instead |
| cypress | Out of scope | — | Browser E2E tool, belongs to frontend testing |
| ejs | Out of scope | NJS-GAP-025 | Specific engine; template engines are covered as a topic |
| figlet package | Out of scope | — | ASCII-art library |
| fs extra | Out of scope | NJS-ASY-007 | Library; built-in `fs/promises` is covered |
| globby | Out of scope | — | Library; built-in glob is covered |
| got package | Out of scope | — | HTTP client library |
| history of nodejs | Out of scope | — | Trivia, not interview-relevant |
| hono | Out of scope | — | Framework; Express and Fastify cover the concepts |
| inquirer package | Out of scope | — | Interactive-prompt library |
| ky | Out of scope | — | HTTP client library |
| marko | Out of scope | — | Niche template engine |
| mongoose | Out of scope | NJS-SEC-009 | ODM library; NoSQL injection is covered |
| morgan | Out of scope | — | Logging middleware library |
| passportjs | Out of scope | NJS-API-005 | Auth library; auth building blocks are covered |
| playwright | Out of scope | — | Browser E2E tool |
| prompts package | Out of scope | — | Interactive-prompt library |
| pug | Out of scope | NJS-GAP-025 | Specific engine; template engines are covered as a topic |
| sequelize | Out of scope | — | ORM library; ORM trade-offs are covered with Prisma, Drizzle, Knex and TypeORM |
| winston | Out of scope | — | Logging library; structured logging is covered |

## Gaps filled

27 questions were added in `content/exams/nodejs/questions/roadmap-gaps.json` (`NJS-GAP-001` to `NJS-GAP-027`), bringing the bank to 477 questions. Every code-behaviour claim was checked on Node 24.20 and npm 11:

- **Watch mode:** `--watch` restarts on the entry file and imported modules but not on files read with `fs`; `--watch-path` replaces module watching.
- **Assertions and errors:** `AssertionError` fields, `assert.throws` with the wrong class, `Error.captureStackTrace`, subclass `name`, `JSON.stringify` of errors, system error fields.
- **CLI and process:** `process.argv` with a script and with `-e`, reading piped stdin, `bin` links and `node_modules/.bin`, `node -p`.
- **npm:** `node --run` skipping pre and post scripts, `pre`/`post` order, workspaces linking and `-w`/`--if-present`, `npm update` and `npm outdated`, global installs and `require`.
- **Runtime globals:** module scope vs `globalThis`, the `navigator` global since Node 21, `fs.globSync` path separators.
- **Frameworks:** OpenTelemetry preloading, EJS escaping, Express view lookup.
