# Mathematical Validation Strategy

This repository treats the candidate specification as the source of truth. Mathematical checks are implemented only where the specification establishes an explicit relationship; fixture frequency is never used to infer gameplay semantics.

## Exact monetary arithmetic

Monetary strings are parsed into integer minor units. Arithmetic uses exact integer checks and rejects unsafe or fractional minor-unit results instead of inventing a rounding rule. Signed zero is canonicalized to ordinary zero.

Boundary coverage includes zero, one cent, negative minor units, the JavaScript safe-integer limits, first values outside those limits, exact-edge multiplication, overflow, finite/non-finite multipliers, and fractional multipliers that either do or do not produce an exact minor-unit result.

## Property-based and metamorphic testing

Deterministic fast-check seeds exercise hundreds of generated cases per property. The suite covers:

- M001 win-line multiplication.
- M002 cash-symbol multiplication.
- M005 supported-component aggregation.
- reel-segment bounds under configurable reel widths.
- one-cent mutations and defect localization.
- scaling metamorphisms for dependent monetary values.
- permutation invariance for independently valid win lines.
- zero-component invariance.
- omitted and duplicated supported contributions.
- generated multiplier-domain behavior and overflow.

Shrinking is retained so a failing generated case is reduced to a minimal counterexample while remaining reproducible from its fixed seed.

## Independent mathematical oracle

Selected arithmetic properties are cross-checked against test-only BigInt helpers rather than production decimal helpers. This reduces the risk of reproducing the same implementation defect in both the validator and its expected-value calculation.

The independent oracle covers integer multiplication, exact monetary formatting, and supported-component summation.

## Defect localization

Controlled mutations verify not only that a defect is detected, but that the owning rule reports it without fabricating unrelated structural failures. Examples include:

- a one-cent line amount mutation;
- a one-cent aggregate-total mutation;
- corruption in a later win-line entry;
- an omitted supported component;
- a duplicated supported contribution;
- malformed versus missing prerequisites.

## Deliberately excluded assumptions

The validator does not infer undocumented behavior. In particular:

- it does not infer RTP, probability distributions, fairness, or reel frequencies from the supplied fixture sample;
- it does not infer a known symbol set unless one is supplied through authoritative configuration;
- it does not infer that `win.lines` equals the sum of `winLines[].multipliedAmount` unless the specification explicitly establishes that relationship;
- it does not infer a no-win state solely from an empty or absent `winLines` collection;
- it does not invent a rounding rule for fractional minor-unit arithmetic.

These constraints are intentional: the project is a specification-driven response-contract validator, not a reconstruction of the slot game's hidden mathematical model.
