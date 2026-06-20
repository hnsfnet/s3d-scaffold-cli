function createRemoveCommand(dependencies) {
  const { templateManager } = dependencies;

  return {
    name: 'remove',
    description: 'Remove a template',
    usage: 'scaffold remove <template-name>',

    async execute(args) {
      if (args.length === 0) {
        console.log('Error: Template name is required');
        console.log('Usage: scaffold remove <template-name>');
        process.exit(1);
      }

      const templateName = args[0];

      try {
        templateManager.remove(templateName);

        console.log(`Successfully removed template "${templateName}"`);
        console.log('');
        console.log('Note: The original source files are not deleted.');
        console.log('Only the template registration has been removed.');
      } catch (error) {
        console.log('Error:', error.message);
        console.log('');
        console.log('Available templates:');
        console.log('  scaffold list');
        process.exit(1);
      }
    }
  };
}

module.exports = createRemoveCommand;
