const fs = require('fs');
const path = require('path');

function createMockStorage(tempDir) {
  const configDir = path.join(tempDir, '.scaffold-cli');
  const templatesFile = path.join(configDir, 'templates.json');

  function ensureConfigDir() {
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
  }

  function loadTemplates() {
    ensureConfigDir();
    if (!fs.existsSync(templatesFile)) {
      return { templates: {} };
    }
    try {
      const content = fs.readFileSync(templatesFile, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return { templates: {} };
    }
  }

  function saveTemplates(data) {
    ensureConfigDir();
    fs.writeFileSync(templatesFile, JSON.stringify(data, null, 2), 'utf-8');
  }

  function getTemplate(name) {
    const data = loadTemplates();
    return data.templates[name] || null;
  }

  function getAllTemplates() {
    const data = loadTemplates();
    return data.templates;
  }

  function addTemplate(name, sourcePath) {
    const data = loadTemplates();
    if (data.templates[name]) {
      return false;
    }
    data.templates[name] = {
      name,
      sourcePath,
      createdAt: new Date().toISOString()
    };
    saveTemplates(data);
    return true;
  }

  function removeTemplate(name) {
    const data = loadTemplates();
    if (!data.templates[name]) {
      return false;
    }
    delete data.templates[name];
    saveTemplates(data);
    return true;
  }

  function templateExists(name) {
    const data = loadTemplates();
    return !!data.templates[name];
  }

  return {
    loadTemplates,
    saveTemplates,
    getTemplate,
    getAllTemplates,
    addTemplate,
    removeTemplate,
    templateExists,
    TEMPLATES_FILE: templatesFile,
    CONFIG_DIR: configDir
  };
}

function mockStorageModule(tempDir) {
  const mockStorage = createMockStorage(tempDir);

  jest.doMock('../../lib/storage', () => mockStorage);

  return mockStorage;
}

module.exports = {
  createMockStorage,
  mockStorageModule
};
