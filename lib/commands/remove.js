const { removeTemplate, templateExists } = require('../storage');

function removeCommand(args) {
  if (args.length === 0) {
    console.log('Error: Template name is required');
    console.log('Usage: scaffold remove <template-name>');
    process.exit(1);
  }

  const templateName = args[0];

  if (!templateExists(templateName)) {
    console.log(`Error: Template "${templateName}" does not exist`);
    console.log('');
    console.log('Available templates:');
    console.log('  scaffold list');
    process.exit(1);
  }

  const success = removeTemplate(templateName);

  if (success) {
    console.log(`Successfully removed template "${templateName}"`);
    console.log('');
    console.log('Note: The original source files are not deleted.');
    console.log('Only the template registration has been removed.');
  } else {
    console.log('Error: Failed to remove template');
    process.exit(1);
  }
}

module.exports = removeCommand;
