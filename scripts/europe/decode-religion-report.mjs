/** Restore the parent's dictionary-encoded source excerpts without changing missing symbols. */
import { readFile, writeFile } from 'node:fs/promises';

export function decodeReligionTable(table) {
  if (!Array.isArray(table?.columns) || !Array.isArray(table?.rows) || !table.dictionary_columns || typeof table.dictionary_columns !== 'object') throw new TypeError('Invalid religion excerpt table');
  const { columns, dictionary_columns: dictionaries } = table;
  return table.rows.map((row, rowIndex) => {
    if (!Array.isArray(row) || row.length !== columns.length) throw new TypeError(`Invalid religion row ${rowIndex}`);
    return row.map((value, index) => {
      const dictionary = dictionaries[columns[index]];
      if (!dictionary) return value;
      if (!Array.isArray(dictionary) || !Number.isInteger(value) || value < 0 || value >= dictionary.length) throw new TypeError(`Invalid dictionary index ${rowIndex}:${columns[index]}`);
      return dictionary[value];
    });
  });
}

function csvCell(value) {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? '"' + text.replaceAll('"', '""') + '"' : text;
}

export function religionTableCsv(table) {
  return [table.columns, ...decodeReligionTable(table)].map(row => row.map(csvCell).join(',')).join('\n') + '\n';
}

if (process.argv[1]?.endsWith('decode-religion-report.mjs') && process.argv[2] && process.argv[3]) {
  const document = JSON.parse(await readFile(process.argv[2], 'utf8'));
  for (const [filename, table] of Object.entries(document)) {
    if (!filename.endsWith('.csv')) continue;
    const safe = filename.replaceAll('/', '__');
    await writeFile(`${process.argv[3]}/${safe}`, religionTableCsv(table));
    console.log(`${safe}: ${table.rows.length} rows`);
  }
}
