const initCommand = require('./commands/init');
const listCommand = require('./commands/list');
const createCommand = require('./commands/create');
const removeCommand = require('./commands/remove');

function printHelp() {
  console.log(`
Usage: scaffold <command> [options]

Commands:
  init <template-name>        Register current directory as a template
  list                        List all registered templates
  create <template-name> <target-dir>
                              Create a new project from a template
  remove <template-name>      Remove a template

Options:
  -h, --help                  Show this help message
  -v, --version               Show version number
  `);
}

function printVersion() {
  const pkg = require('../package.json');
  console.log(`v${pkg.version}`);
}

function run(args) {
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    printHelp();
    return;
  }

  if (args.includes('-v') || args.includes('--version')) {
    printVersion();
    return;
  }

  const command = args[0];

  switch (command) {
    case 'init':
      initCommand(args.slice(1));
      break;
    case 'list':
      listCommand();
      break;
    case 'create':
      createCommand(args.slice(1));
      break;
    case 'remove':
      removeCommand(args.slice(1));
      break;
    default:
      console.log(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

module.exports = {
  run,
  printHelp,
  printVersion
};
