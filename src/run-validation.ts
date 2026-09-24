import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  formatHumanReport,
  summarizeFixture,
  summarizeReport,
  type FixtureValidationSummary,
  type ValidationReportSummary,
} from './reporting/findings.js';
import { ALL_RULES } from './rules/registry.js';
import { buildValidationContext } from './validation/context.js';
import { ValidationEngine } from './validation/engine.js';

export interface ValidationReportDocument {
  readonly generatedFrom: {
    readonly fixtureDirectory: string;
    readonly fixtureCount: number;
    readonly ruleCount: number;
  };
  readonly aggregate: ValidationReportSummary;
  readonly fixtures: readonly FixtureValidationSummary[];
}

export interface ValidationRunOptions {
  readonly fixturesDirectory: string;
  readonly humanReportPath: string;
  readonly jsonReportPath: string;
  readonly expectedFixtureCount?: number;
}

function fixtureNumber(fileName: string): number {
  const match = fileName.match(/(\d+)/);

  return match === null ? Number.MAX_SAFE_INTEGER : Number(match[1]);
}

export function discoverFixtureNames(fixturesDirectory: string): readonly string[] {
  return readdirSync(fixturesDirectory)
    .filter((name) => name.toLowerCase().endsWith('.json'))
    .sort((left, right) => {
      const numberDifference = fixtureNumber(left) - fixtureNumber(right);

      return numberDifference !== 0 ? numberDifference : left.localeCompare(right);
    });
}

function parseFixture(filePath: string): unknown {
  const text = readFileSync(filePath, 'utf8');

  try {
    return JSON.parse(text) as unknown;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'unknown JSON parsing error';

    throw new Error(`Failed to parse fixture ${basename(filePath)}: ${message}`, { cause: error });
  }
}

export function evaluateFixtures(
  fixturesDirectory: string,
  fixtureNames: readonly string[],
): readonly FixtureValidationSummary[] {
  const engine = new ValidationEngine(ALL_RULES);

  return fixtureNames.map((fixtureName) => {
    const raw = parseFixture(join(fixturesDirectory, fixtureName));
    const context = buildValidationContext(fixtureName, raw);
    const evaluations = engine.evaluate(context);

    return summarizeFixture(fixtureName, evaluations);
  });
}

export function buildReportDocument(
  fixturesDirectory: string,
  summaries: readonly FixtureValidationSummary[],
  ruleCount: number = ALL_RULES.length,
): ValidationReportDocument {
  return {
    generatedFrom: {
      fixtureDirectory: fixturesDirectory,
      fixtureCount: summaries.length,
      ruleCount,
    },
    aggregate: summarizeReport(summaries),
    fixtures: summaries,
  };
}

function atomicWrite(filePath: string, contents: string): void {
  const directory = dirname(filePath);
  const temporaryPath = `${filePath}.tmp`;

  mkdirSync(directory, { recursive: true });

  try {
    writeFileSync(temporaryPath, contents, 'utf8');
    renameSync(temporaryPath, filePath);
  } catch (error: unknown) {
    rmSync(temporaryPath, { force: true });
    throw error;
  }
}

export function writeReports(
  document: ValidationReportDocument,
  humanReportPath: string,
  jsonReportPath: string,
  format: 'both' | 'human' | 'json' = 'both',
): void {
  if (format === 'both' || format === 'human') {
    atomicWrite(humanReportPath, formatHumanReport(document.fixtures));
  } else {
    rmSync(humanReportPath, { force: true });
  }

  if (format === 'both' || format === 'json') {
    atomicWrite(jsonReportPath, `${JSON.stringify(document, null, 2)}\n`);
  } else {
    rmSync(jsonReportPath, { force: true });
  }
}

export function runValidation(options: ValidationRunOptions): ValidationReportDocument {
  const fixtureNames = discoverFixtureNames(options.fixturesDirectory);

  if (
    options.expectedFixtureCount !== undefined &&
    fixtureNames.length !== options.expectedFixtureCount
  ) {
    throw new Error(
      `Expected ${options.expectedFixtureCount} fixture JSON files, found ${fixtureNames.length}`,
    );
  }

  const summaries = evaluateFixtures(options.fixturesDirectory, fixtureNames);

  const document = buildReportDocument(options.fixturesDirectory, summaries);

  writeReports(document, options.humanReportPath, options.jsonReportPath);

  return document;
}

function isDirectExecution(): boolean {
  const executedPath = process.argv[1];

  if (executedPath === undefined) {
    return false;
  }

  return fileURLToPath(import.meta.url) === executedPath;
}

if (isDirectExecution()) {
  try {
    const root = process.cwd();

    const document = runValidation({
      fixturesDirectory: join(root, 'fixtures'),
      humanReportPath: join(root, 'reports', 'human', 'validation-report.txt'),
      jsonReportPath: join(root, 'reports', 'json', 'validation-report.json'),
      expectedFixtureCount: 30,
    });

    process.stdout.write(
      [
        'Validation completed successfully.',
        `Fixtures: ${document.aggregate.fixtures}`,
        `Rules per fixture: ${document.generatedFrom.ruleCount}`,
        `Confirmed findings: ${document.aggregate.failed}`,
        `Human report: reports/human/validation-report.txt`,
        `JSON report: reports/json/validation-report.json`,
        '',
      ].join('\n'),
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? (error.stack ?? error.message) : String(error);

    process.stderr.write(`Validation execution failed:\n${message}\n`);
    process.exitCode = 1;
  }
}
