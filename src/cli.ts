import process from 'node:process';

import { gateExitCode, helpText, parseCliArguments, runCli } from './cli-core.js';

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
