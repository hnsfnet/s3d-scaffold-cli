const fs = require('fs');
const path = require('path');
const {
  replaceVariablesInContent,
  scanTemplateVariables,
  replaceVariablesInFile,
  replaceVariablesInDir
} = require('../lib/template');
const {
  createTempDirManager,
  readFileUtf8,
  fileExists,
  listFiles,
  withTempDir
} = require('./helpers');

describe('Template Variables', () => {
  describe('replaceVariablesInContent', () => {
    test('单个变量替换', () => {
      const content = 'Hello {{name}}!';
      const variables = { name: 'World' };
      const result = replaceVariablesInContent(content, variables);
      expect(result).toBe('Hello World!');
    });

    test('多个变量替换', () => {
      const content = '{{greeting}} {{name}}, you are {{age}} years old.';
      const variables = {
        greeting: 'Hello',
        name: 'Alice',
        age: '25'
      };
      const result = replaceVariablesInContent(content, variables);
      expect(result).toBe('Hello Alice, you are 25 years old.');
    });

    test('变量值包含特殊字符', () => {
      const content = 'Hello {{name}}!';
      const variables = { name: '张三$123!@#.' };
      const result = replaceVariablesInContent(content, variables);
      expect(result).toBe('Hello 张三$123!@#.!');
    });

    test('变量值包含 {{ 和 }} - 不会二次替换', () => {
      const content = 'Hello {{name}}!';
      const variables = { name: '{{张三}}' };
      const result = replaceVariablesInContent(content, variables);
      expect(result).toBe('Hello {{张三}}!');
    });

    test('变量值包含 {{ 和 }} 且有多个变量', () => {
      const content = '{{greeting}} {{name}}!';
      const variables = {
        greeting: '{{Hello}}',
        name: '{{World}}'
      };
      const result = replaceVariablesInContent(content, variables);
      expect(result).toBe('{{Hello}} {{World}}!');
    });

    test('模板中没有变量 - 返回原内容', () => {
      const content = 'Hello World!';
      const variables = { name: 'Test' };
      const result = replaceVariablesInContent(content, variables);
      expect(result).toBe('Hello World!');
    });

    test('变量不存在 - 保持占位符不变', () => {
      const content = 'Hello {{name}}!';
      const variables = {};
      const result = replaceVariablesInContent(content, variables);
      expect(result).toBe('Hello {{name}}!');
    });

    test('部分变量不存在 - 只替换存在的变量', () => {
      const content = '{{a}} {{b}} {{c}}';
      const variables = { a: '1', c: '3' };
      const result = replaceVariablesInContent(content, variables);
      expect(result).toBe('1 {{b}} 3');
    });

    test('带提示文字的变量替换', () => {
      const content = 'Name: {{name:请输入姓名}}';
      const variables = { name: '张三' };
      const result = replaceVariablesInContent(content, variables);
      expect(result).toBe('Name: 张三');
    });

    test('变量前后有空格', () => {
      const content = 'Hello {{  name  }}!';
      const variables = { name: 'World' };
      const result = replaceVariablesInContent(content, variables);
      expect(result).toBe('Hello World!');
    });

    test('JSON 内容中的变量替换', () => {
      const content = JSON.stringify({
        name: '{{project_name}}',
        version: '{{version}}',
        author: '{{author}}'
      }, null, 2);
      const variables = {
        project_name: 'my-app',
        version: '1.0.0',
        author: '张三'
      };
      const result = replaceVariablesInContent(content, variables);
      const parsed = JSON.parse(result);
      expect(parsed.name).toBe('my-app');
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.author).toBe('张三');
    });

    test('同一变量出现多次', () => {
      const content = '{{name}} {{name}} {{name}}';
      const variables = { name: 'Test' };
      const result = replaceVariablesInContent(content, variables);
      expect(result).toBe('Test Test Test');
    });

    test('变量值包含正则特殊字符', () => {
      const content = 'Value: {{value}}';
      const variables = { value: '.*+?^${}()|[]\\' };
      const result = replaceVariablesInContent(content, variables);
      expect(result).toBe('Value: .*+?^${}()|[]\\');
    });

    test('空内容', () => {
      const content = '';
      const variables = { name: 'Test' };
      const result = replaceVariablesInContent(content, variables);
      expect(result).toBe('');
    });
  });

  describe('scanTemplateVariables', () => {
    test('扫描单个变量', withTempDir(async (tempMgr) => {
      const templateDir = tempMgr.createTemplateDir({
        'package.json': '{"name": "{{project_name}}"}'
      });

      const variables = scanTemplateVariables(templateDir);
      expect(variables).toHaveLength(1);
      expect(variables[0].name).toBe('project_name');
    }));

    test('扫描带提示文字的变量', withTempDir(async (tempMgr) => {
      const templateDir = tempMgr.createTemplateDir({
        'package.json': '{"name": "{{project_name:项目名称}}"}'
      });

      const variables = scanTemplateVariables(templateDir);
      expect(variables).toHaveLength(1);
      expect(variables[0].name).toBe('project_name');
      expect(variables[0].hint).toBe('项目名称');
    }));

    test('扫描多个文件中的变量', withTempDir(async (tempMgr) => {
      const templateDir = tempMgr.createTemplateDir({
        'package.json': '{"name": "{{project_name}}", "author": "{{author}}"}',
        'README.md': '# {{project_name}}\n\nBy {{author}}'
      });

      const variables = scanTemplateVariables(templateDir);
      const varNames = variables.map(v => v.name).sort();
      expect(varNames).toEqual(['author', 'project_name']);

      const projectVar = variables.find(v => v.name === 'project_name');
      expect(projectVar.files).toHaveLength(2);
    }));

    test('跳过 node_modules 目录', withTempDir(async (tempMgr) => {
      const templateDir = tempMgr.createTemplateDir({
        'package.json': '{"name": "{{project_name}}"}',
        'node_modules/some-pkg/index.js': 'const x = "{{should_skip}}"'
      });

      const variables = scanTemplateVariables(templateDir);
      const varNames = variables.map(v => v.name);
      expect(varNames).not.toContain('should_skip');
      expect(varNames).toContain('project_name');
    }));

    test('跳过二进制文件', withTempDir(async (tempMgr) => {
      const templateDir = tempMgr.createTemplateDir({
        'package.json': '{"name": "{{project_name}}"}',
        'image.png': Buffer.from([0x89, 0x50, 0x4E, 0x47])
      });

      const variables = scanTemplateVariables(templateDir);
      const varNames = variables.map(v => v.name);
      expect(varNames).toContain('project_name');
    }));

    test('空模板没有变量', withTempDir(async (tempMgr) => {
      const templateDir = tempMgr.createTemplateDir({
        'README.md': '# No variables here',
        'index.js': 'console.log("hello");'
      });

      const variables = scanTemplateVariables(templateDir);
      expect(variables).toHaveLength(0);
    }));
  });

  describe('replaceVariablesInFile', () => {
    test('替换文件中的变量', withTempDir(async (tempMgr) => {
      const tempDir = tempMgr.createDir();
      const filePath = path.join(tempDir, 'test.txt');
      fs.writeFileSync(filePath, 'Hello {{name}}!', 'utf-8');

      const variables = { name: 'World' };
      const modified = replaceVariablesInFile(filePath, variables);

      expect(modified).toBe(true);
      expect(readFileUtf8(filePath)).toBe('Hello World!');
    }));

    test('文件没有变量 - 返回 false', withTempDir(async (tempMgr) => {
      const tempDir = tempMgr.createDir();
      const filePath = path.join(tempDir, 'test.txt');
      fs.writeFileSync(filePath, 'Hello World!', 'utf-8');

      const variables = { name: 'Test' };
      const modified = replaceVariablesInFile(filePath, variables);

      expect(modified).toBe(false);
      expect(readFileUtf8(filePath)).toBe('Hello World!');
    }));

    test('变量值包含特殊字符', withTempDir(async (tempMgr) => {
      const tempDir = tempMgr.createDir();
      const filePath = path.join(tempDir, 'test.txt');
      fs.writeFileSync(filePath, 'Hello {{name}}!', 'utf-8');

      const variables = { name: '{{张三}}' };
      const modified = replaceVariablesInFile(filePath, variables);

      expect(modified).toBe(true);
      expect(readFileUtf8(filePath)).toBe('Hello {{张三}}!');
    }));
  });

  describe('replaceVariablesInDir', () => {
    test('替换目录中所有文件的变量', withTempDir(async (tempMgr) => {
      const templateDir = tempMgr.createTemplateDir({
        'package.json': '{"name": "{{project_name}}", "author": "{{author}}"}',
        'README.md': '# {{project_name}}\n\nBy {{author}}',
        'src/index.js': 'console.log("{{project_name}} is running");'
      });

      const variables = {
        project_name: 'my-app',
        author: '张三'
      };

      const modified = replaceVariablesInDir(templateDir, variables);

      expect(modified).toHaveLength(3);
      expect(readFileUtf8(path.join(templateDir, 'package.json'))).toContain('"name": "my-app"');
      expect(readFileUtf8(path.join(templateDir, 'README.md'))).toContain('# my-app');
      expect(readFileUtf8(path.join(templateDir, 'src/index.js'))).toContain('console.log("my-app is running");');
    }));

    test('跳过 node_modules 目录', withTempDir(async (tempMgr) => {
      const templateDir = tempMgr.createTemplateDir({
        'package.json': '{"name": "{{project_name}}"}',
        'node_modules/pkg/index.js': 'const x = "{{project_name}}"'
      });

      const variables = { project_name: 'my-app' };
      const modified = replaceVariablesInDir(templateDir, variables);

      expect(readFileUtf8(path.join(templateDir, 'package.json'))).toContain('"name": "my-app"');
      expect(readFileUtf8(path.join(templateDir, 'node_modules/pkg/index.js'))).toContain('{{project_name}}');
    }));

    test('没有变量时返回空数组', withTempDir(async (tempMgr) => {
      const templateDir = tempMgr.createTemplateDir({
        'README.md': '# No variables',
        'index.js': 'console.log("hello");'
      });

      const variables = { project_name: 'my-app' };
      const modified = replaceVariablesInDir(templateDir, variables);

      expect(modified).toHaveLength(0);
    }));
  });
});
