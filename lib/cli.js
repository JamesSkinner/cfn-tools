import program from 'commander';
import yaml from 'js-yaml';

import * as config from './config';
import log from './logger';


program.option('-c, --config-file <configFile>', 'Config file path', config.DEFAULT_CONFIG_FILE);
program.option('--verbose', 'Enable debug logging');
program.option('--trace', 'Enable trace logging');
program.option('--silent', 'Disable logging');
program.option('--format <format>', 'Output format', ['json', 'text'], 'json');

program
  .command('init')
  .description('Create empty config file')
  .action(init);
program
  .command('s3-sync')
  .description('Sync templates to S3')
  .action(() => runCommand('s3-sync'));
program
  .command('cfn-deploy')
  .description('Create/update stack from S3 bucket')
  .action(() => runCommand('cfn-deploy'));
program
  .command('deploy')
  .description('Sync templates to S3 and create/update stack')
  .action(() => runCommand('deploy'));
program
  .command('get-output')
  .description('Get output from existing stack')
  .option('--output-key <outputKey>', 'Specific output key.')
  .action(opts => runCommand('get-output', { outputKey: opts.outputKey }));

program.parse(process.argv);

function init() {
  config.writeDefaultConfig();
  log.info(`Wrote file to ${config.DEFAULT_CONFIG_FILE}`);
}

async function runCommand(name, opts) {
  if (program.verbose) log.setLevel('DEBUG');
  if (program.trace) log.setLevel('TRACE');
  if (program.silent) log.setLevel('ERROR');

  try {
    const conf = config.loadConfig({ file: program.configFile });
    log.debug('Config:\n ', yaml.dump(conf).replace(/\n/g, '\n  '));
    const mod = require(`../lib/commands/${name}`);
    const result = await mod.default(conf, opts);
    if (result) {
      if (program.format === 'json') {
        console.log(JSON.stringify(result));
      } else {
        console.log(result);
      }
    }
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  }
}
