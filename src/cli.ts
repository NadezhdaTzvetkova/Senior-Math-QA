import { readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { summarizeFixture } from './reporting/findings.js';
import { ALL_RULES } from './rules/registry.js';
import {
  buildReportDocument,
  discoverFixtureNames,
  writeReports,
  type ValidationReportDocument,
} from './run-validation.js';
import {
  buildValidationContext,
  DEFAULT_GAME_VALIDATION_CONFIG,
  type GameValidationConfig,
} from './validation/context.js';
import { ValidationEngine } from './validation/engine.js';
import type { RuleCategory, ValidationRule } from './validation/rule.js';

export type ReportOutputFormat = 'both' | 'human' | 'json';

export interface CliOptions {
  readonly fixture?: string;
  readonly category?: RuleCategory;
  readonly configPath?: string;
  readonly format: ReportOutputFormat;
  readonly gate: boolean;
  readonly help: boolean;
}

const RULE_CATEGORIES: readonly RuleCategory[] = [
  'CONTRACT',
  'TYPE_FORMAT',
  'CALCULATION',
  'CONSISTENCY',
  'BOUNDS',
];

function valueAfter(args: readonly string[], index: number, option: string): string {
  const value = args[index + 1];

  if (value === undefined || value.startsWith('--')) {
    throw new Error(`${option} requires a value`);
  }

  return value;
}

export function parseCliArguments(args: readonly string[]): CliOptions {
  let fixture: string | undefined;
  let category: RuleCategory | undefined;
  let configPath: string | undefined;
  let format: ReportOutputFormat = 'both';
  let gate = false;
  let help = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    switch (argument) {
      case '--fixture':
        fixture = valueAfter(args, index, '--fixture');
        index += 1;
        break;
      case '--category': {
        const rawCategory = valueAfter(args, index, '--category').toUpperCase();

        if (!RULE_CATEGORIES.includes(rawCategory as RuleCategory)) {
          throw new Error(
            `Unsupported category ${rawCategory}. Expected one of: ${RULE_CATEGORIES.join(', ')}`,
          );
        }

        category = rawCategory as RuleCategory;
        index += 1;
        break;
      }
      case '--config':
        configPath = valueAfter(args, index, '--config');
        index += 1;
        break;
      case '--format': {
        const rawFormat = valueAfter(args, index, '--format').toLowerCase();

        if (rawFormat !== 'both' && rawFormat !== 'human' && rawFormat !== 'json') {
          throw new Error('Unsupported format. Expected one of: both, human, json');
        }

        format = rawFormat;
        index += 1;
        break;
      }
      case '--gate':
        gate = true;
        break;
      case '--help':
      case '-h':
        help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${argument ?? '<undefined>'}`);
    }
  }

  return {
    ...(fixture === undefined ? {} : { fixture }),
    ...(category === undefined ? {} : { category }),
    ...(configPath === undefined ? {} : { configPath }),
    format,
    gate,
    help,
  };
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseGameValidationConfig(raw: unknown): GameValidationConfig {
  if (!isJsonObject(raw)) {
    throw new Error('Validation config must be a JSON object');
  }

  const baseReelCount = raw.baseReelCount;

  if (
    typeof baseReelCount !== 'number' ||
    !Number.isSafeInteger(baseReelCount) ||
    baseReelCount <= 0
  ) {
    throw new Error('config.baseReelCount must be a positive safe integer');
  }

  if (!Object.prototype.hasOwnProperty.call(raw, 'knownSymbols')) {
    return Object.freeze({ baseReelCount });
  }

  const knownSymbols = raw.knownSymbols;

  if (
    !Array.isArray(knownSymbols) ||
    knownSymbols.some((symbol) => typeof symbol !== 'number' || !Number.isSafeInteger(symbol))
  ) {
    throw new Error('config.knownSymbols must be an array of safe integer symbol identifiers');
  }

  if (new Set(knownSymbols).size !== knownSymbols.length) {
    throw new Error('config.knownSymbols must not contain duplicates');
  }

  return Object.freeze({
    baseReelCount,
    knownSymbols: Object.freeze([...knownSymbols]),
  });
}

export function loadGameValidationConfig(
  root: string,
  configPath: string | undefined,
): GameValidationConfig {
  if (configPath === undefined) {
    return DEFAULT_GAME_VALIDATION_CONFIG;
  }

  const absolutePath = resolve(root, configPath);
  const text = readFileSync(absolutePath, 'utf8');

  try {
    return parseGameValidationConfig(JSON.parse(text) as unknown);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid validation config ${configPath}: ${message}`, { cause: error });
  }
}

