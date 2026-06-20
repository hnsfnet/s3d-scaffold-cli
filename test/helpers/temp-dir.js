const fs = require('fs');
const path = require('path');
const os = require('os');

class TempDirManager {
  constructor() {
    this.dirs = [];
  }

  createDir(prefix = 'scaffold-test-') {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    this.dirs.push(tempDir);
    return tempDir;
  }

  createTemplateDir(files, prefix = 'template-') {
    const dir = this.createDir(prefix);

    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = path.join(dir, filePath);
      const dirPath = path.dirname(fullPath);

      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      if (typeof content === 'string') {
        fs.writeFileSync(fullPath, content, 'utf-8');
      } else if (Buffer.isBuffer(content)) {
        fs.writeFileSync(fullPath, content);
      }
    }

    return dir;
  }

  cleanup() {
    for (const dir of this.dirs) {
      this._removeDir(dir);
    }
    this.dirs = [];
  }

  _removeDir(dir) {
    if (!fs.existsSync(dir)) {
      return;
    }

    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.lstatSync(fullPath);

      if (stat.isDirectory()) {
        this._removeDir(fullPath);
      } else {
        fs.unlinkSync(fullPath);
      }
    }

    fs.rmdirSync(dir);
  }
}

function createTempDirManager() {
  return new TempDirManager();
}

module.exports = {
  TempDirManager,
  createTempDirManager
};
