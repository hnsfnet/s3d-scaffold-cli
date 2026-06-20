const path = require('path');
const { parseArgs } = require('./args');
const CommandRegistry = require('./cli/command-registry');
const TemplateManager = require('./template-manager');
const ProjectGenerator = require('./generator/project-generator');
const { interactiveUI } = require('./interactive');

const createInitCommand = require('./commands/init');
const createListCommand = require('./commands/list');
const createCreateCommand = require('./commands/create');
const createRemoveCommand = require('./commands/remove');

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
  const pkg = require(path.join(__dirname, '..', 'package.json'));
  console.log(`v${pkg.version}`);
}

function createApp() {
  const templateManager = new TemplateManager();
  const projectGenerator = new ProjectGenerator({ ui: interactiveUI });

  const dependencies = {
    templateManager,
    projectGenerator,
    interactiveUI,
    parseArgs
  };

  const registry = new CommandRegistry({
    version: '1.0.0',
    onHelp: printHelp,
    onVersion: printVersion,
    onError: (error) => {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

  registry.register('init', createInitCommand(dependencies));
  registry.register('list', createListCommand(dependencies));
  registry.register('create', createCreateCommand(dependencies));
  registry.register('remove', createRemoveCommand(dependencies));

  return {
    registry,
    templateManager,
    projectGenerator,
    interactiveUI,

    async run(args) {
      await registry.run(args);
    }
  };
}

function run(args) {
  const app = createApp();
  return app.run(args);
}

module.exports = {
  run,
  createApp,
  printHelp,
  printVersion,
  CommandRegistry,
  TemplateManager,
  ProjectGenerator
};
