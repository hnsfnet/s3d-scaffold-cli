const LocalDirectorySource = require('./local');
const TemplateSource = require('./base');

class TemplateSourceManager {
  constructor() {
    this.sources = [];
    this._registerDefaultSources();
  }

  _registerDefaultSources() {
    this.register(new LocalDirectorySource());
  }

  register(source) {
    if (!(source instanceof TemplateSource)) {
      throw new Error('Source must be an instance of TemplateSource');
    }
    this.sources.push(source);
    return this;
  }

  unregister(sourceType) {
    const index = this.sources.findIndex(s => s.type === sourceType);
    if (index !== -1) {
      this.sources.splice(index, 1);
      return true;
    }
    return false;
  }

  getSource(reference) {
    for (const source of this.sources) {
      if (source.canHandle(reference)) {
        return source;
      }
    }
    return null;
  }

  getSourceByType(type) {
    return this.sources.find(s => s.type === type) || null;
  }

  async resolve(reference) {
    const source = this.getSource(reference);
    if (!source) {
      throw new Error(`No template source found for: ${reference}`);
    }
    return await source.resolve(reference);
  }

  async materialize(resolvedInfo, targetDir) {
    const source = this.getSourceByType(resolvedInfo.type);
    if (!source) {
      throw new Error(`Unknown template source type: ${resolvedInfo.type}`);
    }
    return await source.materialize(resolvedInfo, targetDir);
  }

  validate(reference) {
    const source = this.getSource(reference);
    if (!source) {
      return { valid: false, error: `No template source found for: ${reference}` };
    }
    return source.validate(reference);
  }
}

module.exports = {
  TemplateSourceManager,
  TemplateSource,
  LocalDirectorySource
};
