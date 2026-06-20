const fs = require('fs');
const path = require('path');
const { TempDirManager, createTempDirManager } = require('./temp-dir');
const {
  MockReadlineInterface,
  mockReadlineCreateInterface,
  mockProcessStdin,
  mockProcessStdout
} = require('./mock-input');
const { createMockStorage, mockStorageModule } = require('./mock-storage');

function readFileUtf8(filePath) {
  return fs.readFileSync(filePath, 'utf-8');
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function isDirectory(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).isDirectory();
}

function listFiles(dirPath, recursive = true) {
  const result = [];
  const items = fs.readdirSync(dirPath);

  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (recursive) {
        const subFiles = listFiles(fullPath, true);
        result.push(...subFiles.map(f => path.join(item, f)));
      }
    } else {
      result.push(item);
    }
  }

  return result.sort();
}

function withTempDir(testFn) {
  return async () => {
    const tempMgr = createTempDirManager();
    try {
      await testFn(tempMgr);
    } finally {
      tempMgr.cleanup();
    }
  };
}

module.exports = {
  TempDirManager,
  createTempDirManager,
  MockReadlineInterface,
  mockReadlineCreateInterface,
  mockProcessStdin,
  mockProcessStdout,
  createMockStorage,
  mockStorageModule,
  readFileUtf8,
  fileExists,
  isDirectory,
  listFiles,
  withTempDir
};
