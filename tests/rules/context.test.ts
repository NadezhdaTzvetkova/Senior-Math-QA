import { describe, expect, it } from 'vitest';

import { isJsonObject, readPath } from '../../src/parsing/guards.js';
import {
  buildValidationContext,
  DEFAULT_GAME_VALIDATION_CONFIG,
} from '../../src/validation/context.js';

describe('parsing guards', () => {
  it('recognises JSON objects but not arrays or null', () => {
    expect(isJsonObject({})).toBe(true);
    expect(isJsonObject([])).toBe(false);
    expect(isJsonObject(null)).toBe(false);
  });

  it('reads an existing nested path without coercion', () => {
    const value = { response: { body: { result: { stake: '2.00' } } } };

    expect(readPath(value, ['response', 'body', 'result'])).toEqual({
      found: true,
      value: { stake: '2.00' },
    });
  });

  it('reports a missing path instead of fabricating a default', () => {
    expect(readPath({ response: {} }, ['response', 'body', 'result'])).toEqual({
      found: false,
      value: undefined,
    });
  });

  it('stops safely when an intermediate node is malformed', () => {
    expect(readPath({ response: { body: 'malformed' } }, ['response', 'body', 'result'])).toEqual({
      found: false,
      value: undefined,
    });
  });
});

describe('ValidationContext', () => {
  it('extracts response.body.result and derives spin state once', () => {
    const raw = {
      response: {
        body: {
          result: {
            spinMode: 'Normal',
            winLines: [],
          },
        },
      },
    };

    const context = buildValidationContext('response_001.json', raw);

    expect(context.fixtureName).toBe('response_001.json');
    expect(context.resultLookup.found).toBe(true);
    expect(context.result).toEqual({
      spinMode: 'Normal',
      winLines: [],
    });
    expect(context.spinState.isBaseMode).toBe(true);
    expect(context.spinState.winLines).toBe('PRESENT_EMPTY');
    expect(context.config.baseReelCount).toBe(5);
  });

  it('preserves missing result state for contract validation', () => {
    const context = buildValidationContext('broken.json', {
      response: { body: {} },
    });

    expect(context.resultLookup.found).toBe(false);
    expect(context.result).toBeUndefined();
    expect(context.spinState.isBaseMode).toBeUndefined();
  });

  it('supports explicit immutable game configuration', () => {
    const context = buildValidationContext(
      'fixture.json',
      {
        response: {
          body: {
            result: {
              spinMode: 'Normal',
            },
          },
        },
      },
      { baseReelCount: 7 },
    );

    expect(context.config.baseReelCount).toBe(7);
  });

  it('exposes the canonical default configuration', () => {
    expect(DEFAULT_GAME_VALIDATION_CONFIG.baseReelCount).toBe(5);
  });
});
