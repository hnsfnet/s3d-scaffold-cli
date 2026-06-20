const { EventEmitter } = require('events');

class MockReadlineInterface extends EventEmitter {
  constructor(inputs = []) {
    super();
    this.inputs = [...inputs];
    this.questions = [];
    this.closed = false;
  }

  question(prompt, callback) {
    this.questions.push(prompt);
    const answer = this.inputs.shift() || '';
    if (callback) {
      callback(answer);
    }
  }

  close() {
    this.closed = true;
    this.emit('close');
  }

  setInputs(inputs) {
    this.inputs = [...inputs];
  }

  addInput(input) {
    this.inputs.push(input);
  }

  getQuestions() {
    return [...this.questions];
  }
}

function mockReadlineCreateInterface(inputs = []) {
  return function () {
    return new MockReadlineInterface(inputs);
  };
}

function mockProcessStdin() {
  const mock = new EventEmitter();
  let isTTYValue = true;

  Object.defineProperty(mock, 'isTTY', {
    get: () => isTTYValue,
    set: (val) => { isTTYValue = val; }
  });

  mock.setEncoding = jest.fn();
  mock.resume = jest.fn();
  mock.pause = jest.fn();

  return mock;
}

function mockProcessStdout() {
  const output = [];
  const mock = {
    write: jest.fn((text) => {
      output.push(text);
      return true;
    }),
    getOutput: () => output.join(''),
    clear: () => { output.length = 0; }
  };
  return mock;
}

module.exports = {
  MockReadlineInterface,
  mockReadlineCreateInterface,
  mockProcessStdin,
  mockProcessStdout
};
