const fs = require('fs');
const path = require('path');

const IGNORE_DIRS = [
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  '.idea',
  '.vscode',
  'dist',
  'build',
  '.next',
  '.nuxt',
  '.cache',
  'coverage'
];

const IGNORE_FILES = [
  '.DS_Store',
  'Thumbs.db',
  '*.log',
  '.env',
  '.env.local'
];

function shouldIgnoreDir(dirName) {
  return IGNORE_DIRS.includes(dirName);
}

function shouldIgnoreFile(fileName) {
  if (IGNORE_FILES.includes(fileName)) {
    return true;
  }
  for (const pattern of IGNORE_FILES) {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      if (regex.test(fileName)) {
        return true;
      }
    }
  }
  return false;
}

async function copyDirectory(source, target, options = {}) {
  const {
    onConflict = null,
    force = false
  } = options;

  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const items = fs.readdirSync(source);
  const result = {
    copied: [],
    skipped: [],
    backedUp: []
  };

  let globalAction = null;

  for (const item of items) {
    const sourcePath = path.join(source, item);
    const targetPath = path.join(target, item);

    const stats = fs.statSync(sourcePath);

    if (stats.isDirectory()) {
      if (shouldIgnoreDir(item)) {
        continue;
      }
      const subResult = await copyDirectory(sourcePath, targetPath, {
        onConflict,
        force,
        _globalAction: globalAction
      });
      result.copied.push(...subResult.copied);
      result.skipped.push(...subResult.skipped);
      result.backedUp.push(...subResult.backedUp);
      if (subResult._globalAction) {
        globalAction = subResult._globalAction;
      }
    } else if (stats.isFile()) {
      if (shouldIgnoreFile(item)) {
        continue;
      }

      const action = await copyFileWithConflict(sourcePath, targetPath, {
        onConflict,
        force,
        globalAction
      });

      if (action === 'skip') {
        result.skipped.push(targetPath);
      } else if (action === 'backup') {
        result.backedUp.push(targetPath);
        result.copied.push(targetPath);
      } else if (action === 'overwrite' || action === 'overwrite-all') {
        result.copied.push(targetPath);
        if (action === 'overwrite-all') {
          globalAction = 'overwrite-all';
        }
      } else if (action === 'skip-all') {
        result.skipped.push(targetPath);
        globalAction = 'skip-all';
      }
    } else if (stats.isSymbolicLink()) {
      const linkTarget = fs.readlinkSync(sourcePath);
      if (!fs.existsSync(targetPath)) {
        fs.symlinkSync(linkTarget, targetPath);
        result.copied.push(targetPath);
      }
    }
  }

  if (options._globalAction !== undefined) {
    result._globalAction = globalAction;
  }

  return result;
}

async function copyFileWithConflict(source, target, options = {}) {
  const {
    onConflict = null,
    force = false,
    globalAction = null
  } = options;

  const targetDir = path.dirname(target);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  if (!fs.existsSync(target)) {
    fs.copyFileSync(source, target);
    return 'overwrite';
  }

  if (force) {
    fs.copyFileSync(source, target);
    return 'overwrite';
  }

  if (globalAction === 'overwrite-all') {
    fs.copyFileSync(source, target);
    return 'overwrite-all';
  }

  if (globalAction === 'skip-all') {
    return 'skip-all';
  }

  if (onConflict) {
    const action = await onConflict(target);
    switch (action) {
      case 'skip':
        return 'skip';
      case 'backup':
        backupFile(target);
        fs.copyFileSync(source, target);
        return 'backup';
      case 'overwrite':
        fs.copyFileSync(source, target);
        return 'overwrite';
      case 'overwrite-all':
        fs.copyFileSync(source, target);
        return 'overwrite-all';
      case 'skip-all':
        return 'skip-all';
      default:
        return 'skip';
    }
  }

  fs.copyFileSync(source, target);
  return 'overwrite';
}

function copyFile(source, target) {
  const targetDir = path.dirname(target);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  fs.copyFileSync(source, target);
}

function backupFile(filePath) {
  const dir = path.dirname(filePath);
  const baseName = path.basename(filePath);
  let backupPath = path.join(dir, baseName + '.bak');
  let counter = 1;

  while (fs.existsSync(backupPath)) {
    backupPath = path.join(dir, baseName + '.bak' + counter);
    counter++;
  }

  fs.renameSync(filePath, backupPath);
  return backupPath;
}

function isEmptyDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return true;
  }
  const items = fs.readdirSync(dirPath);
  return items.length === 0;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

module.exports = {
  copyDirectory,
  copyFileWithConflict,
  copyFile,
  backupFile,
  isEmptyDir,
  shouldIgnoreDir,
  shouldIgnoreFile,
  formatDate,
  IGNORE_DIRS
};
