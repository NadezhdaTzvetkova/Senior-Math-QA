# Rule Catalogue

This catalogue is derived from `docs/source/candidate-spec.md` and defines the stable validation rule inventory for the take-home solution.

## Contract / Structure

| Rule ID                       | Category | Rule                                                 | Applicability                       | Expected Status Behavior  |
| ----------------------------- | -------- | ---------------------------------------------------- | ----------------------------------- | ------------------------- |
| C001_RESULT_PRESENT           | CONTRACT | `response.body.result` must exist and be an object   | Always                              | FAIL if missing/malformed |
| C002_WIN_PRESENT              | CONTRACT | `result.win` must exist and be an object             | Always                              | FAIL if missing/malformed |
| C003_WIN_LINES_PRESENT        | CONTRACT | `result.win.lines` must exist                        | Always                              | FAIL if missing           |
| C004_WIN_TOTAL_PRESENT        | CONTRACT | `result.win.total` must exist                        | Always                              | FAIL if missing           |
| C005_WINS_MULTIPLIERS_PRESENT | CONTRACT | `result.winsMultipliers` must exist and be an object | Always                              | FAIL if missing/malformed |
| C006_WM_LINES_PRESENT         | CONTRACT | `result.winsMultipliers.lines` must exist            | Always                              | FAIL if missing           |
| C007_WM_TOTAL_PRESENT         | CONTRACT | `result.winsMultipliers.total` must exist            | Always                              | FAIL if missing           |
| C008_STAKE_PRESENT            | CONTRACT | `result.stake` must exist                            | Always                              | FAIL if missing           |
| C009_MULTIPLIER_PRESENT       | CONTRACT | `result.multiplier` must exist                       | Always                              | FAIL if missing           |
| C010_SPIN_MODE_PRESENT        | CONTRACT | `result.spinMode` must exist                         | Always                              | FAIL if missing           |
| C011_REELS_BUFFER_PRESENT     | CONTRACT | `result.reelsBuffer` must exist                      | Always                              | FAIL if missing           |
| C012_WIN_LINES_ARRAY          | CONTRACT | `result.winLines`, when present, must be an array    | When field is present               | FAIL if wrong type        |
| C013_OPTIONAL_ARRAY_TYPES     | CONTRACT | Optional array fields must be arrays when present    | When corresponding field is present | FAIL if wrong type        |

Optional array fields include, where present:

- `cashSymbols`
- `collectors`
- `collectorsBuffer`
- `scatters`
- `features`

## Type / Format

| Rule ID                  | Category | Rule                                                                                |
| ------------------------ | -------- | ----------------------------------------------------------------------------------- |
| F001_WIN_LINES_DECIMAL   | FORMAT   | `win.lines` must be a decimal string with exactly two fractional digits             |
| F002_WIN_TOTAL_DECIMAL   | FORMAT   | `win.total` must be a decimal string with exactly two fractional digits             |
| F003_WM_LINES_DECIMAL    | FORMAT   | `winsMultipliers.lines` must be a decimal string with exactly two fractional digits |
| F004_WM_TOTAL_DECIMAL    | FORMAT   | `winsMultipliers.total` must be a decimal string with exactly two fractional digits |
| F005_STAKE_DECIMAL       | FORMAT   | `stake` must be a decimal string with exactly two fractional digits                 |
| T001_MULTIPLIER_NUMERIC  | TYPE     | `multiplier` must be a finite number                                                |
| T002_MULTIPLIER_POSITIVE | TYPE     | `multiplier` must be greater than zero                                              |
| T003_GAME_MODE_NUMERIC   | TYPE     | inner `gameMode`, when present, must be numeric                                     |
| E001_SPIN_MODE_ENUM      | ENUM     | `spinMode` must be one of `Normal`, `FreeSpins`, `WinSpins`, `WildSpins`, `Respin`  |

## winLines Entry Contract

Each `winLines` entry must contain the following required fields:

