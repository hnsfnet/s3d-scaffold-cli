const fs = require('fs');
const path = require('path');
const { getTemplate } = require('../storage');
const { copyDirectory, isEmptyDir, IGNORE_DIRS } = require('../utils');
const { parseArgs } = require('../args');
const { scanTemplateVariables, replaceVariablesInDir, getVariableDisplay } = require('../template');
const { promptForVariables, promptForFileConflict } = require('../prompt');

async function createCommand(args) {
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

  if (fs.existsSync(targetDir) && !isEmptyDir(targetDir) && !force) {
    console.log(`Warning: Target directory "${targetDir}" already exists and is not empty`);
    console.log('Existing files may be overwritten. Use --force to skip this warning.');
    console.log('');
  }

  console.log(`Creating project from template "${templateName}"...`);
  console.log(`  Source: ${sourcePath}`);
  console.log(`  Target: ${targetDir}`);
  console.log('');

  console.log('Scanning template for variables...');
  const variables = scanTemplateVariables(sourcePath);

  if (variables.length > 0) {
    console.log(`Found ${variables.length} template variable(s):`);
    for (const v of variables) {
      console.log(`  - ${getVariableDisplay(v)}`);
    }
    console.log('');
  }

  let finalVars = { ...providedVars };

  if (variables.length > 0) {
    const missingVars = variables.filter(v => !finalVars.hasOwnProperty(v.name));
    const hasAllVars = missingVars.length === 0;

    if (!hasAllVars) {
      console.log('Some variables are missing. Entering interactive mode...');
      try {
        finalVars = await promptForVariables(variables, providedVars);
      } catch (error) {
        console.error('Error during input:', error.message);
        process.exit(1);
      }
    } else {
      console.log('All variables provided via --var:');
      console.log('');
      for (const v of variables) {
        console.log(`  ${getVariableDisplay(v)}: ${finalVars[v.name]}`);
      }
      console.log('');
    }
  }

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  console.log('Copying files...');
  console.log('');

  let globalConflictAction = null;

  const copyResult = await copyDirectory(sourcePath, targetDir, {
    force,
    onConflict: async (filePath) => {
      if (force) {
        return 'overwrite';
      }
      if (globalConflictAction === 'overwrite-all') {
        return 'overwrite-all';
      }
      if (globalConflictAction === 'skip-all') {
        return 'skip-all';
      }

      const action = await promptForFileConflict(filePath);
      if (action === 'overwrite-all') {
        globalConflictAction = 'overwrite-all';
      } else if (action === 'skip-all') {
        globalConflictAction = 'skip-all';
      }
      return action;
    }
  });

  console.log('');
  console.log('Copy summary:');
  console.log(`  Copied: ${copyResult.copied.length} file(s)`);
  if (copyResult.backedUp.length > 0) {
    console.log(`  Backed up: ${copyResult.backedUp.length} file(s)`);
  }
  if (copyResult.skipped.length > 0) {
    console.log(`  Skipped: ${copyResult.skipped.length} file(s)`);
  }
  console.log('');

  if (variables.length > 0 && Object.keys(finalVars).length > 0) {
    console.log('Replacing template variables...');
    const modifiedFiles = replaceVariablesInDir(targetDir, finalVars);

    if (modifiedFiles.length > 0) {
      console.log(`Replaced variables in ${modifiedFiles.length} file(s):`);
      for (const file of modifiedFiles) {
        const relPath = path.relative(targetDir, file);
        console.log(`  - ${relPath}`);
      }
    } else {
      console.log('No variables were replaced.');
    }
    console.log('');
  }

  console.log('✓ Project created successfully!');
  console.log('');
  console.log('Next steps:');
  console.log(`  cd ${targetDir}`);
  console.log('  npm install   # if needed');
  console.log('');
  console.log(`Skipped directories: ${IGNORE_DIRS.join(', ')}`);
}

module.exports = createCommand;
