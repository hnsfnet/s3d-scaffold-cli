const fs = require('fs');
const path = require('path');
const { IGNORE_DIRS, isEmptyDir } = require('../utils');

function createCreateCommand(dependencies) {
  const { templateManager, projectGenerator, parseArgs } = dependencies;

  return {
    name: 'create',
    description: 'Create a new project from a template',
    usage: 'scaffold create <template-name> <target-dir> [options]',

    async execute(args) {
      let options;
      try {
        options = parseArgs(args);
      } catch (error) {
        console.log('Error:', error.message);
        console.log('');
        console.log('Usage: scaffold create <template-name> <target-dir> [options]');
        console.log('');
        console.log('Options:');
        console.log('  --var key=value       Set template variable (can be used multiple times)');
        console.log('  --force               Overwrite existing files without prompting');
        process.exit(1);
      }

      const positional = options.positional;
      const providedVars = options.vars;
      const force = options.force;

      if (positional.length < 2) {
        console.log('Error: Template name and target directory are required');
        console.log('Usage: scaffold create <template-name> <target-dir> [options]');
        process.exit(1);
      }

      const templateName = positional[0];
      const targetDir = path.resolve(positional[1]);

      let template;
      try {
        template = await templateManager.resolveTemplate(templateName);
      } catch (error) {
        console.log('Error:', error.message);
        console.log('');
        console.log('Available templates:');
        console.log('  scaffold list');
        process.exit(1);
      }

      if (!fs.existsSync(template.resolvedPath)) {
        console.log(`Error: Template source path does not exist: ${template.resolvedPath}`);
        console.log('This template may have been moved or deleted.');
        console.log('You can re-register it with:');
        console.log(`  scaffold init '${templateName}'`);
        process.exit(1);
      }

      if (fs.existsSync(targetDir) && !isEmptyDir(targetDir) && !force) {
        console.log(`Warning: Target directory "${targetDir}" already exists and is not empty`);
        console.log('Existing files may be overwritten. Use --force to skip this warning.');
        console.log('');
      }

      try {
        const result = await projectGenerator.generate(template.resolvedPath, targetDir, {
          vars: providedVars,
          force,
          interactive: true
        });

        console.log('✓ Project created successfully!');
        console.log('');
        console.log('Next steps:');
        console.log(`  cd ${targetDir}`);
        console.log('  npm install   # if needed');
        console.log('');
        console.log(`Skipped directories: ${IGNORE_DIRS.join(', ')}`);
      } catch (error) {
        console.error('Error creating project:', error.message);
        if (error.code === 'EACCES') {
          console.log('Permission denied. Check your directory permissions.');
        }
        process.exit(1);
      }
    }
  };
}

module.exports = createCreateCommand;
