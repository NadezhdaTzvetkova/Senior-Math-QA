# Slot API Validation Exercise - Candidate Spec (Draft v0.1)

## 1. Objective

You are given a set of JSON spin response files for a 5x3 slot game simulation.

Your task is to implement automated tests from scratch that validate contract, consistency, and calculation rules defined in this specification.

## 2. What to Validate

You must validate three groups of behavior:

1. Contract and structure
2. Type and format
3. Cross-field consistency and calculation

## 3. Response Envelope

Each fixture is a JSON object with this high-level shape:

- capturedAt: string timestamp
- mathName: string
- gameMode: string or number
- index: number
- injectedBugs: array of strings (may be empty)
- response: object

Primary validation target is:

- response.body.result

## 4. Core Fields (response.body.result)

Expected core fields:

- win: object
- winsMultipliers: object
- stake: decimal-formatted string
- multiplier: number
- spinMode: string
- reelsBuffer: array

Common optional fields:

- winLines: array
- cashSymbols: array
- collectors: array
- collectorsBuffer: array
- scatters: array
- features: array
- gameMode: number
- freeSpins: array
- respin: array

## 5. Type and Format Rules

### 5.1 Monetary values

Use decimal-safe comparison logic where needed.

Expected format for top-level values:

- win.lines: decimal string with two fraction digits
- win.total: decimal string with two fraction digits
- winsMultipliers.lines: decimal string with two fraction digits
- winsMultipliers.total: decimal string with two fraction digits
- stake: decimal string with two fraction digits

### 5.2 Numeric fields

- multiplier must be numeric and positive
- gameMode (inside result) must be numeric when present

### 5.3 Enumerations

- spinMode must be one of:
  - Normal
  - FreeSpins
  - WinSpins
  - WildSpins
  - Respin

## 6. Structural Rules

### 6.1 win and winsMultipliers

- win must exist with at least lines and total
- winsMultipliers must exist with at least lines and total

### 6.2 winLines

When present:

- winLines must be an array
- each entry must include:
  - index
  - start
  - length
  - tile
  - multiplier
  - amount
  - multipliedAmount
  - tiles

### 6.3 reelsBuffer

- reelsBuffer must be an array of reels
- expected visible width is 5 reels in base mode

### 6.4 Optional arrays

When present, the following must be arrays:

- cashSymbols
- collectors
- collectorsBuffer
- scatters
- features
- freeSpins
- respin

## 7. Cross-Field Consistency Rules

### 7.1 No-win consistency

When no-win conditions apply:

- win.lines = 0.00
- win.total = 0.00
- winsMultipliers.lines = 0.00
- winsMultipliers.total = 0.00

### 7.2 Plain line-win consistency

When line wins exist and no additional win components are present:

- win.total equals win.lines
- winsMultipliers.total equals winsMultipliers.lines

### 7.3 Component aggregation consistency

When extra components exist (for example freeSpins, respin, instantWin):

- totals must include component contributions
- totals must not collapse to lines-only values unless that is mathematically correct

### 7.4 Entry-level formulas

When winLines entries exist:

- multipliedAmount should equal amount * multiplier

When cashSymbols entries exist:

- amount should equal multiplier * stake

## 8. Bounds and Plausibility Rules

When applicable:

- reel and index coordinates must be within visible bounds
- win line start and length values must be within allowed boundaries
- symbol identifiers must be from known set in the supplied configuration context

## 9. Out-of-Scope Debug Fields

Do not fail tests based only on these debug-oriented fields:

- rngResults
- tilesCount
- screenReels
- screenRows
- screenString
- seed

## 10. Candidate Deliverable Expectations

Your solution should include:

1. Automated tests covering contract, type/format, and math consistency
2. Clear failure output identifying which file and which rule failed
3. Reasonable runtime efficiency over all supplied fixtures
4. Maintainable test structure (readable, modular, and extendable)

## 11. Notes

- This is a contract-validation exercise, not a gameplay-recreation task.
- Some responses are intentionally inconsistent with this spec.
- Your tests should detect those inconsistencies reliably.
