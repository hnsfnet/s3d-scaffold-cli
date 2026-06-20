const { getAllTemplates, TEMPLATES_FILE } = require('../storage');
const { formatDate } = require('../utils');

function listCommand() {
  const templates = getAllTemplates();
  const templateNames = Object.keys(templates);

  if (templateNames.length === 0) {
    console.log('No templates found.');
    console.log('');
    console.log('To register a template, run:');
    console.log('  scaffold init <template-name>');
    console.log('');
    console.log(`Templates are stored in: ${TEMPLATES_FILE}`);
    return;
  }

  console.log(`Available templates (${templateNames.length}):`);
  console.log('');

  const maxNameLen = Math.max(...templateNames.map(n => n.length));
  const maxPathLen = Math.max(...templateNames.map(n => templates[n].sourcePath.length));

  const nameHeader = 'NAME'.padEnd(maxNameLen + 2);
  const pathHeader = 'SOURCE PATH'.padEnd(maxPathLen + 2);
  const dateHeader = 'CREATED AT';

  console.log(`  ${nameHeader}${pathHeader}${dateHeader}`);
  console.log(`  ${'='.repeat(maxNameLen)}  ${'='.repeat(maxPathLen)}  ${'='.repeat(19)}`);

  for (const name of templateNames.sort()) {
    const tpl = templates[name];
    const paddedName = name.padEnd(maxNameLen + 2);
    const paddedPath = tpl.sourcePath.padEnd(maxPathLen + 2);
    const formattedDate = formatDate(tpl.createdAt);
    console.log(`  ${paddedName}${paddedPath}${formattedDate}`);
  }

  console.log('');
  console.log(`Templates stored in: ${TEMPLATES_FILE}`);
}

module.exports = listCommand;
