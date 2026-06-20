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

function copyDirectory(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const items = fs.readdirSync(source);

  for (const item of items) {
    const sourcePath = path.join(source, item);
    const targetPath = path.join(target, item);

    const stats = fs.statSync(sourcePath);

    if (stats.isDirectory()) {
      if (shouldIgnoreDir(item)) {
        continue;
      }
      copyDirectory(sourcePath, targetPath);
    } else if (stats.isFile()) {
      if (shouldIgnoreFile(item)) {
        continue;
      }
      copyFile(sourcePath, targetPath);
    } else if (stats.isSymbolicLink()) {
      const linkTarget = fs.readlinkSync(sourcePath);
      fs.symlinkSync(linkTarget, targetPath);
    }
  }
}

function copyFile(source, target) {
  const targetDir = path.dirname(target);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  fs.copyFileSync(source, target);
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
  copyFile,
  isEmptyDir,
  shouldIgnoreDir,
  shouldIgnoreFile,
  formatDate,
  IGNORE_DIRS
};
