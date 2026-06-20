const fs = require('fs');
const path = require('path');
const ProjectGenerator = require('../lib/generator/project-generator');
const { createTempDirManager, withTempDir, readFileUtf8, fileExists, listFiles } = require('./helpers');

class MockLogger {
  constructor() {
    this.logs = [];
  }
  log(...args) {
    this.logs.push(args.join(' '));
  }
  clear() {
    this.logs = [];
  }
}

class MockUI {
  constructor() {
    this.variableInputs = [];
    this.conflictActions = [];
    this.varCallCount = 0;
    this.conflictCallCount = 0;
  }

  setVariableValues(values) {
    this.variableInputs = values;
    this.varCallCount = 0;
  }

  setConflictActions(actions) {
    this.conflictActions = actions;
    this.conflictCallCount = 0;
  }

  async promptForVariables(variables, providedVars) {
    const results = { ...providedVars };
    for (const v of variables) {
      if (!results.hasOwnProperty(v.name)) {
        if (this.varCallCount < this.variableInputs.length) {
          results[v.name] = this.variableInputs[this.varCallCount];
          this.varCallCount++;
        } else {
          results[v.name] = `default-${v.name}`;
        }
      }
    }
    return results;
  }

  async promptForFileConflict(filePath) {
    if (this.conflictCallCount < this.conflictActions.length) {
      const action = this.conflictActions[this.conflictCallCount];
      this.conflictCallCount++;
      return action;
    }
    return 'skip';
  }
}

