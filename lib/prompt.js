const readline = require('readline');

function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

function question(rl, text, defaultValue = null) {
  return new Promise((resolve) => {
    let promptText = text;
    if (defaultValue !== null && defaultValue !== '') {
      promptText += ` [${defaultValue}]`;
    }
    promptText += ': ';

    rl.question(promptText, (answer) => {
      answer = answer.trim();
      if (answer === '' && defaultValue !== null) {
        resolve(defaultValue);
      } else {
        resolve(answer);
      }
    });
  });
}

async function promptForVariables(variables, providedVars = {}) {
  const rl = createInterface();
  const results = { ...providedVars };

  try {
    console.log('');
    console.log('Please enter values for the following template variables:');
    console.log('(Press Enter to accept the default value)');
    console.log('');

    for (const varInfo of variables) {
      const varName = varInfo.name;

      if (results.hasOwnProperty(varName) && results[varName] !== undefined) {
        console.log(`  ${getDisplayText(varInfo)}: ${results[varName]} (already provided)`);
        continue;
      }

      while (true) {
        const displayText = getDisplayText(varInfo);
        const defaultValue = suggestDefault(varName);
        const answer = await question(rl, `  ${displayText}`, defaultValue);

        if (answer === '') {
          console.log('  Value cannot be empty. Please try again.');
          continue;
        }

        results[varName] = answer;
        break;
      }
    }

    console.log('');
    console.log('Summary of variable values:');
    console.log('');
    for (const varInfo of variables) {
      const varName = varInfo.name;
      const displayText = getDisplayText(varInfo);
      console.log(`  ${displayText}: ${results[varName]}`);
    }
    console.log('');

    while (true) {
      const confirm = await question(rl, 'Is this correct? (y/N)', 'N');
      const lowerConfirm = confirm.toLowerCase();

      if (lowerConfirm === 'y' || lowerConfirm === 'yes') {
        return results;
      } else if (lowerConfirm === 'n' || lowerConfirm === 'no' || lowerConfirm === '') {
        console.log('');
        console.log('Let\'s re-enter the values...');
        console.log('');
        for (const varInfo of variables) {
          const varName = varInfo.name;

          while (true) {
            const displayText = getDisplayText(varInfo);
            const currentValue = results[varName];
            const answer = await question(rl, `  ${displayText}`, currentValue);

            if (answer === '') {
              console.log('  Value cannot be empty. Please try again.');
              continue;
            }

            results[varName] = answer;
            break;
          }
        }

        console.log('');
        console.log('Updated summary:');
        console.log('');
        for (const varInfo of variables) {
          const varName = varInfo.name;
          const displayText = getDisplayText(varInfo);
          console.log(`  ${displayText}: ${results[varName]}`);
        }
        console.log('');
      } else {
        console.log('  Please enter y or n.');
      }
    }
  } finally {
    rl.close();
  }
}

async function promptForFileConflict(filePath, force = false) {
  if (force) {
    return 'overwrite';
  }

  const rl = createInterface();

  try {
    console.log('');
    console.log(`File conflict: ${filePath}`);
    console.log('');
    console.log('  [o] Overwrite');
    console.log('  [s] Skip');
    console.log('  [b] Backup and overwrite (rename existing to .bak)');
    console.log('  [O] Overwrite all');
    console.log('  [S] Skip all');
    console.log('');

    while (true) {
      const answer = await question(rl, 'Please choose an option', 's');
      const lowerAnswer = answer.toLowerCase();

      switch (lowerAnswer) {
        case 'o':
          return 'overwrite';
        case 's':
          return 'skip';
        case 'b':
          return 'backup';
        case 'O':
          return 'overwrite-all';
        case 'S':
          return 'skip-all';
        default:
          console.log('  Invalid option. Please try again.');
      }
    }
  } finally {
    rl.close();
  }
}

function getDisplayText(varInfo) {
  if (varInfo.hint) {
    return `${varInfo.name} (${varInfo.hint})`;
  }
  return varInfo.name;
}

function suggestDefault(varName) {
  const lower = varName.toLowerCase();

  if (lower.includes('project') || lower.includes('name')) {
    return null;
  }
  if (lower.includes('author') || lower.includes('username')) {
    return process.env.USER || process.env.USERNAME || null;
  }
  if (lower.includes('email')) {
    return null;
  }
  if (lower.includes('version')) {
    return '1.0.0';
  }
  if (lower.includes('description')) {
    return null;
  }
  if (lower.includes('license')) {
    return 'MIT';
  }
  if (lower.includes('port')) {
    return '3000';
  }

  return null;
}

module.exports = {
  promptForVariables,
  promptForFileConflict,
  question
};
