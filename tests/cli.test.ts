import { describe, expect, it } from 'vitest';

import {
  gateExitCode,
  helpText,
  parseCliArguments,
  parseGameValidationConfig,
  selectRules,
} from '../src/cli-core.js';
import type { ValidationReportDocument } from '../src/run-validation.js';

describe('CLI argument parsing', () => {
  it('uses analysis mode and both report formats by default', () => {
    expect(parseCliArguments([])).toEqual({
      format: 'both',
      gate: false,
      help: false,
    });
  });

  it('parses fixture, category, config, format and gate options', () => {
    expect(
      parseCliArguments([
        '--fixture',
        'response_008.json',
        '--category',
        'calculation',
        '--config',
        'config/game.json',
        '--format',
        'json',
        '--gate',
      ]),
    ).toEqual({
      fixture: 'response_008.json',
      category: 'CALCULATION',
      configPath: 'config/game.json',
      format: 'json',
      gate: true,
      help: false,
    });
  });

  it('rejects unknown arguments and unsupported categories or formats', () => {
    expect(() => parseCliArguments(['--unknown'])).toThrow('Unknown argument');
    expect(() => parseCliArguments(['--category', 'magic'])).toThrow('Unsupported category');
    expect(() => parseCliArguments(['--format', 'xml'])).toThrow('Unsupported format');
  });

  it('renders discoverable help text', () => {
    expect(helpText()).toContain('--fixture');
    expect(helpText()).toContain('--category');
    expect(helpText()).toContain('--gate');
  });
});

describe('game validation configuration', () => {
  it('accepts a positive reel count with an optional unique symbol set', () => {
    expect(parseGameValidationConfig({ baseReelCount: 5, knownSymbols: [1, 2, 3] })).toEqual({
      baseReelCount: 5,
      knownSymbols: [1, 2, 3],
    });
  });

  it('rejects malformed reel counts, symbol values and duplicate symbols', () => {
    expect(() => parseGameValidationConfig({ baseReelCount: 0 })).toThrow('positive safe integer');
    expect(() => parseGameValidationConfig({ baseReelCount: 5, knownSymbols: [1, '2'] })).toThrow(
      'safe integer',
    );
    expect(() => parseGameValidationConfig({ baseReelCount: 5, knownSymbols: [1, 1] })).toThrow(
      'duplicates',
    );
  });
});

describe('CLI rule selection and gate semantics', () => {
  it('selects only rules from the requested category', () => {
    const rules = selectRules('CALCULATION');

    expect(rules.length).toBeGreaterThan(0);
    expect(rules.every((rule) => rule.category === 'CALCULATION')).toBe(true);
  });

  it('fails gate mode only when confirmed findings exist', () => {
    const document = {
      generatedFrom: { fixtureDirectory: 'fixtures', fixtureCount: 1, ruleCount: 1 },
      aggregate: {
        fixtures: 1,
        fixturesWithFailures: 1,
        fixturesWithoutFailures: 0,
        totalRules: 1,
        passed: 0,
        failed: 1,
        notApplicable: 0,
        notEvaluable: 0,
        failuresByCategory: { CALCULATION: 1 },
        failuresByRuleId: { M001_WIN_LINE_FORMULA: 1 },
      },
      fixtures: [],
    } satisfies ValidationReportDocument;

    expect(gateExitCode(document, false)).toBe(0);
    expect(gateExitCode(document, true)).toBe(1);
    expect(
      gateExitCode(
        {
          ...document,
          aggregate: { ...document.aggregate, failed: 0 },
        },
        true,
      ),
    ).toBe(0);
  });
});
