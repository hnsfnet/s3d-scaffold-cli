const fs = require('fs');
const path = require('path');
const { copyDirectory, IGNORE_DIRS } = require('../utils');
const { scanTemplateVariables, replaceVariablesInDir, getVariableDisplay } = require('../template');
const { promptForVariables, promptForFileConflict } = require('../interactive');

class ProjectGenerator {
  constructor(options = {}) {
    this.ui = options.ui || null;
    this.logger = options.logger || console;
  }

  async generate(templateSourcePath, targetDir, options = {}) {
    const {
      vars: providedVars = {},
      force = false,
      interactive = true
    } = options;

    const result = {
      copied: [],
      skipped: [],
      backedUp: [],
      modified: [],
      variables: {}
    };

    this.logger.log(`Creating project from template...`);
    this.logger.log(`  Source: ${templateSourcePath}`);
    this.logger.log(`  Target: ${targetDir}`);
    this.logger.log('');

    const variables = this.scanVariables(templateSourcePath);
    result.variables = await this.resolveVariables(variables, providedVars, interactive);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    this.logger.log('Copying files...');
    this.logger.log('');

    const copyResult = await this.copyFiles(templateSourcePath, targetDir, force);
    result.copied = copyResult.copied;
    result.skipped = copyResult.skipped;
    result.backedUp = copyResult.backedUp;

    this.logger.log('');
    this.logger.log('Copy summary:');
    this.logger.log(`  Copied: ${result.copied.length} file(s)`);
    if (result.backedUp.length > 0) {
      this.logger.log(`  Backed up: ${result.backedUp.length} file(s)`);
    }
    if (result.skipped.length > 0) {
      this.logger.log(`  Skipped: ${result.skipped.length} file(s)`);
    }
    this.logger.log('');

    if (variables.length > 0 && Object.keys(result.variables).length > 0) {
      this.logger.log('Replacing template variables...');
      const modified = replaceVariablesInDir(targetDir, result.variables);

      if (modified.length > 0) {
        this.logger.log(`Replaced variables in ${modified.length} file(s):`);
        for (const file of modified) {
          const relPath = path.relative(targetDir, file);
          this.logger.log(`  - ${relPath}`);
        }
        result.modified = modified;
      } else {
        this.logger.log('No variables were replaced.');
      }
      this.logger.log('');
    }

    return result;
  }

  scanVariables(templateSourcePath) {
    this.logger.log('Scanning template for variables...');
    const variables = scanTemplateVariables(templateSourcePath);

    if (variables.length > 0) {
      this.logger.log(`Found ${variables.length} template variable(s):`);
      for (const v of variables) {
        this.logger.log(`  - ${getVariableDisplay(v)}`);
      }
      this.logger.log('');
    }

    return variables;
  }

  async resolveVariables(variables, providedVars, interactive) {
    if (variables.length === 0) {
      return {};
    }

    const finalVars = { ...providedVars };
    const missingVars = variables.filter(v => !finalVars.hasOwnProperty(v.name));
    const hasAllVars = missingVars.length === 0;

    if (!hasAllVars && interactive) {
      this.logger.log('Some variables are missing. Entering interactive mode...');
      try {
        return await promptForVariables(variables, providedVars);
      } catch (error) {
        console.error('Error during input:', error.message);
        process.exit(1);
      }
    } else if (hasAllVars) {
      this.logger.log('All variables provided via --var:');
      this.logger.log('');
      for (const v of variables) {
        this.logger.log(`  ${getVariableDisplay(v)}: ${finalVars[v.name]}`);
      }
      this.logger.log('');
    } else if (!interactive) {
      const missingNames = missingVars.map(v => v.name).join(', ');
      throw new Error(`Missing required variables: ${missingNames}. Use --var or enable interactive mode.`);
    }

    return finalVars;
  }

  async copyFiles(sourcePath, targetDir, force) {
    let globalConflictAction = null;

    return await copyDirectory(sourcePath, targetDir, {
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
  }
}

module.exports = ProjectGenerator;
