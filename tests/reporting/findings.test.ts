import { describe, expect, it } from 'vitest';

import {
  collectFailureFindings,
  formatHumanReport,
  formatHumanSummary,
  summarizeFixture,
  summarizeReport,
} from '../../src/reporting/findings.js';
import type { RuleEvaluation } from '../../src/validation/rule.js';

const evaluations: readonly RuleEvaluation[] = [
  {
    fixtureName: 'response_001.json',
    ruleId: 'C004_WIN_TOTAL_PRESENT',
    category: 'CONTRACT',
    status: 'FAIL',
    specRef: 'candidate-spec: win must contain lines and total',
    evidence: {
      path: 'response.body.result.win.total',
      expected: 'required field present',
      actual: undefined,
      explanation: 'win.total is required',
    },
  },
  {
    fixtureName: 'response_001.json',
    ruleId: 'F001_WIN_LINES_DECIMAL',
    category: 'TYPE_FORMAT',
    status: 'PASS',
    specRef: 'candidate-spec: win.lines decimal',
  },
  {
    fixtureName: 'response_001.json',
    ruleId: 'M001_WIN_LINE_FORMULA',
    category: 'CALCULATION',
    status: 'NOT_APPLICABLE',
    specRef: 'candidate-spec: line formula',
  },
  {
    fixtureName: 'response_001.json',
    ruleId: 'M003_PLAIN_WIN_TOTAL',
    category: 'CONSISTENCY',
    status: 'NOT_EVALUABLE',
    specRef: 'candidate-spec: total consistency',
  },
];

describe('failure reporting', () => {
  it('collects only confirmed FAIL evaluations', () => {
    const findings = collectFailureFindings(evaluations);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.ruleId).toBe('C004_WIN_TOTAL_PRESENT');
    expect(findings[0]?.path).toBe('response.body.result.win.total');
  });

  it('marks an explicitly missing actual value as MISSING', () => {
    const finding = collectFailureFindings(evaluations)[0];

    expect(finding?.actualState).toBe('MISSING');
    expect(finding?.actual).toBeUndefined();
    expect(finding?.expected).toBe('required field present');
  });

  it('distinguishes unspecified actual evidence from missing data', () => {
    const input: readonly RuleEvaluation[] = [
      {
        fixtureName: 'fixture.json',
        ruleId: 'X001',
        category: 'CONTRACT',
        status: 'FAIL',
        specRef: 'test',
        evidence: {
          explanation: 'failure without actual evidence',
        },
      },
    ];

    expect(collectFailureFindings(input)[0]?.actualState).toBe('UNSPECIFIED');
  });

  it('preserves present structured actual values', () => {
    const input: readonly RuleEvaluation[] = [
      {
        fixtureName: 'fixture.json',
        ruleId: 'X002',
        category: 'CALCULATION',
        status: 'FAIL',
        specRef: 'test',
        evidence: {
          expected: { total: 540 },
          actual: { total: 541 },
          explanation: 'one-cent mismatch',
        },
      },
    ];

    const finding = collectFailureFindings(input)[0];

    expect(finding?.actualState).toBe('PRESENT');
    expect(finding?.actual).toEqual({ total: 541 });
  });

  it('summarizes all four validation statuses deterministically', () => {
    const summary = summarizeFixture('response_001.json', evaluations);

    expect(summary.failures).toHaveLength(1);
    expect(summary.failed).toBe(1);
    expect(summary.passed).toBe(1);
    expect(summary.notApplicable).toBe(1);
    expect(summary.notEvaluable).toBe(1);
    expect(summary.totalRules).toBe(4);
  });

  it('aggregates fixture, status, category and rule counts', () => {
    const first = summarizeFixture('response_001.json', evaluations);
    const second = summarizeFixture('response_008.json', [
      {
        fixtureName: 'response_008.json',
        ruleId: 'C001_RESULT_PRESENT',
        category: 'CONTRACT',
        status: 'PASS',
        specRef: 'test',
      },
    ]);

    const aggregate = summarizeReport([first, second]);

    expect(aggregate.fixtures).toBe(2);
    expect(aggregate.fixturesWithFailures).toBe(1);
    expect(aggregate.fixturesWithoutFailures).toBe(1);
    expect(aggregate.failed).toBe(1);
    expect(aggregate.failuresByCategory).toEqual({ CONTRACT: 1 });
    expect(aggregate.failuresByRuleId).toEqual({
      C004_WIN_TOTAL_PRESENT: 1,
    });
  });

  it('renders explicit missing-value evidence in human output', () => {
    const text = formatHumanSummary(summarizeFixture('response_001.json', evaluations));

    expect(text).toContain('C004_WIN_TOTAL_PRESENT');
    expect(text).toContain('Actual: <MISSING>');
    expect(text).toContain('Actual state: MISSING');
    expect(text).toContain('win.total is required');
  });

  it('renders aggregate report statistics and grouping', () => {
    const summary = summarizeFixture('response_001.json', evaluations);
    const text = formatHumanReport([summary]);

    expect(text).toContain('Senior Math QA Validation Report');
    expect(text).toContain('Fixtures processed: 1');
    expect(text).toContain('Fixtures with confirmed failures: 1');
    expect(text).toContain('FAIL: 1');
    expect(text).toContain('Failures by category:');
    expect(text).toContain('CONTRACT: 1');
    expect(text).toContain('C004_WIN_TOTAL_PRESENT: 1');
  });
});
