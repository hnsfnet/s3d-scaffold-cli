const fs = require('fs');
const path = require('path');
const { shouldIgnoreDir, shouldIgnoreFile } = require('./utils');

const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)(?:\s*:\s*([^}]+?))?\s*\}\}/g;

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.svg',
  '.mp3', '.mp4', '.avi', '.mov', '.wav', '.flac',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.exe', '.dll', '.so', '.dylib',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.psd', '.ai', '.sketch', '.figma'
]);

function isBinaryFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

function scanTemplateVariables(sourcePath) {
  const variables = new Map();

  function scanDir(dirPath) {
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        if (shouldIgnoreDir(item)) {
          continue;
        }
        scanDir(fullPath);
      } else if (stats.isFile()) {
        if (shouldIgnoreFile(item) || isBinaryFile(fullPath)) {
          continue;
        }
        scanFile(fullPath);
      }
    }
  }

  function scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      let match;
      VARIABLE_PATTERN.lastIndex = 0;

      while ((match = VARIABLE_PATTERN.exec(content)) !== null) {
        const varName = match[1];
        const varHint = match[2] ? match[2].trim() : null;

        if (!variables.has(varName)) {
          variables.set(varName, {
            name: varName,
            hint: varHint,
            files: []
          });
        }

        const varInfo = variables.get(varName);
        if (varHint && !varInfo.hint) {
          varInfo.hint = varHint;
        }
        if (!varInfo.files.includes(filePath)) {
          varInfo.files.push(filePath);
        }
      }
    } catch (error) {
      if (error.code !== 'EISDIR') {
        console.log(`Warning: Cannot scan ${filePath}: ${error.message}`);
      }
    }
  }

  if (fs.existsSync(sourcePath)) {
    scanDir(sourcePath);
  }

  return Array.from(variables.values());
}

function replaceVariablesInContent(content, variables) {
  return content.replace(VARIABLE_PATTERN, (match, varName) => {
    if (variables.hasOwnProperty(varName)) {
      return variables[varName];
    }
    return match;
  });
}

function replaceVariablesInFile(filePath, variables) {
  if (isBinaryFile(filePath)) {
    return false;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const newContent = replaceVariablesInContent(content, variables);

    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
      return true;
    }
  } catch (error) {
    if (error.code !== 'EISDIR') {
      throw error;
    }
  }

  return false;
}

function replaceVariablesInDir(dirPath, variables) {
  const modifiedFiles = [];
  const items = fs.readdirSync(dirPath);

  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      if (shouldIgnoreDir(item)) {
        continue;
      }
      const subModified = replaceVariablesInDir(fullPath, variables);
      modifiedFiles.push(...subModified);
    } else if (stats.isFile()) {
      if (shouldIgnoreFile(item)) {
        continue;
      }
      if (replaceVariablesInFile(fullPath, variables)) {
        modifiedFiles.push(fullPath);
      }
    }
  }

  return modifiedFiles;
}

function getVariableDisplay(varInfo) {
  if (varInfo.hint) {
    return `${varInfo.name} (${varInfo.hint})`;
  }
  return varInfo.name;
}

module.exports = {
  scanTemplateVariables,
  replaceVariablesInContent,
  replaceVariablesInFile,
  replaceVariablesInDir,
  getVariableDisplay,
  VARIABLE_PATTERN
};
