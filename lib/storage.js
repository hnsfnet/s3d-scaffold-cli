const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.scaffold-cli');
const TEMPLATES_FILE = path.join(CONFIG_DIR, 'templates.json');

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function ensureTemplatesFile() {
  ensureConfigDir();
  if (!fs.existsSync(TEMPLATES_FILE)) {
    fs.writeFileSync(TEMPLATES_FILE, JSON.stringify({ templates: {} }, null, 2));
  }
}

function loadTemplates() {
  ensureTemplatesFile();
  const content = fs.readFileSync(TEMPLATES_FILE, 'utf-8');
  return JSON.parse(content);
}

function saveTemplates(data) {
  ensureConfigDir();
  fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(data, null, 2));
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

module.exports = {
  getTemplate,
  getAllTemplates,
  addTemplate,
  removeTemplate,
  templateExists,
  TEMPLATES_FILE
};