| Rule ID                         | Category | Field              |
| ------------------------------- | -------- | ------------------ |
| WL001_INDEX_PRESENT             | CONTRACT | `index`            |
| WL002_START_PRESENT             | CONTRACT | `start`            |
| WL003_LENGTH_PRESENT            | CONTRACT | `length`           |
| WL004_TILE_PRESENT              | CONTRACT | `tile`             |
| WL005_MULTIPLIER_PRESENT        | CONTRACT | `multiplier`       |
| WL006_AMOUNT_PRESENT            | CONTRACT | `amount`           |
| WL007_MULTIPLIED_AMOUNT_PRESENT | CONTRACT | `multipliedAmount` |
| WL008_TILES_PRESENT             | CONTRACT | `tiles`            |

Further type/format checks for these fields are evaluated only when the corresponding required field is present and structurally valid.

## Reels

| Rule ID                 | Category | Rule                                   | Applicability  |
| ----------------------- | -------- | -------------------------------------- | -------------- |
| R001_REELS_BUFFER_ARRAY | CONTRACT | `reelsBuffer` must be an array         | Always         |
| R002_BASE_MODE_WIDTH    | BOUNDS   | Base-mode visible reel width must be 5 | Base mode only |

Base mode is derived from the project state model and must not be inferred independently inside the rule.

## Mathematical / Cross-Field Consistency

| Rule ID                     | Category    | Rule                                                                                                   | Applicability / Prerequisites                                |
| --------------------------- | ----------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| M001_WIN_LINE_FORMULA       | CALCULATION | `multipliedAmount = amount × multiplier`                                                               | Valid numeric/decimal operands required                      |
| M002_CASH_SYMBOL_FORMULA    | CALCULATION | cash symbol `amount = multiplier × stake`                                                              | `cashSymbols` present and required operands valid            |
| M003_PLAIN_WIN_TOTAL        | CONSISTENCY | For plain line wins with no additional win components, `win.total = win.lines`                         | Only when state proves plain line-win case                   |
| M004_PLAIN_MULTIPLIER_TOTAL | CONSISTENCY | For plain line wins with no additional win components, `winsMultipliers.total = winsMultipliers.lines` | Only when state proves plain line-win case                   |
| M005_COMPONENT_AGGREGATION  | CALCULATION | Top-level totals must include supported additional components                                          | Only when supported component semantics are explicitly known |
| M006_NO_WIN_CONSISTENCY     | CONSISTENCY | In a proven no-win state, all four top-level win/multiplier totals must be `0.00`                      | Only when no-win state can be proven                         |

A failed prerequisite must normally produce `NOT_EVALUABLE`, not an additional derived FAIL.

## Bounds / Plausibility

| Rule ID                     | Category | Rule                                                                                                 |
| --------------------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| B001_REEL_INDEX_BOUNDS      | BOUNDS   | Reel/index coordinates must lie within the visible reel area where the coordinate basis is supported |
| B002_WIN_LINE_START_BOUNDS  | BOUNDS   | `winLines.start` must be within supported visible bounds                                             |
| B003_WIN_LINE_LENGTH_BOUNDS | BOUNDS   | `winLines.length` must not exceed supported visible boundaries                                       |
| B004_SYMBOL_KNOWN_SET       | BOUNDS   | Symbols must belong to the authoritative known-symbol set when such configuration is supplied        |

`B004_SYMBOL_KNOWN_SET` is `NOT_EVALUABLE` when no authoritative symbol configuration is provided.

## Rule Evaluation Statuses

Allowed statuses are exactly:

- `PASS`
- `FAIL`
- `NOT_APPLICABLE`
- `NOT_EVALUABLE`

## General Evaluation Principles

- Presence, type, format, applicability, and calculation are separate concerns.
- Do not convert malformed input before validation.
- Do not use frequency patterns across fixtures to infer expected behavior.
- Do not recreate gameplay logic beyond what the specification supports.
- Do not recursively sum arbitrary monetary-looking fields.
- Do not introduce unspecified rounding rules.
- Preserve original values and paths in failure evidence.
- Stable rule IDs must be used in reports and tests.
- A prerequisite defect should prevent cascaded false-positive calculation failures.
