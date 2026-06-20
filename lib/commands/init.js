function createInitCommand(dependencies) {
  const { templateManager } = dependencies;

  return {
    name: 'init',
    description: 'Register current directory as a template',
    usage: 'scaffold init <template-name>',

    async execute(args) {
      if (args.length === 0) {
        console.log('Error: Template name is required');
        console.log('Usage: scaffold init <template-name>');
        process.exit(1);
      }

      const templateName = args[0];
      const currentDir = process.cwd();

      try {
        const result = await templateManager.register(templateName, currentDir);

        console.log(`Successfully registered template "${result.name}"`);
        console.log(`Source path: ${result.sourcePath}`);
        console.log('');
        console.log('You can now use:');
        console.log(`  scaffold create '${result.name}' <target-dir>`);
        console.log('');
      } catch (error) {
        console.log('Error:', error.message);
        process.exit(1);
      }
    }
  };
}

module.exports = createInitCommand;
