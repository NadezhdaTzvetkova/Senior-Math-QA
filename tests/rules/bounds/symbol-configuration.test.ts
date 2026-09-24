import { describe, expect, it } from 'vitest';

import { B004_SYMBOL_KNOWN_SET } from '../../../src/rules/bounds/reel-bounds-rules.js';
import { buildValidationContext } from '../../../src/validation/context.js';

function raw(reelsBuffer: unknown): unknown {
  return {
    response: {
      body: {
        result: {
          win: { lines: '0.00', total: '0.00' },
          winsMultipliers: { lines: '0.00', total: '0.00' },
          stake: '1.00',
          multiplier: 1,
          spinMode: 'Normal',
          reelsBuffer,
        },
      },
    },
  };
}

describe('B004_SYMBOL_KNOWN_SET configuration-driven validation', () => {
  it('remains NOT_EVALUABLE when no authoritative symbol set is supplied', () => {
    const context = buildValidationContext('generated.json', raw([[1], [2], [3], [1], [2]]));

    expect(B004_SYMBOL_KNOWN_SET.evaluate(context).status).toBe('NOT_EVALUABLE');
  });

  it('passes when every reel symbol belongs to the configured set', () => {
    const context = buildValidationContext('generated.json', raw([[1, 2], [2, 3], [3], [1], [2]]), {
      baseReelCount: 5,
      knownSymbols: [1, 2, 3],
    });

    expect(B004_SYMBOL_KNOWN_SET.evaluate(context).status).toBe('PASS');
  });

  it('fails with precise evidence for the first unknown symbol', () => {
    const context = buildValidationContext('generated.json', raw([[1], [2], [99], [1], [2]]), {
      baseReelCount: 5,
      knownSymbols: [1, 2, 3],
    });
    const result = B004_SYMBOL_KNOWN_SET.evaluate(context);

    expect(result.status).toBe('FAIL');
    expect(result.evidence?.actual).toBe(99);
    expect(result.evidence?.path).toBe('response.body.result.reelsBuffer[2][0]');
  });

  it('does not fabricate a symbol-membership failure when reel structure is malformed', () => {
    const context = buildValidationContext('generated.json', raw([[1], [2], 'bad', [1], [2]]), {
      baseReelCount: 5,
      knownSymbols: [1, 2, 3],
    });

    expect(B004_SYMBOL_KNOWN_SET.evaluate(context).status).toBe('NOT_EVALUABLE');
  });
});
