const fs = require('fs');
const path = require('path');
const TemplateSource = require('./base');

class LocalDirectorySource extends TemplateSource {
  get type() {
    return 'local';
  }

  canHandle(reference) {
    if (!reference) return false;
    try {
      const resolved = path.resolve(reference);
      return fs.existsSync(resolved) && fs.statSync(resolved).isDirectory();
    } catch (error) {
      return false;
    }
  }

  validate(reference) {
    if (!reference) {
      return { valid: false, error: 'Reference cannot be empty' };
    }
    try {
      const resolved = path.resolve(reference);
      if (!fs.existsSync(resolved)) {
        return { valid: false, error: `Directory does not exist: ${resolved}` };
      }
      const stat = fs.statSync(resolved);
      if (!stat.isDirectory()) {
        return { valid: false, error: `Not a directory: ${resolved}` };
      }
      const items = fs.readdirSync(resolved);
      if (items.length === 0) {
        return { valid: false, error: 'Directory is empty' };
      }
      return { valid: true, resolvedPath: resolved };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  async resolve(reference) {
    const validation = this.validate(reference);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    return {
      type: this.type,
      reference,
      resolvedPath: validation.resolvedPath
    };
  }

  async materialize(resolvedInfo, targetDir) {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    return resolvedInfo.resolvedPath;
  }
}

module.exports = LocalDirectorySource;
