const fs = require('fs');
const path = require('path');
const { getTemplate } = require('../storage');
const { copyDirectory, isEmptyDir, IGNORE_DIRS } = require('../utils');

function createCommand(args) {
  if (args.length < 2) {
    console.log('Error: Template name and target directory are required');
    console.log('Usage: scaffold create <template-name> <target-dir>');
    process.exit(1);
  }

  const templateName = args[0];
  const targetDir = path.resolve(args[1]);

  const template = getTemplate(templateName);
  if (!template) {
    console.log(`Error: Template "${templateName}" not found`);
    console.log('');
    console.log('Available templates:');
    console.log('  scaffold list');
    process.exit(1);
  }

  const sourcePath = template.sourcePath;
  if (!fs.existsSync(sourcePath)) {
    console.log(`Error: Template source path does not exist: ${sourcePath}`);
    console.log('This template may have been moved or deleted.');
    console.log('You can re-register it with:');
    console.log(`  scaffold init '${templateName}'`);
    process.exit(1);
  }

  if (fs.existsSync(targetDir) && !isEmptyDir(targetDir)) {
    console.log(`Error: Target directory "${targetDir}" already exists and is not empty`);
    console.log('Please choose a different directory or remove the existing one.');
    process.exit(1);
  }

  console.log(`Creating project from template "${templateName}"...`);
  console.log(`  Source: ${sourcePath}`);
  console.log(`  Target: ${targetDir}`);
  console.log('');

  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    copyDirectory(sourcePath, targetDir);

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

module.exports = createCommand;
