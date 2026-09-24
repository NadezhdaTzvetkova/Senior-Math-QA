import { describe, expect, it } from 'vitest';

import {
  B001_REEL_INDEX_BOUNDS,
  B002_WIN_LINE_START_BOUNDS,
  B003_WIN_LINE_LENGTH_BOUNDS,
  B004_SYMBOL_KNOWN_SET,
  R001_REELS_BUFFER_ARRAY,
  R002_BASE_MODE_WIDTH,
} from '../../../src/rules/bounds/reel-bounds-rules.js';
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

describe('reelsBuffer rules', () => {
  it('passes an array reelsBuffer', () => {
    expect(
      R001_REELS_BUFFER_ARRAY.evaluate(
        context({ spinMode: 'Normal', reelsBuffer: [[], [], [], [], []] }),
      ).status,
    ).toBe('PASS');
  });

  it('fails a non-array reelsBuffer', () => {
    expect(
      R001_REELS_BUFFER_ARRAY.evaluate(context({ spinMode: 'Normal', reelsBuffer: {} })).status,
    ).toBe('FAIL');
  });

  it('passes five reels in Normal base mode', () => {
    expect(
      R002_BASE_MODE_WIDTH.evaluate(
        context({ spinMode: 'Normal', reelsBuffer: [[], [], [], [], []] }),
      ).status,
    ).toBe('PASS');
  });

  it('fails four reels in Normal base mode', () => {
    const result = R002_BASE_MODE_WIDTH.evaluate(
      context({ spinMode: 'Normal', reelsBuffer: [[], [], [], []] }),
    );

    expect(result.status).toBe('FAIL');
    expect(result.evidence?.actual).toBe(4);
    expect(result.evidence?.expected).toBe(5);
  });

  it('does not apply base-mode width to a valid non-base mode', () => {
    expect(
      R002_BASE_MODE_WIDTH.evaluate(
        context({ spinMode: 'FreeSpins', reelsBuffer: [[], [], [], []] }),
      ).status,
    ).toBe('NOT_APPLICABLE');
  });

  it('does not evaluate base width for invalid spinMode', () => {
    expect(
      R002_BASE_MODE_WIDTH.evaluate(
        context({ spinMode: 'InvalidSpinMode', reelsBuffer: [[], [], [], []] }),
      ).status,
    ).toBe('NOT_EVALUABLE');
  });
});

describe('winLine bounds', () => {
  it('passes start and length contained within five visible reels', () => {
    const ctx = context({
      spinMode: 'Normal',
      winLines: [{ start: 0, length: 5 }],
    });

    expect(B002_WIN_LINE_START_BOUNDS.evaluate(ctx).status).toBe('PASS');
    expect(B003_WIN_LINE_LENGTH_BOUNDS.evaluate(ctx).status).toBe('PASS');
  });

  it('fails a start outside visible reel bounds', () => {
    expect(
      B002_WIN_LINE_START_BOUNDS.evaluate(
        context({
          spinMode: 'Normal',
          winLines: [{ start: 5, length: 1 }],
        }),
      ).status,
    ).toBe('FAIL');
  });

  it('fails a segment extending beyond visible reel width', () => {
    expect(
      B003_WIN_LINE_LENGTH_BOUNDS.evaluate(
        context({
          spinMode: 'Normal',
          winLines: [{ start: 3, length: 3 }],
        }),
      ).status,
    ).toBe('FAIL');
  });

  it('does not evaluate bounds from malformed numeric prerequisites', () => {
    expect(
      B003_WIN_LINE_LENGTH_BOUNDS.evaluate(
        context({
          spinMode: 'Normal',
          winLines: [{ start: '0', length: 3 }],
        }),
      ).status,
    ).toBe('NOT_EVALUABLE');
  });
});

describe('conservative unspecified bounds', () => {
  it('does not invent an index-base rule', () => {
    expect(
      B001_REEL_INDEX_BOUNDS.evaluate(
        context({
          spinMode: 'Normal',
          winLines: [{ index: 999 }],
        }),
      ).status,
    ).toBe('NOT_EVALUABLE');
  });

  it('does not invent a symbol set', () => {
    expect(
      B004_SYMBOL_KNOWN_SET.evaluate(
        context({
          spinMode: 'Normal',
          reelsBuffer: [[100], [], [], [], []],
        }),
      ).status,
    ).toBe('NOT_EVALUABLE');
  });
});
