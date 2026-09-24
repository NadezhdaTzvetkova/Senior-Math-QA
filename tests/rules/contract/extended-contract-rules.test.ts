import { describe, expect, it } from 'vitest';

import {
  C013_OPTIONAL_ARRAY_TYPES,
  WL001_INDEX_PRESENT,
  WL002_START_PRESENT,
  WL003_LENGTH_PRESENT,
  WL004_TILE_PRESENT,
  WL005_MULTIPLIER_PRESENT,
  WL006_AMOUNT_PRESENT,
  WL007_MULTIPLIED_AMOUNT_PRESENT,
  WL008_TILES_PRESENT,
} from '../../../src/rules/contract/extended-contract-rules.js';
import { buildValidationContext } from '../../../src/validation/context.js';

function context(result: unknown) {
  return buildValidationContext('fixture.json', {
    response: {
      body: {
        result,
      },
    },
  });
}

function completeWinLine() {
  return {
    index: 0,
    start: 0,
    length: 3,
    tile: 1,
    multiplier: 2,
    amount: '0.20',
    multipliedAmount: '0.40',
    tiles: [1, 1, 1],
  };
}

describe('C013_OPTIONAL_ARRAY_TYPES', () => {
  it('returns NOT_APPLICABLE when covered optional collections are absent', () => {
    expect(C013_OPTIONAL_ARRAY_TYPES.evaluate(context({})).status).toBe('NOT_APPLICABLE');
  });

  it('passes when optional collections are arrays', () => {
    expect(
      C013_OPTIONAL_ARRAY_TYPES.evaluate(
        context({
          cashSymbols: [],
          collectors: [],
          collectorsBuffer: [],
          scatters: [],
          features: [],
        }),
      ).status,
    ).toBe('PASS');
  });

  it('fails when an optional collection is not an array', () => {
    const result = C013_OPTIONAL_ARRAY_TYPES.evaluate(
      context({
        cashSymbols: { malformed: true },
      }),
    );

    expect(result.status).toBe('FAIL');
    expect(result.evidence?.path).toBe('response.body.result.cashSymbols');
  });
});

describe('winLine required-field rules', () => {
  it('marks winLine entry rules NOT_APPLICABLE when winLines is absent', () => {
    expect(WL001_INDEX_PRESENT.evaluate(context({})).status).toBe('NOT_APPLICABLE');
  });

  it('marks winLine entry rules NOT_APPLICABLE for an empty winLines array', () => {
    expect(WL001_INDEX_PRESENT.evaluate(context({ winLines: [] })).status).toBe('NOT_APPLICABLE');
  });

  it('does not evaluate entry fields when winLines itself is malformed', () => {
    expect(WL001_INDEX_PRESENT.evaluate(context({ winLines: { malformed: true } })).status).toBe(
      'NOT_EVALUABLE',
    );
  });

  it('passes all required-field rules for a complete winLine', () => {
    const ctx = context({
      winLines: [completeWinLine()],
    });

    const rules = [
      WL001_INDEX_PRESENT,
      WL002_START_PRESENT,
      WL003_LENGTH_PRESENT,
      WL004_TILE_PRESENT,
      WL005_MULTIPLIER_PRESENT,
      WL006_AMOUNT_PRESENT,
      WL007_MULTIPLIED_AMOUNT_PRESENT,
      WL008_TILES_PRESENT,
    ];

    for (const rule of rules) {
      expect(rule.evaluate(ctx).status).toBe('PASS');
    }
  });

  it('fails the exact missing winLine field without failing unrelated fields', () => {
    const entry = completeWinLine();
    const { multipliedAmount: _removed, ...withoutMultipliedAmount } = entry;
    const ctx = context({
      winLines: [withoutMultipliedAmount],
    });

    expect(WL007_MULTIPLIED_AMOUNT_PRESENT.evaluate(ctx).status).toBe('FAIL');
    expect(WL006_AMOUNT_PRESENT.evaluate(ctx).status).toBe('PASS');
    expect(WL008_TILES_PRESENT.evaluate(ctx).status).toBe('PASS');
  });

  it('checks every winLine entry, not only the first', () => {
    const first = completeWinLine();
    const second = completeWinLine();
    const { tiles: _removed, ...withoutTiles } = second;

    const result = WL008_TILES_PRESENT.evaluate(
      context({
        winLines: [first, withoutTiles],
      }),
    );

    expect(result.status).toBe('FAIL');
    expect(result.evidence?.path).toBe('response.body.result.winLines[1].tiles');
  });
});
