# Assumptions and Specification Ambiguities

This document records only ambiguities, implementation interpretations, and deliberately unsupported areas for the Senior Math QA take-home.

The goal is to make every non-explicit assumption visible and reviewable.

## A001 — Fixture Envelope Mismatch

The specification describes an outer fixture envelope containing fields such as:

- `capturedAt`
- `mathName`
- `gameMode`
- `index`
- `injectedBugs`
- `response`

However, the supplied fixture set appears to expose only `response` at the top level.

Implementation decision:

- The validator will treat `response.body.result` as the primary validation target because the specification explicitly identifies it as such.
- The validator will not generate the same outer-envelope failure for every supplied fixture when the supplied dataset itself consistently omits those fields.
- The mismatch will be documented once in the final report/design notes.
- The implementation must not use `injectedBugs` as an oracle even if such metadata is available elsewhere.

Rationale:
Repeatedly failing every fixture for a dataset/spec packaging mismatch would obscure the actual response-validation defects and reduce report usefulness.

## A002 — Java Requirement vs Approved TypeScript

The written assignment states that Java should be used.

A follow-up discussion with the recruiter clarified that there is no language restriction for the take-home task.

Implementation decision:

- TypeScript is used for the submitted solution.
- The README will state that the written assignment mentioned Java, while the follow-up clarification allowed another language.
- TypeScript was selected to focus on validation architecture, traceability, runtime safety, and defect detection.
- The architecture should remain conceptually transferable to Java.

## A003 — Definition of Base Mode

The specification states that the expected visible width is 5 reels in base mode but does not formally define "base mode".

Implementation interpretation:

- `spinMode === "Normal"` is treated as the base-mode indicator unless stronger specification evidence contradicts this.
- This interpretation must be centralized in `src/domain/spin-state.ts`.
- Individual validators must not independently infer base mode.

Risk:
If the intended definition of base mode differs from `Normal`, only the centralized state derivation should need adjustment.

## A004 — No-Win Predicate Is Underspecified

The specification states that in a no-win case:

- `win.lines = 0.00`
- `win.total = 0.00`
- `winsMultipliers.lines = 0.00`
- `winsMultipliers.total = 0.00`

However, the specification does not fully define how a no-win state must be proven.

Implementation decision:

- An empty or absent `winLines` collection alone is not sufficient proof of no win.
- The validator must consider supported additional win components before classifying a response as no-win.
- If the available state is insufficient to prove the no-win condition, `M006_NO_WIN_CONSISTENCY` returns `NOT_EVALUABLE` rather than inventing a predicate.

## A005 — Additional Component Aggregation

The specification states that extra components such as:

- `freeSpins`
- `respin`
- `instantWin`

must contribute to total values when applicable.

However, the specification does not provide a universal recursive aggregation algorithm for all nested structures.

Implementation decision:

- Only explicitly supported component semantics are included in aggregation checks.
- The validator must not recursively sum arbitrary monetary-looking fields.
- Nested debug or bookkeeping fields must not be interpreted as payable components without specification support.
- If the component structure is present but its exact aggregation semantics cannot be established, the corresponding calculation rule returns `NOT_EVALUABLE`.

## A006 — Symbol Set Is Not Supplied

The specification allows symbol validation when a known symbol set is supplied in configuration context.

No authoritative symbol configuration is currently available.

Implementation decision:

- `B004_SYMBOL_KNOWN_SET` remains implemented as a rule contract.
- Without an authoritative symbol set, the rule returns `NOT_EVALUABLE`.
- Symbols must not be inferred from frequency across fixtures.

## A007 — Coordinate / Index Bounds Are Only Partially Defined

The specification defines a 5x3 visible slot layout and requires coordinate plausibility checks.

However, it does not fully define:

- whether indexes are zero-based or one-based;
- whether every index refers to visible-screen coordinates;
- all valid interpretations of `start`, `index`, and `tiles`.

Implementation decision:

- Enforce only bounds that are supported by explicit structure and unambiguous coordinate semantics.
- Do not invent an index base.
- Ambiguous coordinate checks return `NOT_EVALUABLE` rather than producing speculative failures.

## A008 — Decimal-Safe Arithmetic

Monetary fields are represented as decimal strings with exactly two fractional digits.

Implementation decision:

- Format validation occurs before numeric interpretation.
- Monetary values must not be normalized before format validation.
- Exact monetary equality must not rely on binary floating-point equality.
- Values with exactly two fractional digits may be converted to integer minor units for exact addition/comparison.
- Multiplication involving non-integer multipliers must use a decimal-safe strategy.
- No rounding rule will be invented if the specification does not define one.

## A009 — Debug Fields Are Non-Failing by Themselves

The specification explicitly identifies debug-style fields that must not cause a validation failure solely because they are present:

- `rngResults`
- `tilesCount`
- `screenReels`
- `screenRows`
- `screenString`
- `seed`

Implementation decision:
These fields are ignored unless a future explicit specification rule assigns them validation semantics.

## A010 — Malformed Presence Must Not Become Absence

Optional fields may legitimately be absent.

However, a present-but-malformed field is not equivalent to an absent field.

Implementation decision:
State derivation and applicability checks must distinguish, where needed:

- absent
- present but empty
- present with values
- malformed

This prevents malformed state from silently bypassing dependent validation rules.

## A011 — Prerequisite Failure and Cascading Findings

A downstream calculation cannot be meaningfully evaluated if one of its required operands is missing, malformed, or invalid.

Implementation decision:

- The primary contract/type/format defect is reported.
- Dependent calculation rules normally return `NOT_EVALUABLE`.
- The validator must avoid reporting multiple misleading arithmetic failures caused by a single malformed prerequisite.

## A012 — No Frequency-Derived Oracle

The fixture set must not be treated as a statistical source of truth.

Implementation decision:

- Majority patterns across fixtures never define expected behavior.
- A field is not considered correct merely because most fixtures use the same shape/value pattern.
- A rare fixture is not considered defective merely because it differs.
- All verdicts must be traceable to the specification or explicitly documented assumptions in this file.

## A013 — Scope Is Contract Validation, Not Gameplay Reconstruction

The task requires response validation rather than implementation of the underlying slot game.

Implementation decision:
The solution will not attempt to reconstruct:

- RNG behavior
- RTP
- game probability distributions
- bonus lifecycle
- feature sequencing
- round progression
- undocumented state transitions
- provider-specific gameplay mechanics

Only specification-supported structural, format, consistency, calculation, and plausibility checks are in scope.

## A014 — Optional Collections

Optional collections may legitimately be absent.

Implementation decision:

- absence alone produces `NOT_APPLICABLE` for rules specific to that collection;
- presence with the wrong runtime type is a contract `FAIL`;
- presence with a valid empty array remains distinct from absence when state derivation needs that distinction.

## Review Rule

If implementation discovers a new ambiguity that materially affects a validation verdict:

1. do not silently encode an assumption;
2. add the ambiguity here;
3. state the chosen conservative behavior;
4. prefer `NOT_EVALUABLE` over a speculative `FAIL` where correctness cannot be proven.
