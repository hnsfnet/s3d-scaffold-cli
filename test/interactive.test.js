const readline = require('readline');
const { EventEmitter } = require('events');
const { InteractiveUI, interactiveUI } = require('../lib/interactive');

let mockRlInstance;
let mockInputs = [];
let questionCalls = [];
let sigintHandler = null;

jest.mock('readline', () => ({
  createInterface: jest.fn(() => {
    mockRlInstance = {
      question: jest.fn((prompt, callback) => {
        questionCalls.push(prompt);
        const answer = mockInputs.shift() || '';
        if (callback) {
          callback(answer);
        }
      }),
      close: jest.fn(),
      on: jest.fn((event, handler) => {
        if (event === 'SIGINT') {
          sigintHandler = handler;
        }
      }),
      emit: jest.fn()
    };
    return mockRlInstance;
  })
}));

describe('InteractiveUI', () => {
  let ui;
  let originalProcessOn;
  let originalProcessExit;
  let exitCode;
  let processOnCalls;

  beforeEach(() => {
    mockInputs = [];
    questionCalls = [];
    sigintHandler = null;
    exitCode = null;
    processOnCalls = [];

    ui = new InteractiveUI();

    originalProcessOn = process.on;
    originalProcessExit = process.exit;

    process.on = jest.fn((event, handler) => {
      processOnCalls.push({ event, handler });
    });

    process.exit = jest.fn((code) => {
      exitCode = code;
      throw new Error(`process.exit(${code})`);
    });

    readline.createInterface.mockClear();
  });

  afterEach(() => {
    process.on = originalProcessOn;
    process.exit = originalProcessExit;
    jest.clearAllMocks();
  });

  function setInputs(inputs) {
    mockInputs = [...inputs];
  }

  describe('promptForVariables', () => {
    test('单个变量输入', async () => {
      const variables = [
        { name: 'project_name', hint: '项目名称' }
      ];

      setInputs(['my-app', 'y']);

      const result = await ui.promptForVariables(variables, {});

      expect(result.project_name).toBe('my-app');
      expect(questionCalls.length).toBeGreaterThan(0);
      expect(questionCalls.some(q => q.includes('project_name'))).toBe(true);
    });

    test('多个变量输入', async () => {
      const variables = [
        { name: 'project_name', hint: '项目名称' },
        { name: 'author', hint: '作者' },
        { name: 'version', hint: '版本号' }
      ];

      setInputs(['my-app', '张三', '1.0.0', 'y']);

      const result = await ui.promptForVariables(variables, {});

      expect(result.project_name).toBe('my-app');
      expect(result.author).toBe('张三');
      expect(result.version).toBe('1.0.0');
    });

    test('部分变量已提供，只询问缺失的', async () => {
      const variables = [
        { name: 'project_name', hint: '项目名称' },
        { name: 'author', hint: '作者' }
      ];

      setInputs(['李四', 'y']);

      const result = await ui.promptForVariables(variables, {
        project_name: 'pre-filled-app'
      });

      expect(result.project_name).toBe('pre-filled-app');
      expect(result.author).toBe('李四');
    });

    test('变量使用默认值', async () => {
      const variables = [
        { name: 'version', hint: '版本号' }
      ];

      setInputs(['', 'y']);

      const result = await ui.promptForVariables(variables, {});

      expect(result.version).toBe('1.0.0');
    });

    test('用户确认前重新输入', async () => {
      const variables = [
        { name: 'project_name', hint: '项目名称' }
      ];

      setInputs(['first-try', 'n', 'second-try', 'y']);

      const result = await ui.promptForVariables(variables, {});

      expect(result.project_name).toBe('second-try');
    });

    test('用户确认时直接回车（默认 N），重新输入', async () => {
      const variables = [
        { name: 'project_name', hint: '项目名称' }
      ];

      setInputs(['first-try', '', 'second-try', 'y']);

      const result = await ui.promptForVariables(variables, {});

      expect(result.project_name).toBe('second-try');
    });

    test('空值输入提示重新输入', async () => {
      const variables = [
        { name: 'project_name', hint: '项目名称' }
      ];

      setInputs(['', 'my-app', 'y']);

      const result = await ui.promptForVariables(variables, {});

      expect(result.project_name).toBe('my-app');
    });

    test('显示变量提示文字', async () => {
      const variables = [
        { name: 'project_name', hint: '项目名称' }
      ];

      setInputs(['test-app', 'y']);

      await ui.promptForVariables(variables, {});

      expect(questionCalls.some(q => q.includes('项目名称'))).toBe(true);
    });

    test('所有变量已提供时跳过输入，直接确认', async () => {
      const variables = [
        { name: 'project_name', hint: '项目名称' }
      ];

      setInputs(['y']);

      const result = await ui.promptForVariables(variables, {
        project_name: 'all-provided'
      });

      expect(result.project_name).toBe('all-provided');
    });

    test('确认时输入 yes（不区分大小写）', async () => {
      const variables = [
        { name: 'project_name', hint: '项目名称' }
      ];

      setInputs(['my-app', 'YES']);

      const result = await ui.promptForVariables(variables, {});

      expect(result.project_name).toBe('my-app');
    });

    test('确认时输入无效选项，提示重新输入', async () => {
      const variables = [
        { name: 'project_name', hint: '项目名称' }
      ];

      setInputs(['my-app', 'maybe', 'y']);

      const result = await ui.promptForVariables(variables, {});

      expect(result.project_name).toBe('my-app');
    });
  });

  describe('promptForFileConflict', () => {
    test('选择覆盖 overwrite', async () => {
      setInputs(['o']);

      const result = await ui.promptForFileConflict('/path/to/file.txt');

      expect(result).toBe('overwrite');
    });

    test('选择跳过 skip', async () => {
      setInputs(['s']);

      const result = await ui.promptForFileConflict('/path/to/file.txt');

      expect(result).toBe('skip');
    });

    test('选择备份 backup', async () => {
      setInputs(['b']);

      const result = await ui.promptForFileConflict('/path/to/file.txt');

      expect(result).toBe('backup');
    });

    test('选择覆盖全部 overwrite-all', async () => {
      setInputs(['O']);

      const result = await ui.promptForFileConflict('/path/to/file.txt');

      expect(result).toBe('overwrite-all');
    });

    test('选择跳过全部 skip-all', async () => {
      setInputs(['S']);

      const result = await ui.promptForFileConflict('/path/to/file.txt');

      expect(result).toBe('skip-all');
    });

    test('输入无效选项提示重试', async () => {
      setInputs(['x', 'o']);

      const result = await ui.promptForFileConflict('/path/to/file.txt');

      expect(result).toBe('overwrite');
    });

    test('force: true 直接返回 overwrite，不提示', async () => {
      const result = await ui.promptForFileConflict('/path/to/file.txt', true);

      expect(result).toBe('overwrite');
      expect(readline.createInterface).not.toHaveBeenCalled();
    });

    test('默认选项是 s (skip)', async () => {
      setInputs(['']);

      const result = await ui.promptForFileConflict('/path/to/file.txt');

      expect(result).toBe('skip');
    });

    test('显示冲突文件路径', async () => {
      const testPath = '/some/path/conflict.txt';
      setInputs(['s']);

      await ui.promptForFileConflict(testPath);

      expect(questionCalls.length).toBeGreaterThan(0);
    });
  });

  describe('confirm', () => {
    test('输入 y 返回 true', async () => {
      setInputs(['y']);

      const result = await ui.confirm('Are you sure?', 'N');

      expect(result).toBe(true);
    });

    test('输入 n 返回 false', async () => {
      setInputs(['n']);

      const result = await ui.confirm('Are you sure?', 'N');

      expect(result).toBe(false);
    });

    test('直接回车使用默认值 false', async () => {
      setInputs(['']);

      const result = await ui.confirm('Are you sure?', 'N');

      expect(result).toBe(false);
    });

    test('输入 yes 返回 true', async () => {
      setInputs(['YES']);

      const result = await ui.confirm('Are you sure?', 'N');

      expect(result).toBe(true);
    });

    test('输入无效选项提示重试', async () => {
      setInputs(['maybe', 'y']);

      const result = await ui.confirm('Are you sure?', 'N');

      expect(result).toBe(true);
    });
  });

  describe('SIGINT 处理', () => {
    test('Ctrl+C 触发时友好退出', async () => {
      const variables = [
        { name: 'project_name', hint: '项目名称' }
      ];

      setInputs(['my-app']);

      const promptPromise = ui.promptForVariables(variables, {});

      await new Promise(resolve => setImmediate(resolve));

      const sigintListeners = processOnCalls.filter(c => c.event === 'SIGINT');
      expect(sigintListeners.length).toBeGreaterThan(0);

      const sigintHandler = sigintListeners[0].handler;

      let caughtError = null;
      try {
        sigintHandler();
      } catch (error) {
        caughtError = error;
      }

      expect(caughtError).not.toBeNull();
      expect(exitCode).toBe(130);
      expect(mockRlInstance.close).toHaveBeenCalled();
    });
  });

  describe('readline 生命周期管理', () => {
    test('多次调用复用同一个 readline 接口', async () => {
      const variables = [
        { name: 'project_name', hint: '项目名称' }
      ];

      setInputs(['my-app', 'y']);
      await ui.promptForVariables(variables, {});

      const firstInstance = mockRlInstance;

      setInputs(['s']);
      await ui.promptForFileConflict('/path/to/file.txt');

      const secondInstance = mockRlInstance;

      expect(firstInstance).toBe(secondInstance);
    });

    test('每次调用后 readline 接口被关闭', async () => {
      const variables = [
        { name: 'project_name', hint: '项目名称' }
      ];

      setInputs(['my-app', 'y']);
      await ui.promptForVariables(variables, {});

      expect(mockRlInstance.close).toHaveBeenCalled();
    });
  });

  describe('导出的便捷函数', () => {
    test('promptForVariables 便捷函数可用', async () => {
      const { promptForVariables } = require('../lib/interactive');
      expect(typeof promptForVariables).toBe('function');
    });

    test('promptForFileConflict 便捷函数可用', async () => {
      const { promptForFileConflict } = require('../lib/interactive');
      expect(typeof promptForFileConflict).toBe('function');
    });
  });
});
