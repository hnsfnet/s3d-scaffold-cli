const initCommand = require('./commands/init');
const listCommand = require('./commands/list');
const createCommand = require('./commands/create');
const removeCommand = require('./commands/remove');

let isExiting = false;

process.on('SIGINT', () => {
  if (isExiting) {
    process.exit(130);
  }
  isExiting = true;
  console.log('');
  console.log('');
  console.log('Operation cancelled by user.');
  process.exit(130);
});

function printHelp() {
  console.log(`
Usage: scaffold <command> [options]

Commands:
  init <template-name>        Register current directory as a template
  list                        List all registered templates
  create <template-name> <target-dir> [options]
                              Create a new project from a template
  remove <template-name>      Remove a template

Create options:
  --var <key>=<value>         Set template variable (can be used multiple times)
  --force                     Overwrite existing files without prompting

Template variables:
  Use {{variable_name}} or {{variable_name:Hint text}} in your template files.
  If --var is not provided for all variables, interactive mode will be enabled.

Examples:
  scaffold init express-api
  scaffold create express-api ./my-app
  scaffold create express-api ./my-app --var project_name=my-app --var author=张三
  scaffold create express-api ./my-app --force
  scaffold remove express-api

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