export function selectRules(category?: RuleCategory): readonly ValidationRule[] {
  return category === undefined
    ? ALL_RULES
    : ALL_RULES.filter((rule) => rule.category === category);
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

export function runCli(options: CliOptions, root = process.cwd()): ValidationReportDocument {
  const fixturesDirectory = join(root, 'fixtures');
  const discovered = discoverFixtureNames(fixturesDirectory);
  const fixtureNames =
    options.fixture === undefined
      ? discovered
      : discovered.includes(options.fixture)
        ? [options.fixture]
        : (() => {
            throw new Error(`Fixture not found: ${options.fixture}`);
          })();

  if (options.fixture === undefined && discovered.length !== 30) {
    throw new Error(`Expected 30 fixture JSON files, found ${discovered.length}`);
  }

  const rules = selectRules(options.category);
  const config = loadGameValidationConfig(root, options.configPath);
  const engine = new ValidationEngine(rules);
  const summaries = fixtureNames.map((fixtureName) => {
    const raw = parseFixture(join(fixturesDirectory, fixtureName));
    const context = buildValidationContext(fixtureName, raw, config);

    return summarizeFixture(fixtureName, engine.evaluate(context));
  });

  const document = buildReportDocument('fixtures', summaries, rules.length);

  writeReports(
    document,
    join(root, 'reports', 'human', 'validation-report.txt'),
    join(root, 'reports', 'json', 'validation-report.json'),
    options.format,
  );

  return document;
}

export function gateExitCode(document: ValidationReportDocument, gate: boolean): number {
  return gate && document.aggregate.failed > 0 ? 1 : 0;
}

export function helpText(): string {
  return [
    'Senior Math QA validator',
    '',
    'Usage: npm run validate -- [options]',
    '',
    'Options:',
    '  --fixture <file>       Validate one fixture instead of the full benchmark',
    `  --category <category>  Filter rules: ${RULE_CATEGORIES.join(', ')}`,
    '  --config <file>        Load game validation config JSON',
    '  --format <format>      Report artifacts: both (default), human, or json',
    '  --gate                 Exit non-zero when confirmed findings exist',
    '  --help, -h             Show this help',
    '',
    'Analysis mode is the default: known benchmark findings are reported without failing execution.',
    'Gate mode is intended for CI against data expected to be defect-free.',
    '',
  ].join('\n');
}

function isDirectExecution(): boolean {
  const executedPath = process.argv[1];

  return executedPath !== undefined && fileURLToPath(import.meta.url) === executedPath;
}

if (isDirectExecution()) {
  try {
    const options = parseCliArguments(process.argv.slice(2));

    if (options.help) {
      process.stdout.write(helpText());
    } else {
      const document = runCli(options);
      process.stdout.write(
        [
          'Validation completed successfully.',
          `Fixtures: ${document.aggregate.fixtures}`,
          `Rules per fixture: ${document.generatedFrom.ruleCount}`,
          `Confirmed findings: ${document.aggregate.failed}`,
          `Mode: ${options.gate ? 'gate' : 'analysis'}`,
          `Report format: ${options.format}`,
          '',
        ].join('\n'),
      );
      process.exitCode = gateExitCode(document, options.gate);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
    process.stderr.write(`Validation execution failed:\n${message}\n`);
    process.exitCode = 2;
  }
}
