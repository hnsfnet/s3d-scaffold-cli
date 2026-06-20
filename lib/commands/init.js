const fs = require('fs');
const { addTemplate, templateExists } = require('../storage');
const { isEmptyDir } = require('../utils');

function initCommand(args) {
  if (args.length === 0) {
    console.log('Error: Template name is required');
    console.log('Usage: scaffold init <template-name>');
    process.exit(1);
  }

  const templateName = args[0];
  const currentDir = process.cwd();

  if (!templateName || templateName.trim() === '') {
    console.log('Error: Template name cannot be empty');
    process.exit(1);
  }

  if (!fs.existsSync(currentDir)) {
    console.log('Error: Current directory does not exist');
    process.exit(1);
  }

  if (isEmptyDir(currentDir)) {
    console.log('Warning: Current directory is empty');
    process.exit(1);
  }

  if (templateExists(templateName)) {
    console.log(`Error: Template "${templateName}" already exists');
    console.log('Use a different name or remove the existing template first');
    process.exit(1);
  }

  const success = addTemplate(templateName, currentDir);

  if (success) {
    console.log(`Successfully registered template "${templateName}"');
    console.log(`Source path: ${currentDir}`);
    console.log('');
    console.log('You can now use:');
    console.log(`  scaffold create '${templateName}' <target-dir>');
    console.log('');
  } else {
    console.log('Error: Failed to register template');
    process.exit(1);
  }
}

module.exports = initCommand;
