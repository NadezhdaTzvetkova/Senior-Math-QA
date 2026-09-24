# Validation Dependency Model

The validation engine deliberately distinguishes primary defects from downstream consequences. This prevents one malformed prerequisite from generating a cascade of misleading failures.

## Status model

- `PASS` — the rule was applicable, evaluable and satisfied.
- `FAIL` — the rule was applicable, evaluable and contradicted the specification.
- `NOT_APPLICABLE` — the rule is valid but does not apply to the current response state.
- `NOT_EVALUABLE` — required structural, type, configuration or semantic prerequisites are unavailable.

## Typical dependency chains

```text
required field / structure
        |
        v
type / canonical format
        |
        v
mathematical invariant
        |
        v
cross-field / aggregate consistency
```

Example:

```text
C004 win.total present
        |
        v
F002 win.total canonical money format
        |
        v
M003 / M005 / M006 total consistency
```

If `win.total` is missing, the contract rule owns the confirmed defect. Dependent format and calculation rules should generally become `NOT_EVALUABLE` instead of reporting duplicate failures.

## Applicability

State-dependent rules use the derived spin state once rather than reconstructing gameplay independently in every rule. Malformed state remains unknown rather than being silently mapped to absence or a default mode.

## Mathematical trust boundary

External fixture JSON enters as `unknown`. Runtime guards establish only the prerequisites required by each rule. Monetary calculations use exact integer minor units; unsupported rounding or coercion is never introduced merely to obtain a result.

## Configuration boundary

Game-specific facts such as visible reel count and, in the extended configuration path, authoritative symbol sets belong in immutable validation configuration rather than being scattered as rule-local magic constants.
