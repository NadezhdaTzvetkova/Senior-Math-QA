import type { RuleCategory, RuleEvaluation } from '../validation/rule.js';

export type ActualValueState = 'PRESENT' | 'MISSING' | 'UNSPECIFIED';

export interface FailureFinding {
  readonly fixtureName: string;
  readonly ruleId: string;
  readonly category: RuleCategory;
  readonly specRef: string;
  readonly path?: string;
  readonly expected?: unknown;
  readonly actual?: unknown;
  readonly actualState: ActualValueState;
  readonly explanation: string;
}

export interface FixtureValidationSummary {
  readonly fixtureName: string;
  readonly failures: readonly FailureFinding[];
  readonly passed: number;
  readonly failed: number;
  readonly notApplicable: number;
  readonly notEvaluable: number;
  readonly totalRules: number;
}

export interface ValidationReportSummary {
  readonly fixtures: number;
  readonly fixturesWithFailures: number;
  readonly fixturesWithoutFailures: number;
  readonly totalRules: number;
  readonly passed: number;
  readonly failed: number;
  readonly notApplicable: number;
  readonly notEvaluable: number;
  readonly failuresByCategory: Readonly<Record<string, number>>;
  readonly failuresByRuleId: Readonly<Record<string, number>>;
}

function actualValueState(evaluation: RuleEvaluation): ActualValueState {
  const evidence = evaluation.evidence;

  if (evidence === undefined || !Object.prototype.hasOwnProperty.call(evidence, 'actual')) {
    return 'UNSPECIFIED';
  }

  return evidence.actual === undefined ? 'MISSING' : 'PRESENT';
}

export function collectFailureFindings(
  evaluations: readonly RuleEvaluation[],
): readonly FailureFinding[] {
  return evaluations
    .filter((item) => item.status === 'FAIL')
    .map((item) => ({
      fixtureName: item.fixtureName,
      ruleId: item.ruleId,
      category: item.category,
      specRef: item.specRef,
      ...(item.evidence?.path === undefined ? {} : { path: item.evidence.path }),
      ...(item.evidence?.expected === undefined ? {} : { expected: item.evidence.expected }),
      ...(item.evidence?.actual === undefined ? {} : { actual: item.evidence.actual }),
      actualState: actualValueState(item),
      explanation:
        item.evidence?.explanation ?? 'Validation rule failed without additional evidence',
    }));
}

export function summarizeFixture(
  fixtureName: string,
  evaluations: readonly RuleEvaluation[],
): FixtureValidationSummary {
  const failures = collectFailureFindings(evaluations);

  return {
    fixtureName,
    failures,
    passed: evaluations.filter((item) => item.status === 'PASS').length,
    failed: failures.length,
    notApplicable: evaluations.filter((item) => item.status === 'NOT_APPLICABLE').length,
    notEvaluable: evaluations.filter((item) => item.status === 'NOT_EVALUABLE').length,
    totalRules: evaluations.length,
  };
}

function increment(target: Record<string, number>, key: string): void {
  target[key] = (target[key] ?? 0) + 1;
}

export function summarizeReport(
  summaries: readonly FixtureValidationSummary[],
): ValidationReportSummary {
  const failuresByCategory: Record<string, number> = {};
  const failuresByRuleId: Record<string, number> = {};

  for (const summary of summaries) {
    for (const failure of summary.failures) {
      increment(failuresByCategory, failure.category);
      increment(failuresByRuleId, failure.ruleId);
    }
  }

  return {
    fixtures: summaries.length,
    fixturesWithFailures: summaries.filter((summary) => summary.failures.length > 0).length,
    fixturesWithoutFailures: summaries.filter((summary) => summary.failures.length === 0).length,
    totalRules: summaries.reduce((total, summary) => total + summary.totalRules, 0),
    passed: summaries.reduce((total, summary) => total + summary.passed, 0),
    failed: summaries.reduce((total, summary) => total + summary.failed, 0),
    notApplicable: summaries.reduce((total, summary) => total + summary.notApplicable, 0),
    notEvaluable: summaries.reduce((total, summary) => total + summary.notEvaluable, 0),
    failuresByCategory,
    failuresByRuleId,
  };
}

function formatValue(value: unknown, state: ActualValueState | undefined = undefined): string {
  if (state === 'MISSING') {
    return '<MISSING>';
  }

  if (state === 'UNSPECIFIED') {
    return 'n/a';
  }

  if (value === undefined) {
    return 'n/a';
  }

  return JSON.stringify(value);
}

function formatCountMap(title: string, values: Readonly<Record<string, number>>): string {
  const entries = Object.entries(values);

  if (entries.length === 0) {
    return `${title}: none`;
  }

  return [`${title}:`, ...entries.map(([key, value]) => `  ${key}: ${value}`)].join('\n');
}

export function formatHumanSummary(summary: FixtureValidationSummary): string {
  const header = [
    `Fixture: ${summary.fixtureName}`,
    `Failures: ${summary.failed}`,
    `PASS: ${summary.passed}`,
    `NOT_APPLICABLE: ${summary.notApplicable}`,
    `NOT_EVALUABLE: ${summary.notEvaluable}`,
    `Total rules: ${summary.totalRules}`,
  ].join(' | ');

  if (summary.failures.length === 0) {
    return `${header}\n  No confirmed validation failures.`;
  }

  const failures = summary.failures.map((finding, index) => {
    const lines = [
      `  ${index + 1}. [${finding.ruleId}] ${finding.category}`,
      `     Spec: ${finding.specRef}`,
      `     Path: ${finding.path ?? 'n/a'}`,
      `     Expected: ${formatValue(finding.expected)}`,
      `     Actual: ${formatValue(finding.actual, finding.actualState)}`,
      `     Actual state: ${finding.actualState}`,
      `     Explanation: ${finding.explanation}`,
    ];

    return lines.join('\n');
  });

  return `${header}\n${failures.join('\n')}`;
}

export function formatHumanReport(summaries: readonly FixtureValidationSummary[]): string {
  const aggregate = summarizeReport(summaries);

  const reportHeader = [
    'Senior Math QA Validation Report',
    `Fixtures processed: ${aggregate.fixtures}`,
    `Fixtures with confirmed failures: ${aggregate.fixturesWithFailures}`,
    `Fixtures without confirmed failures: ${aggregate.fixturesWithoutFailures}`,
    `Total rule evaluations: ${aggregate.totalRules}`,
    `PASS: ${aggregate.passed}`,
    `FAIL: ${aggregate.failed}`,
    `NOT_APPLICABLE: ${aggregate.notApplicable}`,
    `NOT_EVALUABLE: ${aggregate.notEvaluable}`,
    formatCountMap('Failures by category', aggregate.failuresByCategory),
    formatCountMap('Failures by rule', aggregate.failuresByRuleId),
  ].join('\n');

  return `${reportHeader}\n\n${summaries
    .map((summary) => formatHumanSummary(summary))
    .join('\n\n')}\n`;
}
