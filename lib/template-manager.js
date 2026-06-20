const { loadTemplates, saveTemplates, getTemplate, getAllTemplates, addTemplate, removeTemplate, templateExists, TEMPLATES_FILE } = require('./storage');
const { TemplateSourceManager } = require('./template-sources');

class TemplateManager {
  constructor(options = {}) {
    this.sourceManager = options.sourceManager || new TemplateSourceManager();
  }

  list() {
    const templates = getAllTemplates();
    return Object.keys(templates)
      .sort()
      .map(name => templates[name]);
  }

  get(name) {
    return getTemplate(name);
  }

  exists(name) {
    return templateExists(name);
  }

  async register(name, sourcePath, options = {}) {
    if (!name || name.trim() === '') {
      throw new Error('Template name cannot be empty');
    }

    if (this.exists(name)) {
      throw new Error(`Template "${name}" already exists`);
    }

    const resolved = await this.sourceManager.resolve(sourcePath);

    const success = addTemplate(name, resolved.resolvedPath);
    if (!success) {
      throw new Error('Failed to register template');
    }

    return {
      name,
      sourcePath: resolved.resolvedPath,
      sourceType: resolved.type,
      createdAt: new Date().toISOString()
    };
  }

  remove(name) {
    if (!this.exists(name)) {
      throw new Error(`Template "${name}" does not exist`);
    }

    const success = removeTemplate(name);
    if (!success) {
      throw new Error('Failed to remove template');
    }

    return true;
  }

  getTemplatesFile() {
    return TEMPLATES_FILE;
  }

  async resolveTemplate(name) {
    const template = this.get(name);
    if (!template) {
      throw new Error(`Template "${name}" not found`);
    }

    const resolvedInfo = {
      type: 'local',
      reference: template.sourcePath,
      resolvedPath: template.sourcePath
    };

    return resolvedInfo;
  }
}

module.exports = TemplateManager;
