function parseArgs(args) {
  const options = {
    vars: {},
    force: false,
    positional: []
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--force') {
      options.force = true;
      i++;
    } else if (arg === '--var') {
      if (i + 1 >= args.length) {
        throw new Error('Missing value for --var. Expected format: --var key=value');
      }
      const value = args[i + 1];
      const eqIndex = value.indexOf('=');
      if (eqIndex === -1) {
        throw new Error(`Invalid --var format: "${value}". Expected format: key=value`);
      }
      const key = value.substring(0, eqIndex).trim();
      const val = value.substring(eqIndex + 1).trim();
      if (!key) {
        throw new Error(`Invalid --var format: "${value}". Variable name cannot be empty`);
      }
      options.vars[key] = val;
      i += 2;
    } else if (arg.startsWith('--var=')) {
      const value = arg.substring('--var='.length);
      const eqIndex = value.indexOf('=');
      if (eqIndex === -1) {
        throw new Error(`Invalid --var format: "${value}". Expected format: key=value`);
      }
      const key = value.substring(0, eqIndex).trim();
      const val = value.substring(eqIndex + 1).trim();
      if (!key) {
        throw new Error(`Invalid --var format: "${value}". Variable name cannot be empty`);
      }
      options.vars[key] = val;
      i++;
    } else if (!arg.startsWith('-')) {
      options.positional.push(arg);
      i++;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

module.exports = {
  parseArgs
};
