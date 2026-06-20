const os = require('os');
const fs = require('fs');
const path = require('path');
const { createTempDirManager, createMockStorage, withTempDir, readFileUtf8 } = require('./helpers');

describe('TemplateManager', () => {
  let tempMgr;
  let storageTempDir;
  let storage;
  let TemplateManager;
  let templateManager;

  beforeEach(() => {
    tempMgr = createTempDirManager();

    storageTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scaffold-test-storage-'));
    tempMgr.dirs.push(storageTempDir);

    storage = createMockStorage(storageTempDir);

    jest.doMock('../lib/storage', () => storage);

    jest.resetModules();
    TemplateManager = require('../lib/template-manager');

    templateManager = new TemplateManager();

    const data = { templates: {} };
    storage.saveTemplates(data);
  });

  afterEach(() => {
    tempMgr.cleanup();
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('register', () => {
    test('注册模板成功', async () => {
      const templateDir = tempMgr.createTemplateDir({
        'package.json': '{"name": "test"}',
        'index.js': 'console.log("hello");'
      });

      const result = await templateManager.register('test-template', templateDir);

      expect(result.name).toBe('test-template');
      expect(result.sourcePath).toBe(templateDir);
      expect(result.sourceType).toBe('local');
      expect(result.createdAt).toBeDefined();

      const saved = storage.getTemplate('test-template');
      expect(saved).not.toBeNull();
      expect(saved.name).toBe('test-template');
      expect(saved.sourcePath).toBe(templateDir);
    });

    test('注册重复模板名报错', async () => {
      const templateDir1 = tempMgr.createTemplateDir({
        'package.json': '{"name": "test1"}'
      });
      const templateDir2 = tempMgr.createTemplateDir({
        'package.json': '{"name": "test2"}'
      });

      await templateManager.register('my-template', templateDir1);

      await expect(templateManager.register('my-template', templateDir2))
        .rejects
        .toThrow('Template "my-template" already exists');
    });

    test('模板名为空报错', async () => {
      const templateDir = tempMgr.createTemplateDir({
        'package.json': '{"name": "test"}'
      });

      await expect(templateManager.register('', templateDir))
        .rejects
        .toThrow('Template name cannot be empty');
    });

    test('模板名只有空格报错', async () => {
      const templateDir = tempMgr.createTemplateDir({
        'package.json': '{"name": "test"}'
      });

      await expect(templateManager.register('   ', templateDir))
        .rejects
        .toThrow('Template name cannot be empty');
    });

    test('源目录不存在报错', async () => {
      const nonExistentDir = tempMgr.createDir();
      fs.rmdirSync(nonExistentDir);

      await expect(templateManager.register('test', nonExistentDir))
        .rejects
        .toThrow(/Directory does not exist/);
    });

    test('源路径不是目录报错', async () => {
      const tempDir = tempMgr.createDir();
      const filePath = path.join(tempDir, 'test.txt');
      fs.writeFileSync(filePath, 'content');

      await expect(templateManager.register('test', filePath))
        .rejects
        .toThrow(/Not a directory/);
    });

    test('空目录不能注册', async () => {
      const emptyDir = tempMgr.createDir();

      await expect(templateManager.register('test', emptyDir))
        .rejects
        .toThrow('Directory is empty');
    });
  });

  describe('list', () => {
    test('没有模板时返回空数组', () => {
      const templates = templateManager.list();
      expect(templates).toEqual([]);
    });

    test('列出所有已注册的模板', async () => {
      const dir1 = tempMgr.createTemplateDir({ 'a.txt': 'a' });
      const dir2 = tempMgr.createTemplateDir({ 'b.txt': 'b' });
      const dir3 = tempMgr.createTemplateDir({ 'c.txt': 'c' });

      await templateManager.register('template-a', dir1);
      await templateManager.register('template-b', dir2);
      await templateManager.register('template-c', dir3);

      const templates = templateManager.list();

      expect(templates).toHaveLength(3);
      expect(templates.map(t => t.name)).toEqual(['template-a', 'template-b', 'template-c']);
    });

    test('模板按名称排序', async () => {
      const dir1 = tempMgr.createTemplateDir({ 'a.txt': 'a' });
      const dir2 = tempMgr.createTemplateDir({ 'b.txt': 'b' });
      const dir3 = tempMgr.createTemplateDir({ 'c.txt': 'c' });

      await templateManager.register('zebra', dir1);
      await templateManager.register('apple', dir2);
      await templateManager.register('monkey', dir3);

      const templates = templateManager.list();

      expect(templates.map(t => t.name)).toEqual(['apple', 'monkey', 'zebra']);
    });

    test('每个模板包含正确的字段', async () => {
      const dir = tempMgr.createTemplateDir({ 'test.txt': 'test' });
      await templateManager.register('my-template', dir);

      const templates = templateManager.list();
      const template = templates[0];

      expect(template.name).toBe('my-template');
      expect(template.sourcePath).toBe(dir);
      expect(template.createdAt).toBeDefined();
      expect(new Date(template.createdAt).toString()).not.toBe('Invalid Date');
    });
  });

  describe('get', () => {
    test('获取存在的模板', async () => {
      const dir = tempMgr.createTemplateDir({ 'test.txt': 'test' });
      await templateManager.register('my-template', dir);

      const template = templateManager.get('my-template');

      expect(template).not.toBeNull();
      expect(template.name).toBe('my-template');
      expect(template.sourcePath).toBe(dir);
    });

    test('获取不存在的模板返回 null', () => {
      const template = templateManager.get('non-existent');
      expect(template).toBeNull();
    });
  });

  describe('exists', () => {
    test('模板存在返回 true', async () => {
      const dir = tempMgr.createTemplateDir({ 'test.txt': 'test' });
      await templateManager.register('my-template', dir);

      expect(templateManager.exists('my-template')).toBe(true);
    });

    test('模板不存在返回 false', () => {
      expect(templateManager.exists('non-existent')).toBe(false);
    });
  });

  describe('remove', () => {
    test('删除存在的模板', async () => {
      const dir = tempMgr.createTemplateDir({ 'test.txt': 'test' });
      await templateManager.register('my-template', dir);

      expect(templateManager.exists('my-template')).toBe(true);

      const result = templateManager.remove('my-template');

      expect(result).toBe(true);
      expect(templateManager.exists('my-template')).toBe(false);
      expect(storage.getTemplate('my-template')).toBeNull();
    });

    test('删除不存在的模板报错', () => {
      expect(() => templateManager.remove('non-existent'))
        .toThrow('Template "non-existent" does not exist');
    });

    test('删除后其他模板不受影响', async () => {
      const dir1 = tempMgr.createTemplateDir({ 'a.txt': 'a' });
      const dir2 = tempMgr.createTemplateDir({ 'b.txt': 'b' });

      await templateManager.register('template-1', dir1);
      await templateManager.register('template-2', dir2);

      templateManager.remove('template-1');

      expect(templateManager.exists('template-1')).toBe(false);
      expect(templateManager.exists('template-2')).toBe(true);
    });
  });

  describe('resolveTemplate', () => {
    test('解析存在的模板', async () => {
      const dir = tempMgr.createTemplateDir({ 'test.txt': 'test' });
      await templateManager.register('my-template', dir);

      const resolved = await templateManager.resolveTemplate('my-template');

      expect(resolved.type).toBe('local');
      expect(resolved.resolvedPath).toBe(dir);
    });

    test('解析不存在的模板报错', async () => {
      await expect(templateManager.resolveTemplate('non-existent'))
        .rejects
        .toThrow('Template "non-existent" not found');
    });
  });

  describe('getTemplatesFile', () => {
    test('返回存储文件路径', () => {
      const templatesFile = templateManager.getTemplatesFile();
      expect(templatesFile).toBe(storage.TEMPLATES_FILE);
      expect(templatesFile).toContain('.scaffold-cli');
      expect(templatesFile).toContain('templates.json');
    });
  });

  describe('测试用例独立性', () => {
    test('第一个测试注册的模板不会影响第二个测试 - 测试1', async () => {
      const dir = tempMgr.createTemplateDir({ 'test.txt': 'test' });
      await templateManager.register('shared-name', dir);
      expect(templateManager.exists('shared-name')).toBe(true);
    });

    test('第一个测试注册的模板不会影响第二个测试 - 测试2', () => {
      expect(templateManager.exists('shared-name')).toBe(false);
    });
  });
});
