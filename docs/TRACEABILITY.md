# Specification Traceability Matrix

This matrix connects specification intent to executable rules, automated tests, benchmark evidence, and reporting. It is intentionally specification-first: fixture frequency is never treated as a requirement.

| Requirement / invariant                                                        | Rule(s)                      | Automated verification                      | Benchmark evidence                         |
| ------------------------------------------------------------------------------ | ---------------------------- | ------------------------------------------- | ------------------------------------------ |
| `response.body.result` must be available                                       | `C001_RESULT_PRESENT`        | core contract + regression tests            | structural prerequisite coverage           |
| `win`, `winsMultipliers`, stake, multiplier, spinMode and reelsBuffer contract | `C002`–`C011`                | core contract tests                         | supplied fixture oracle                    |
| `win.lines` / `win.total` / stake monetary format                              | `F001`, `F002`, `F005`       | format tests + adversarial decimal tests    | 009, 010, 011, 012, 024, 025, 030          |
| `winsMultipliers` monetary format                                              | `F003`, `F004`               | format tests                                | fixture oracle                             |
| multiplier numeric and positive                                                | `T001`, `T002`               | format + adversarial tests                  | 003, 004, 018                              |
| optional inner gameMode numeric                                                | `T003`                       | format tests                                | 005, 018, 019                              |
| supported spin mode enum                                                       | `E001`                       | core contract tests                         | 014, 027, 028                              |
| each win-line calculation is exact                                             | `M001_WIN_LINE_FORMULA`      | calculation + adversarial tests             | supported line-win fixtures                |
| each cash-symbol calculation is exact                                          | `M002_CASH_SYMBOL_FORMULA`   | calculation + adversarial tests             | cash-symbol fixtures                       |
| plain totals remain internally coherent                                        | `M003`, `M004`               | consistency tests                           | fixture oracle                             |
| named additional components aggregate exactly                                  | `M005_COMPONENT_AGGREGATION` | consistency tests                           | 002                                        |
| no-win semantics are not inferred beyond the specification                     | `M006_NO_WIN_CONSISTENCY`    | conservative consistency tests              | 015, 017, 030 documented as ambiguous      |
| reelsBuffer must be an array                                                   | `R001_REELS_BUFFER_ARRAY`    | bounds tests                                | structural coverage                        |
| base-mode width equals configured visible reel count                           | `R002_BASE_MODE_WIDTH`       | bounds tests                                | 012, 026                                   |
| win-line start and segment remain in configured bounds                         | `B002`, `B003`               | bounds + adversarial tests                  | bounds fixtures                            |
| symbol membership is checked only when authoritative configuration exists      | `B004_SYMBOL_KNOWN_SET`      | configuration-driven tests (extended phase) | intentionally NOT_EVALUABLE without config |

## Traceability policy

A rule is considered fully traceable when the repository contains:

1. a stable rule ID and specification reference;
2. focused automated verification of PASS/FAIL/applicability behavior;
3. benchmark or adversarial evidence where appropriate;
4. deterministic reporting of the resulting status and evidence.

Ambiguous requirements stay explicitly documented instead of being inferred from fixture frequency.
