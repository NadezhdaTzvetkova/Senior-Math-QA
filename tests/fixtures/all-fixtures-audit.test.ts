import { readFileSync } from 'node:fs';
import process from 'node:process';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ALL_RULES } from '../../src/rules/registry.js';
import { buildValidationContext } from '../../src/validation/context.js';
import { ValidationEngine } from '../../src/validation/engine.js';

interface FixtureExpectation {
  readonly fixtureName: string;
  readonly expectedFailures: readonly string[];
}

const FIXTURES_DIRECTORY = join(process.cwd(), 'fixtures');

const EXPECTED_FAILURES: readonly FixtureExpectation[] = [
  {
    fixtureName: 'response_001.json',
    expectedFailures: ['C004_WIN_TOTAL_PRESENT'],
  },
  {
    fixtureName: 'response_002.json',
    expectedFailures: ['M005_COMPONENT_AGGREGATION'],
  },
  {
    fixtureName: 'response_003.json',
    expectedFailures: ['F005_STAKE_DECIMAL', 'T001_MULTIPLIER_NUMERIC'],
  },
  {
    fixtureName: 'response_004.json',
    expectedFailures: ['T001_MULTIPLIER_NUMERIC'],
  },
  {
    fixtureName: 'response_005.json',
    expectedFailures: ['T003_GAME_MODE_NUMERIC'],
  },
  {
    fixtureName: 'response_006.json',
    expectedFailures: ['C003_WIN_LINES_PRESENT', 'C006_WM_LINES_PRESENT'],
  },
  {
    fixtureName: 'response_007.json',
    expectedFailures: ['C006_WM_LINES_PRESENT'],
  },
  {
    fixtureName: 'response_008.json',
    expectedFailures: [],
  },
  {
    fixtureName: 'response_009.json',
    expectedFailures: ['F002_WIN_TOTAL_DECIMAL'],
  },
  {
    fixtureName: 'response_010.json',
    expectedFailures: ['F002_WIN_TOTAL_DECIMAL'],
  },
  {
    fixtureName: 'response_011.json',
    expectedFailures: ['F001_WIN_LINES_DECIMAL'],
  },
  {
    fixtureName: 'response_012.json',
    expectedFailures: ['F001_WIN_LINES_DECIMAL', 'R002_BASE_MODE_WIDTH'],
  },
  {
    fixtureName: 'response_013.json',
    expectedFailures: ['C012_WIN_LINES_ARRAY'],
  },
  {
    fixtureName: 'response_014.json',
    expectedFailures: ['E001_SPIN_MODE_ENUM'],
  },
  {
    fixtureName: 'response_015.json',
    expectedFailures: [],
  },
  {
    fixtureName: 'response_016.json',
    expectedFailures: ['C004_WIN_TOTAL_PRESENT'],
  },
  {
    fixtureName: 'response_017.json',
    expectedFailures: [],
  },
  {
    fixtureName: 'response_018.json',
    expectedFailures: ['T001_MULTIPLIER_NUMERIC', 'T003_GAME_MODE_NUMERIC'],
  },
  {
    fixtureName: 'response_019.json',
    expectedFailures: ['T003_GAME_MODE_NUMERIC'],
  },
  {
    fixtureName: 'response_020.json',
    expectedFailures: ['C003_WIN_LINES_PRESENT'],
  },
  {
    fixtureName: 'response_021.json',
    expectedFailures: ['C006_WM_LINES_PRESENT'],
  },
  {
    fixtureName: 'response_022.json',
    expectedFailures: ['C003_WIN_LINES_PRESENT'],
  },
  {
    fixtureName: 'response_023.json',
    expectedFailures: [],
  },
  {
    fixtureName: 'response_024.json',
    expectedFailures: ['F001_WIN_LINES_DECIMAL', 'F002_WIN_TOTAL_DECIMAL'],
  },
  {
    fixtureName: 'response_025.json',
    expectedFailures: ['F001_WIN_LINES_DECIMAL'],
  },
  {
    fixtureName: 'response_026.json',
    expectedFailures: ['R002_BASE_MODE_WIDTH'],
  },
  {
    fixtureName: 'response_027.json',
    expectedFailures: ['C012_WIN_LINES_ARRAY', 'E001_SPIN_MODE_ENUM'],
  },
  {
    fixtureName: 'response_028.json',
    expectedFailures: ['E001_SPIN_MODE_ENUM'],
  },
  {
    fixtureName: 'response_029.json',
    expectedFailures: ['C004_WIN_TOTAL_PRESENT'],
  },
  {
    fixtureName: 'response_030.json',
    expectedFailures: ['F005_STAKE_DECIMAL'],
  },
];

describe('supplied fixture benchmark oracle', () => {
  const engine = new ValidationEngine(ALL_RULES);

  it('contains exactly one independent expectation for every supplied fixture', () => {
    expect(EXPECTED_FAILURES).toHaveLength(30);
    expect(
      new Set(EXPECTED_FAILURES.map(({ fixtureName }) => fixtureName)).size,
    ).toBe(30);
  });

  it.each(EXPECTED_FAILURES)(
    '$fixtureName matches the independently derived expected findings',
    ({ fixtureName, expectedFailures }) => {
      const rawText = readFileSync(
        join(FIXTURES_DIRECTORY, fixtureName),
        'utf8',
      );
      const raw: unknown = JSON.parse(rawText);
      const context = buildValidationContext(fixtureName, raw);

      const actualFailures = engine
        .evaluate(context)
        .filter(({ status }) => status === 'FAIL')
        .map(({ ruleId }) => ruleId);

      expect(actualFailures).toEqual(expectedFailures);
    },
  );
});