describe('ProjectGenerator', () => {
  let tempMgr;
  let logger;
  let ui;
  let generator;

  beforeEach(() => {
    tempMgr = createTempDirManager();
    logger = new MockLogger();
    ui = new MockUI();
    generator = new ProjectGenerator({ ui, logger });
  });

  afterEach(() => {
    tempMgr.cleanup();
  });

  describe('generate', () => {
    test('从模板生成项目 - 无变量', withTempDir(async (tempMgr) => {
      const templateDir = tempMgr.createTemplateDir({
        'package.json': '{"name": "test-project", "version": "1.0.0"}',
        'README.md': '# Test Project',
        'src/index.js': 'console.log("hello");'
      });

      const targetDir = tempMgr.createDir('target-');

      const result = await generator.generate(templateDir, targetDir, {
        interactive: false
      });

      expect(fileExists(path.join(targetDir, 'package.json'))).toBe(true);
      expect(fileExists(path.join(targetDir, 'README.md'))).toBe(true);
      expect(fileExists(path.join(targetDir, 'src/index.js'))).toBe(true);

      expect(readFileUtf8(path.join(targetDir, 'package.json'))).toBe('{"name": "test-project", "version": "1.0.0"}');
      expect(readFileUtf8(path.join(targetDir, 'README.md'))).toBe('# Test Project');
      expect(readFileUtf8(path.join(targetDir, 'src/index.js'))).toBe('console.log("hello");');

      expect(result.copied).toHaveLength(3);
      expect(result.skipped).toHaveLength(0);
      expect(result.backedUp).toHaveLength(0);
      expect(result.modified).toHaveLength(0);
    }));

    test('文件复制正确', withTempDir(async (tempMgr) => {
      const templateDir = tempMgr.createTemplateDir({
        'a.txt': 'content A',
        'b.txt': 'content B',
        'sub/c.txt': 'content C',
        'sub/deep/d.txt': 'content D'
      });

      const targetDir = tempMgr.createDir('target-');

      await generator.generate(templateDir, targetDir, { interactive: false });

      const files = listFiles(targetDir);
      expect(files).toEqual(['a.txt', 'b.txt', 'sub/c.txt', 'sub/deep/d.txt']);

      expect(readFileUtf8(path.join(targetDir, 'a.txt'))).toBe('content A');
      expect(readFileUtf8(path.join(targetDir, 'sub/deep/d.txt'))).toBe('content D');
    }));

    test('变量替换正确', withTempDir(async (tempMgr) => {
      const templateDir = tempMgr.createTemplateDir({
        'package.json': '{"name": "{{project_name:项目名称}}", "author": "{{author}}"}',
        'README.md': '# {{project_name}}\n\nBy {{author}}'
      });

      const targetDir = tempMgr.createDir('target-');

      const result = await generator.generate(templateDir, targetDir, {
        vars: {
          project_name: 'my-awesome-app',
          author: '张三'
        },
        interactive: false
      });

      const packageJson = JSON.parse(readFileUtf8(path.join(targetDir, 'package.json')));
      expect(packageJson.name).toBe('my-awesome-app');
      expect(packageJson.author).toBe('张三');

      const readme = readFileUtf8(path.join(targetDir, 'README.md'));
      expect(readme).toContain('# my-awesome-app');
      expect(readme).toContain('By 张三');

      expect(result.modified).toHaveLength(2);
      expect(result.variables.project_name).toBe('my-awesome-app');
      expect(result.variables.author).toBe('张三');
    }));

    test('目标目录不存在时自动创建', withTempDir(async (tempMgr) => {
      const templateDir = tempMgr.createTemplateDir({
        'test.txt': 'content'
      });

      const baseDir = tempMgr.createDir();
      const targetDir = path.join(baseDir, 'non-existent', 'deep', 'target');

      expect(fileExists(targetDir)).toBe(false);

      await generator.generate(templateDir, targetDir, { interactive: false });

      expect(fileExists(targetDir)).toBe(true);
      expect(fileExists(path.join(targetDir, 'test.txt'))).toBe(true);
    }));

    test('跳过 node_modules 目录', withTempDir(async (tempMgr) => {
      const templateDir = tempMgr.createTemplateDir({
        'package.json': '{"name": "test"}',
        'node_modules/some-pkg/index.js': 'should be skipped',
        'src/index.js': 'should be copied'
      });

      const targetDir = tempMgr.createDir('target-');

      await generator.generate(templateDir, targetDir, { interactive: false });

      expect(fileExists(path.join(targetDir, 'package.json'))).toBe(true);
      expect(fileExists(path.join(targetDir, 'src/index.js'))).toBe(true);
      expect(fileExists(path.join(targetDir, 'node_modules'))).toBe(false);
    }));

    test('跳过 .git 目录', withTempDir(async (tempMgr) => {
      const templateDir = tempMgr.createTemplateDir({
        'package.json': '{"name": "test"}',
        '.git/HEAD': 'ref: refs/heads/main'
      });

      const targetDir = tempMgr.createDir('target-');

      await generator.generate(templateDir, targetDir, { interactive: false });

      expect(fileExists(path.join(targetDir, '.git'))).toBe(false);
    }));

    test('变量值包含 {{ 时正确替换', withTempDir(async (tempMgr) => {
      const templateDir = tempMgr.createTemplateDir({
        'test.txt': 'Hello {{name}}!'
      });

      const targetDir = tempMgr.createDir('target-');

      await generator.generate(templateDir, targetDir, {
        vars: { name: '{{张三}}' },
        interactive: false
      });

      expect(readFileUtf8(path.join(targetDir, 'test.txt'))).toBe('Hello {{张三}}!');
    }));

    test('交互式变量输入', withTempDir(async (tempMgr) => {
      const templateDir = tempMgr.createTemplateDir({
        'package.json': '{"name": "{{project_name}}", "author": "{{author}}"}'
      });

      const targetDir = tempMgr.createDir('target-');

      ui.setVariableValues(['my-interactive-app', '李四']);

      await generator.generate(templateDir, targetDir, {
        vars: {},
        interactive: true
      });

      const packageJson = JSON.parse(readFileUtf8(path.join(targetDir, 'package.json')));
      expect(packageJson.name).toBe('my-interactive-app');
      expect(packageJson.author).toBe('李四');
    }));

    test('部分变量通过 --var 提供，剩余通过交互', withTempDir(async (tempMgr) => {
      const templateDir = tempMgr.createTemplateDir({
        'package.json': '{"name": "{{project_name}}", "author": "{{author}}", "version": "{{version}}"}'
      });

      const targetDir = tempMgr.createDir('target-');

      ui.setVariableValues(['王五']);

      await generator.generate(templateDir, targetDir, {
        vars: {
          project_name: 'my-partial-app',
          version: '2.0.0'
        },
        interactive: true
      });

      const packageJson = JSON.parse(readFileUtf8(path.join(targetDir, 'package.json')));
      expect(packageJson.name).toBe('my-partial-app');
      expect(packageJson.version).toBe('2.0.0');
      expect(packageJson.author).toBe('王五');
    }));

    test('force: true - 直接覆盖已有文件', withTempDir(async (tempMgr) => {
      const templateDir = tempMgr.createTemplateDir({
        'test.txt': 'template content'
      });

      const targetDir = tempMgr.createTemplateDir({
        'test.txt': 'existing content'
      }, 'target-');

      const result = await generator.generate(templateDir, targetDir, {
        force: true,
        interactive: false
      });

      expect(readFileUtf8(path.join(targetDir, 'test.txt'))).toBe('template content');
      expect(result.copied).toHaveLength(1);
      expect(result.skipped).toHaveLength(0);
      expect(result.backedUp).toHaveLength(0);
    }));

    test('冲突处理 - 覆盖 overwrite', withTempDir(async (tempMgr) => {
      const templateDir = tempMgr.createTemplateDir({
        'test.txt': 'template content'
      });

      const targetDir = tempMgr.createTemplateDir({
        'test.txt': 'existing content'
      }, 'target-');

      ui.setConflictActions(['overwrite']);

      const result = await generator.generate(templateDir, targetDir, {
        interactive: false
      });

      expect(readFileUtf8(path.join(targetDir, 'test.txt'))).toBe('template content');
      expect(result.copied).toHaveLength(1);
      expect(result.backedUp).toHaveLength(0);
      expect(result.skipped).toHaveLength(0);
    }));

    test('冲突处理 - 跳过 skip', withTempDir(async (tempMgr) => {
      const templateDir = tempMgr.createTemplateDir({
        'test.txt': 'template content'
      });

      const targetDir = tempMgr.createTemplateDir({
        'test.txt': 'existing content'
      }, 'target-');

      ui.setConflictActions(['skip']);

      const result = await generator.generate(templateDir, targetDir, {
        interactive: false
      });

      expect(readFileUtf8(path.join(targetDir, 'test.txt'))).toBe('existing content');
      expect(result.copied).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
    }));

    test('冲突处理 - 备份后覆盖 backup', withTempDir(async (tempMgr) => {
      const templateDir = tempMgr.createTemplateDir({
        'test.txt': 'template content'
      });

      const targetDir = tempMgr.createTemplateDir({
        'test.txt': 'existing content'
      }, 'target-');

      ui.setConflictActions(['backup']);

      const result = await generator.generate(templateDir, targetDir, {
        interactive: false
      });

      expect(readFileUtf8(path.join(targetDir, 'test.txt'))).toBe('template content');
      expect(fileExists(path.join(targetDir, 'test.txt.bak'))).toBe(true);
      expect(readFileUtf8(path.join(targetDir, 'test.txt.bak'))).toBe('existing content');
      expect(result.backedUp).toHaveLength(1);
      expect(result.copied).toHaveLength(1);
    }));

    test('冲突处理 - 覆盖全部 overwrite-all', withTempDir(async (tempMgr) => {
      const templateDir = tempMgr.createTemplateDir({
        'a.txt': 'template A',
        'b.txt': 'template B',
        'c.txt': 'template C'
      });

      const targetDir = tempMgr.createTemplateDir({
        'a.txt': 'existing A',
        'b.txt': 'existing B',
        'c.txt': 'existing C'
      }, 'target-');

      ui.setConflictActions(['overwrite-all']);

      const result = await generator.generate(templateDir, targetDir, {
        interactive: false
      });

      expect(readFileUtf8(path.join(targetDir, 'a.txt'))).toBe('template A');
      expect(readFileUtf8(path.join(targetDir, 'b.txt'))).toBe('template B');
      expect(readFileUtf8(path.join(targetDir, 'c.txt'))).toBe('template C');
      expect(result.copied).toHaveLength(3);
      expect(ui.conflictCallCount).toBe(1);
    }));

    test('冲突处理 - 跳过全部 skip-all', withTempDir(async (tempMgr) => {
      const templateDir = tempMgr.createTemplateDir({
        'a.txt': 'template A',
        'b.txt': 'template B',
        'c.txt': 'template C'
      });

      const targetDir = tempMgr.createTemplateDir({
        'a.txt': 'existing A',
        'b.txt': 'existing B',
        'c.txt': 'existing C'
      }, 'target-');

      ui.setConflictActions(['skip-all']);

      const result = await generator.generate(templateDir, targetDir, {
        interactive: false
      });

      expect(readFileUtf8(path.join(targetDir, 'a.txt'))).toBe('existing A');
      expect(readFileUtf8(path.join(targetDir, 'b.txt'))).toBe('existing B');
      expect(readFileUtf8(path.join(targetDir, 'c.txt'))).toBe('existing C');
      expect(result.skipped).toHaveLength(3);
      expect(ui.conflictCallCount).toBe(1);
    }));

    test('混合场景 - 部分冲突、部分新文件', withTempDir(async (tempMgr) => {
      const templateDir = tempMgr.createTemplateDir({
        'existing.txt': 'template content',
        'new.txt': 'new content'
      });

      const targetDir = tempMgr.createTemplateDir({
        'existing.txt': 'old content'
      }, 'target-');

      ui.setConflictActions(['overwrite']);

      const result = await generator.generate(templateDir, targetDir, {
        interactive: false
      });

      expect(readFileUtf8(path.join(targetDir, 'existing.txt'))).toBe('template content');
      expect(readFileUtf8(path.join(targetDir, 'new.txt'))).toBe('new content');
      expect(result.copied).toHaveLength(2);
      expect(result.skipped).toHaveLength(0);
    }));

    test('备份文件自动编号', withTempDir(async (tempMgr) => {
      const templateDir = tempMgr.createTemplateDir({
        'test.txt': 'template v3'
      });

      const targetDir = tempMgr.createDir('target-');
      fs.writeFileSync(path.join(targetDir, 'test.txt'), 'original');
      fs.writeFileSync(path.join(targetDir, 'test.txt.bak'), 'backup1');
      fs.writeFileSync(path.join(targetDir, 'test.txt.bak1'), 'backup2');

      ui.setConflictActions(['backup']);

      await generator.generate(templateDir, targetDir, {
        interactive: false
      });

      expect(readFileUtf8(path.join(targetDir, 'test.txt'))).toBe('template v3');
      expect(readFileUtf8(path.join(targetDir, 'test.txt.bak'))).toBe('backup1');
      expect(readFileUtf8(path.join(targetDir, 'test.txt.bak1'))).toBe('backup2');
      expect(fileExists(path.join(targetDir, 'test.txt.bak2'))).toBe(true);
      expect(readFileUtf8(path.join(targetDir, 'test.txt.bak2'))).toBe('original');
    }));

    test('二进制文件跳过变量替换', withTempDir(async (tempMgr) => {
      const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      const templateDir = tempMgr.createTemplateDir({
        'text.txt': 'Hello {{name}}!',
        'image.png': pngHeader
      });

      const targetDir = tempMgr.createDir('target-');

      const result = await generator.generate(templateDir, targetDir, {
        vars: { name: 'World' },
        interactive: false
      });

      expect(readFileUtf8(path.join(targetDir, 'text.txt'))).toBe('Hello World!');
      const targetPng = fs.readFileSync(path.join(targetDir, 'image.png'));
      expect(targetPng.slice(0, 8)).toEqual(pngHeader);
      expect(result.modified).toHaveLength(1);
    }));
  });
});
