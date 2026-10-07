# Python coverage against roadmap.sh

Roadmap: [roadmap.sh/python](https://roadmap.sh/python), 87 topics (source: `nilbuild/developer-roadmap`, `roadmaps/python/content/`). Audited on 7 October 2026 against the `python` bank (450 questions before this audit, 485 after).

Coverage = (covered + 0.5 × partial) / in-scope topics.

| | Covered | Partial | Missing | Out of scope | Coverage |
|---|---|---|---|---|---|
| Before | 48 | 12 | 13 | 14 | 74.0% |
| After | 66 | 7 | 0 | 14 | 95.2% |

## Topics

| Topic | Status | Questions | Notes |
|---|---|---|---|
| Aiohttp | partial (was missing) | `PYM-GAP-029` | Session and connection-pool reuse. |
| Gevent | partial (was missing) | `PYM-GAP-030` | Monkey-patching order. |
| Paradigms | partial | `PYM-COL-013`, `PYM-DAT-009`, `PYM-FUN-021` | Functional style appears incidentally; no item on paradigms as such. |
| Poetry | partial | `PYM-STD-029` | Mentioned alongside uv and pip-tools. |
| Pyright | partial | `PYM-TYP-001`, `PYM-TYP-011` | Named as an alternative to mypy; pyright-specific behaviour is not verified here. |
| Ruff | partial (was missing) | `PYM-GAP-032` | Tool role only. |
| Tox | partial (was missing) | `PYM-GAP-032` | Tool role only. |
| @ (matrix multiplication operator) | covered (was missing) | `PYM-GAP-035` | The `@` matrix-multiplication operator (PEP 465). |
| Arrays and linked lists | covered (was partial) | `PYM-PRF-004`, `PYM-GAP-008`, `PYM-GAP-009` | `array` module typing and range checks; linked-list reversal. |
| Asynchrony | covered | `PYM-CNC-003`, `PYM-CNC-004`, `PYM-CNC-005`, `PYM-CNC-007`, `PYM-CNC-008`, `PYM-CNC-010` | asyncio tasks, cancellation, TaskGroup, blocking the loop. |
| Basic syntax | covered (was partial) | `PYM-ERR-036`, `PYM-FUN-022`, `PYM-GAP-001` | Implicit string concatenation added. |
| Binary search tree | covered (was missing) | `PYM-GAP-010`, `PYM-GAP-011` | Traversal orders and degenerate trees. |
| Black | covered (was missing) | `PYM-GAP-031`, `PYM-GAP-032` | Magic trailing comma; tool roles. |
| Builtin | covered | `PYM-COL-006`, `PYM-CNC-019`, `PYM-CNC-023`, `PYM-CNC-034`, `PYM-CNC-045`, `PYM-DAT-003` |  |
| Classes | covered | `PYM-OOP-001`, `PYM-OOP-002`, `PYM-OOP-006`, `PYM-OOP-013` |  |
| Code formatting | covered (was missing) | `PYM-GAP-001`, `PYM-GAP-031`, `PYM-GAP-032` |  |
| Comments | covered (was partial) | `PYM-FUN-044`, `PYM-GAP-007` | Docstring rules added. |
| Common packages | covered (was partial) | `PYM-PRF-019`, `PYM-GAP-026`, `PYM-GAP-027`, `PYM-GAP-028` | requests timeouts, NumPy broadcasting and overflow. |
| Concurrency | covered | `PYM-COL-039`, `PYM-CNC-001`, `PYM-CNC-002`, `PYM-CNC-003`, `PYM-CNC-004`, `PYM-CNC-005` |  |
| Conditionals | covered (was partial) | `PYM-TYP-026`, `PYM-OOP-009`, `PYM-GAP-002`, `PYM-GAP-003`, `PYM-GAP-004` | `match` capture patterns and conditional-expression precedence added. |
| Context manager | covered | `PYM-ITR-028`, `PYM-ITR-029`, `PYM-ITR-030`, `PYM-ITR-031` |  |
| Custom | covered | `PYM-ERR-010`, `PYM-ERR-011`, `PYM-ERR-022` | Custom exception classes. |
| Decorators | covered | `PYM-ERR-016`, `PYM-ERR-027`, `PYM-FUN-007`, `PYM-FUN-013`, `PYM-FUN-014`, `PYM-FUN-019` |  |
| Dictionaries | covered | `PYM-COL-003`, `PYM-COL-005`, `PYM-COL-006`, `PYM-COL-007`, `PYM-COL-008`, `PYM-COL-011` |  |
| Django | covered (was missing) | `PYM-GAP-018`, `PYM-GAP-019`, `PYM-GAP-020` | ORM N+1, QuerySet caching, `select_related` vs `prefetch_related`. |
| Doctest | covered (was missing) | `PYM-GAP-014`, `PYM-GAP-015` |  |
| Encapsulation | covered | `PYM-OOP-005`, `PYM-OOP-030` | Name mangling and its limits. |
| Error handling | covered | `PYM-COL-022`, `PYM-COL-030`, `PYM-CNC-011`, `PYM-CNC-012`, `PYM-CNC-017`, `PYM-CNC-020` |  |
| Exceptions | covered | `PYM-COL-022`, `PYM-COL-030`, `PYM-CNC-011`, `PYM-CNC-012`, `PYM-CNC-017`, `PYM-CNC-020` |  |
| Fast api | covered (was partial) | `PYM-TYP-028`, `PYM-GAP-023`, `PYM-GAP-024`, `PYM-GAP-025` | Sync vs async endpoints, `response_model`, dependencies with `yield`. |
| File handling | covered | `PYM-ITR-007`, `PYM-ITR-013`, `PYM-STD-016`, `PYM-STD-018`, `PYM-STD-024` |  |
| Flask | covered (was missing) | `PYM-GAP-021`, `PYM-GAP-022` | Application context and debug mode in production. |
| Functions builtin functions | covered | `PYM-COL-001`, `PYM-COL-004`, `PYM-COL-014`, `PYM-COL-016`, `PYM-COL-017`, `PYM-COL-018` |  |
| Generator expressions | covered | `PYM-CNC-015`, `PYM-FUN-021`, `PYM-ITR-020`, `PYM-ITR-021`, `PYM-ITR-039`, `PYM-ITR-045` |  |
| Gil | covered | `PYM-CNC-001`, `PYM-CNC-002`, `PYM-CNC-004`, `PYM-CNC-009`, `PYM-CNC-024`, `PYM-CNC-025` |  |
| Glob | covered (was missing) | `PYM-GAP-012`, `PYM-GAP-013` | `**` without `recursive=True`; hidden files in glob vs pathlib. |
| Hashmaps | covered | `PYM-COL-006`, `PYM-COL-008`, `PYM-COL-018`, `PYM-COL-029`, `PYM-CNC-027`, `PYM-DAT-003` |  |
| Heaps stacks and queues | covered | `PYM-COL-006`, `PYM-COL-023`, `PYM-COL-031`, `PYM-COL-042` |  |
| Inheritance | covered | `PYM-OOP-010`, `PYM-OOP-016`, `PYM-OOP-019`, `PYM-OOP-020` |  |
| Iterators | covered | `PYM-COL-022`, `PYM-COL-034`, `PYM-COL-039`, `PYM-CNC-019`, `PYM-CNC-028`, `PYM-ITR-001` |  |
| Lambdas | covered | `PYM-COL-016`, `PYM-COL-032`, `PYM-COL-037`, `PYM-COL-040`, `PYM-COL-043`, `PYM-CNC-015` |  |
| List comprehensions | covered | `PYM-COL-013`, `PYM-COL-025`, `PYM-DAT-009`, `PYM-FUN-010`, `PYM-FUN-021`, `PYM-FUN-028` |  |
| Lists | covered | `PYM-COL-001`, `PYM-COL-002`, `PYM-COL-009`, `PYM-COL-011` |  |
| Loops | covered (was partial) | `PYM-FUN-011`, `PYM-GAP-005`, `PYM-GAP-006` | `for`/`else` and loop-variable scope added. |
| Methods | covered | `PYM-DAT-029`, `PYM-FUN-026`, `PYM-FUN-036`, `PYM-OOP-003`, `PYM-OOP-007`, `PYM-OOP-012` |  |
| Modules | covered | `PYM-STD-001`, `PYM-STD-002`, `PYM-STD-005`, `PYM-STD-010` |  |
| Multiprocessing | covered | `PYM-CNC-001`, `PYM-CNC-004`, `PYM-CNC-014`, `PYM-CNC-015`, `PYM-CNC-016`, `PYM-CNC-026` |  |
| Mypy | covered | `PYM-TYP-001`, `PYM-TYP-006`, `PYM-TYP-007`, `PYM-TYP-009`, `PYM-TYP-010`, `PYM-TYP-011` |  |
| Object oriented programming | covered | `PYM-OOP-003`, `PYM-OOP-008`, `PYM-OOP-012` |  |
| Operators | covered | `PYM-COL-012`, `PYM-COL-026`, `PYM-COL-036`, `PYM-COL-041`, `PYM-DAT-003`, `PYM-DAT-010` |  |
| Package managers | covered | `PYM-STD-015`, `PYM-STD-029`, `PYM-STD-030`, `PYM-GAP-034` |  |
| Pip | covered | `PYM-STD-015`, `PYM-STD-029`, `PYM-STD-030`, `PYM-STD-034` |  |
| Pydantic | covered | `PYM-TYP-001`, `PYM-TYP-002`, `PYM-TYP-008`, `PYM-TYP-018`, `PYM-TYP-028`, `PYM-TYP-038` |  |
| Pypi | covered (was missing) | `PYM-GAP-033` | Immutable file names and post-releases. |
| Pyprojecttoml | covered | `PYM-STD-017`, `PYM-STD-018` |  |
| Pytest | covered | `PYM-ERR-003`, `PYM-ERR-006`, `PYM-ERR-015`, `PYM-ERR-016`, `PYM-ERR-019`, `PYM-ERR-028` |  |
| Recursion | covered | `PYM-CNC-024`, `PYM-DAT-015`, `PYM-DAT-036`, `PYM-DAT-044`, `PYM-FUN-017`, `PYM-OOP-025` |  |
| Regular expressions | covered | `PYM-ERR-031`, `PYM-STD-014`, `PYM-STD-027`, `PYM-STD-040`, `PYM-STD-044` |  |
| Sets | covered | `PYM-COL-003`, `PYM-COL-008`, `PYM-COL-018`, `PYM-COL-020` |  |
| Sorting algorithms | covered | `PYM-COL-016`, `PYM-COL-019`, `PYM-COL-021`, `PYM-PRF-010` | Timsort stability, key functions. |
| Static typing | covered | `PYM-FUN-044`, `PYM-PRF-022`, `PYM-PRF-038`, `PYM-TYP-001`, `PYM-TYP-002`, `PYM-TYP-003` |  |
| Testing | covered | `PYM-ERR-003`, `PYM-ERR-006`, `PYM-ERR-015`, `PYM-ERR-017` |  |
| Threading | covered | `PYM-COL-039`, `PYM-CNC-001`, `PYM-CNC-002`, `PYM-CNC-004`, `PYM-CNC-006`, `PYM-CNC-007` |  |
| Tuples | covered | `PYM-COL-006`, `PYM-COL-023`, `PYM-COL-033`, `PYM-COL-040`, `PYM-DAT-003`, `PYM-DAT-008` |  |
| Type annot | covered | `PYM-FUN-044`, `PYM-PRF-022`, `PYM-PRF-038`, `PYM-TYP-001`, `PYM-TYP-002`, `PYM-TYP-003` |  |
| Type casting | covered | `PYM-DAT-018`, `PYM-DAT-023`, `PYM-DAT-036` |  |
| Typing | covered | `PYM-ITR-008`, `PYM-ITR-018`, `PYM-ITR-027`, `PYM-OOP-012`, `PYM-TYP-002`, `PYM-TYP-003` |  |
| Unittest / pyunit | covered (was partial) | `PYM-ERR-017`, `PYM-ERR-032`, `PYM-ERR-038`, `PYM-GAP-016`, `PYM-GAP-017` | `setUpClass` and `subTest` added. |
| Uv | covered (was partial) | `PYM-STD-029`, `PYM-GAP-032`, `PYM-GAP-034` |  |
| Variable scope | covered | `PYM-COL-035`, `PYM-CNC-001`, `PYM-CNC-034`, `PYM-CNC-045`, `PYM-ERR-015`, `PYM-ERR-040` |  |
| Variables and data types | covered | `PYM-COL-006`, `PYM-COL-013`, `PYM-DAT-003`, `PYM-DAT-008`, `PYM-DAT-009`, `PYM-DAT-011` |  |
| Virtualenv | covered | `PYM-STD-015`, `PYM-STD-030` |  |
| Working with strings | covered | `PYM-COL-004`, `PYM-COL-010`, `PYM-COL-020`, `PYM-STD-008` |  |
| Conda | out of scope | – | Environment tool; virtual environments, pip and uv are covered. |
| Data structures / algorithms | out of scope | – | Section heading; its sub-topics are audited individually. |
| Learn a framework | out of scope | – | Section heading; Django, Flask and FastAPI are audited individually. |
| Learn the basics | out of scope | – | Section heading; its sub-topics are audited individually. |
| Pdm | out of scope | – | Alternative package manager; uv, pip and Poetry are covered. |
| Pipenv | out of scope | – | Legacy package manager; uv, pip and Poetry are covered. |
| Plotly dash | out of scope | – | Data-visualisation framework; outside a general Python interview. |
| Pyenv | out of scope | – | Interpreter version installer; not interview material. |
| Pyramid | out of scope | – | Niche web framework; rarely asked in interviews. |
| Pyre | out of scope | – | Niche type checker; mypy and pyright are covered. |
| Sanic | out of scope | – | Niche async framework; async web concepts are covered via FastAPI and asyncio. |
| Sphinx | out of scope | – | Documentation generator; docstrings are covered instead. |
| Tornado | out of scope | – | Niche framework; event-loop concepts are covered in concurrency. |
| Yapf | out of scope | – | Rarely used formatter; Black and ruff are covered. |

## Gaps filled

35 questions in `content/exams/python/questions/roadmap-gaps.json` (`PYM-GAP-001` to `PYM-GAP-035`). Every snippet was run on Python 3.13.7; framework items were checked against Django 6.1, Flask 3.1, FastAPI 0.142, NumPy 2.5, requests 2.34, aiohttp 3.14 and Black 26.10, installed only in a scratch folder.

| Topic | Questions |
|---|---|
| @ (matrix multiplication operator) | `PYM-GAP-035` |
| Aiohttp | `PYM-GAP-029` |
| Arrays and linked lists | `PYM-GAP-008`, `PYM-GAP-009` |
| Basic syntax | `PYM-GAP-001` |
| Binary search tree | `PYM-GAP-010`, `PYM-GAP-011` |
| Black | `PYM-GAP-031`, `PYM-GAP-032` |
| Code formatting | `PYM-GAP-001`, `PYM-GAP-031`, `PYM-GAP-032` |
| Comments | `PYM-GAP-007` |
| Common packages | `PYM-GAP-026`, `PYM-GAP-027`, `PYM-GAP-028` |
| Conditionals | `PYM-GAP-002`, `PYM-GAP-003`, `PYM-GAP-004` |
| Django | `PYM-GAP-018`, `PYM-GAP-019`, `PYM-GAP-020` |
| Doctest | `PYM-GAP-014`, `PYM-GAP-015` |
| Fast api | `PYM-GAP-023`, `PYM-GAP-024`, `PYM-GAP-025` |
| Flask | `PYM-GAP-021`, `PYM-GAP-022` |
| Gevent | `PYM-GAP-030` |
| Glob | `PYM-GAP-012`, `PYM-GAP-013` |
| Loops | `PYM-GAP-005`, `PYM-GAP-006` |
| Package managers | `PYM-GAP-034` |
| Pypi | `PYM-GAP-033` |
| Ruff | `PYM-GAP-032` |
| Tox | `PYM-GAP-032` |
| Unittest / pyunit | `PYM-GAP-016`, `PYM-GAP-017` |
| Uv | `PYM-GAP-032`, `PYM-GAP-034` |

Still partial: aiohttp, gevent, ruff and tox (one item each, tool role or one behaviour), Poetry and pyright (mentioned only), and paradigms (functional style appears only incidentally).
