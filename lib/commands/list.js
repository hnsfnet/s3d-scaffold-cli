const { formatDate } = require('../utils');

function createListCommand(dependencies) {
  const { templateManager } = dependencies;

  return {
    name: 'list',
    description: 'List all registered templates',
    usage: 'scaffold list',

    async execute() {
      const templates = templateManager.list();

      if (templates.length === 0) {
        console.log('No templates found.');
        console.log('');
        console.log('To register a template, run:');
        console.log('  scaffold init <template-name>');
        console.log('');
        console.log(`Templates are stored in: ${templateManager.getTemplatesFile()}`);
        return;
      }

      console.log(`Available templates (${templates.length}):`);
      console.log('');

      const maxNameLen = Math.max(...templates.map(t => t.name.length));
      const maxPathLen = Math.max(...templates.map(t => t.sourcePath.length));

      const nameHeader = 'NAME'.padEnd(maxNameLen + 2);
      const pathHeader = 'SOURCE PATH'.padEnd(maxPathLen + 2);
      const dateHeader = 'CREATED AT';

      console.log(`  ${nameHeader}${pathHeader}${dateHeader}`);
      console.log(`  ${'='.repeat(maxNameLen)}  ${'='.repeat(maxPathLen)}  ${'='.repeat(19)}`);

      for (const tpl of templates) {
        const paddedName = tpl.name.padEnd(maxNameLen + 2);
        const paddedPath = tpl.sourcePath.padEnd(maxPathLen + 2);
        const formattedDate = formatDate(tpl.createdAt);
        console.log(`  ${paddedName}${paddedPath}${formattedDate}`);
      }

      console.log('');
      console.log(`Templates stored in: ${templateManager.getTemplatesFile()}`);
    }
  };
}

module.exports = createListCommand;
