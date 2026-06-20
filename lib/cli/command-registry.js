const { parseArgs } = require('../args');

class CommandRegistry {
  constructor(options = {}) {
    this.commands = new Map();
    this.onError = options.onError || null;
    this.onHelp = options.onHelp || null;
    this.onVersion = options.onVersion || null;
    this.version = options.version || '0.0.0';
    this.helpText = options.helpText || '';
  }

  register(name, command) {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error('Command name must be a non-empty string');
    }
    if (typeof command.execute !== 'function') {
      throw new Error('Command must have an execute() function');
    }
    this.commands.set(name, {
      name,
      ...command
    });
    return this;
  }

  unregister(name) {
    return this.commands.delete(name);
  }

  get(name) {
    return this.commands.get(name) || null;
  }

  list() {
    return Array.from(this.commands.values());
  }

  parseArgs(args) {
    if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
      return { type: 'help' };
    }
    if (args.includes('-v') || args.includes('--version')) {
      return { type: 'version' };
    }

    const commandName = args[0];
    const commandArgs = args.slice(1);

    return {
      type: 'command',
      commandName,
      commandArgs
    };
  }

  async run(args) {
    const parsed = this.parseArgs(args);

    if (parsed.type === 'help') {
      if (this.onHelp) {
        this.onHelp();
      }
      return;
    }

    if (parsed.type === 'version') {
      if (this.onVersion) {
        this.onVersion();
      }
      return;
    }

    const command = this.get(parsed.commandName);
    if (!command) {
      console.log(`Unknown command: ${parsed.commandName}`);
      if (this.onHelp) {
        this.onHelp();
      }
      process.exit(1);
    }

    try {
      await command.execute(parsed.commandArgs, {
        parseArgs,
        registry: this
      });
    } catch (error) {
      if (this.onError) {
        this.onError(error);
      } else {
        console.error('Error:', error.message);
        process.exit(1);
      }
    }
  }

  getHelpText() {
    return this.helpText;
  }

  getVersion() {
    return this.version;
  }
}

module.exports = CommandRegistry;
