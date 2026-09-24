# Senior Math QA — Specification-Driven Validation Suite

TypeScript validation framework for the Senior Math QA take-home exercise. The suite validates the supplied slot-spin API response fixtures against the provided candidate specification, focusing on contract correctness, runtime types and formats, supported calculations, cross-field consistency, and safely verifiable bounds without recreating the game engine.

## Quick Start

Requirements: Node.js 24.x and npm.

```powershell
npm ci
npm test
npm run coverage
npm run validate
```

Static quality gates:

```powershell
npm run typecheck
npm run lint
npm run format:check
```

## Final Verification State

- 30 supplied fixtures
- 42 validation rules per fixture
- 1,260 production rule evaluations
- 14 automated test files
- 158 automated tests
- 32 confirmed findings
- 26 fixtures with confirmed findings
- 4 fixtures without confirmed findings

Measured coverage:

- Statements: 93.71%
- Branches: 88.69%
- Functions: 100%
- Lines: 93.65%

Enforced minimum coverage thresholds:

- Statements: 90%
- Branches: 85%
- Functions: 100%
- Lines: 90%

## Reports

`npm run validate` evaluates all supplied fixtures and generates both reports from the same canonical result model:

- `reports/human/validation-report.txt`
- `reports/json/validation-report.json`

Each confirmed failure can contain the fixture name, stable rule ID, category, specification reference, JSON path, expected value/state, actual value/state, and explanation. Missing values are represented explicitly rather than being silently omitted.

## Validation Status Model

Every rule returns exactly one of four statuses:

- `PASS` — applicable, prerequisites valid, condition satisfied.
- `FAIL` — applicable and a confirmed specification violation was found.
- `NOT_APPLICABLE` — the rule is valid but does not apply to the current response state.
- `NOT_EVALUABLE` — prerequisites are missing, malformed, ambiguous, or insufficiently specified.

Dependent rules generally return `NOT_EVALUABLE` when a prerequisite fails instead of producing duplicate or speculative defects.

## Architecture

```text
fixture JSON
  -> JSON.parse()
  -> unknown
  -> runtime guards / safe path access
  -> ValidationContext
  -> centralized spin-state derivation
  -> RuleRegistry
  -> ValidationEngine
  -> RuleEvaluation[]
  -> fixture summaries
  -> human report + JSON report
```

Key source areas:

```text
src/
  domain/spin-state.ts
  parsing/guards.ts
  reporting/findings.ts
  rules/
    bounds/
    calculations/
    contract/
    format/
    registry.ts
  utils/decimal.ts
  validation/context.ts
  validation/engine.ts
  validation/rule.ts
  run-validation.ts

tests/
  adversarial/
  fixtures/
  reporting/
  rules/
  run-validation.test.ts
```

## Runtime Trust Boundary

Fixture JSON is untrusted runtime data. Parsed payloads enter the validator as `unknown`. The implementation does not cast the complete response into a trusted DTO and does not silently coerce malformed values. Numeric strings are not accepted where numbers are required, numbers are not converted into monetary strings, missing and malformed states remain distinguishable, and raw invalid values are retained for evidence.

## Rule Categories

Rules use stable IDs and are grouped into:

- `CONTRACT`
- `TYPE_FORMAT`
- `CALCULATION`
- `CONSISTENCY`
- `BOUNDS`

Representative validations include required result fields, object structure, optional-array types, required `winLine` fields, exact two-decimal monetary format, numeric multiplier and optional `gameMode`, `spinMode` enum values, `winLine.multipliedAmount = amount * multiplier`, `cashSymbol.amount = multiplier * stake`, supported component aggregation, plain line-total consistency, base-mode reel width, and safely defined `winLine` start/length bounds.

See `docs/RULE_CATALOGUE.md` for the complete rule catalogue.

## Exact Monetary Arithmetic

Monetary strings are format-validated before calculation and converted to integer minor units. For example, `"2.00"` becomes `200` and `"0.40"` becomes `40`. This avoids floating-point equality for money. If an operation cannot be represented exactly in integer minor units, the mathematical rule returns `NOT_EVALUABLE` instead of inventing an unspecified rounding policy.

## Specification-First Approach

The fixture set is not used as an oracle. Expected behaviour is not inferred from majority patterns, fixture frequency, fixture ordering, hidden labels, injected bug metadata, or undocumented gameplay assumptions. Expected results are derived from the supplied specification and documented assumptions.

## Conservative Decisions

### No-win state

Empty or absent `winLines` alone is not treated as authoritative proof of a no-win gameplay state. Without a stronger indicator in the supplied specification, the validator avoids manufacturing a failure.

### Symbol membership

No authoritative symbol-set configuration was supplied, so symbol-membership validation remains `NOT_EVALUABLE` rather than deriving a dictionary from observed fixture values.

### Win-line index semantics

The supplied material does not define a sufficiently authoritative index base or coordinate mapping for `winLine.index`, so the validator does not invent one.

### Additional monetary components

Only explicitly supported components such as `instantWin`, `freeSpins`, and `respin` participate in supported aggregation. The implementation does not recursively sum arbitrary monetary-looking fields.

See `docs/ASSUMPTIONS.md` for detailed interpretation decisions and ambiguities.

## Independent Fixture Oracle

`tests/fixtures/all-fixtures-audit.test.ts` contains explicit expected confirmed-failure rule IDs for all 30 supplied fixtures. These expectations were derived independently from specification analysis rather than generated from the validator or from fixture metadata.

## Adversarial Tests

Synthetic adversarial tests supplement the supplied fixtures and cover malformed results, missing prerequisites, malformed collections and later array entries, non-finite numbers, zero and negative multipliers, unsafe integer arithmetic, values outside safe minor-unit representation, unspecified rounding cases, malformed bounds data, missing reporting evidence, and clean fixtures with no findings.

## Documentation

- `docs/ASSUMPTIONS.md` — assumptions and unresolved specification ambiguities
- `docs/RULE_CATALOGUE.md` — rule catalogue and intent
- `docs/RESPONSE_ANALYSIS.md` — manual fixture-by-fixture analysis

## Language Choice

The written assignment mentions Java. During recruiter communication, use of another implementation language was explicitly allowed. TypeScript was selected so the exercise could focus on validation architecture, runtime trust boundaries, traceability, deterministic rule evaluation, and mathematical correctness.

## Design Trade-offs

The solution favors explicit runtime guards, focused rules, deterministic ordering, prerequisite-aware evaluation, exact monetary arithmetic, structured evidence, conservative interpretation of ambiguity, and avoidance of false positives. It intentionally avoids gameplay reconstruction, RTP simulation, RNG/statistical validation, speculative symbol dictionaries, implicit coercion, arbitrary recursive aggregation, and frequency-based fixture inference.

## Final Review

A reviewer can reproduce the main checks with:

```powershell
npm ci
npm run typecheck
npm run lint
npm run format:check
npm test
npm run coverage
npm run validate
```

The generated validation reports are available under `reports/`.
