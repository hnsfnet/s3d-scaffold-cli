class TemplateSource {
  constructor(config = {}) {
    this.config = config;
  }

  get type() {
    throw new Error('Subclasses must implement get type()');
  }

  async resolve(reference) {
    throw new Error('Subclasses must implement resolve()');
  }

  async materialize(resolvedPath, targetDir) {
    throw new Error('Subclasses must implement materialize()');
  }

  canHandle(reference) {
    return false;
  }

  validate(reference) {
    return { valid: false, error: 'Not implemented' };
  }
}

module.exports = TemplateSource;
