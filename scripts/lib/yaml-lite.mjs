function indentation(line) {
  const match = line.match(/^ */);
  return match ? match[0].length : 0;
}

function scalar(text) {
  const value = text.trim();
  if (value === "") return undefined;
  if (value === "null" || value === "~") return null;
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) return Number(value);
  if (value.startsWith('"')) return JSON.parse(value);
  if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1).replace(/''/g, "'");
  if ((value.startsWith("[") && value.endsWith("]")) || (value.startsWith("{") && value.endsWith("}"))) {
    try { return JSON.parse(value); } catch { /* use plain string below */ }
  }
  return value.replace(/\s+#.*$/, "");
}

function splitKey(line, lineNumber) {
  const index = line.indexOf(":");
  if (index <= 0) throw new Error(`YAML ${lineNumber}行目: key: value形式が必要です`);
  const keyText = line.slice(0, index).trim();
  const key = keyText.startsWith('"') ? JSON.parse(keyText) : keyText;
  return [key, line.slice(index + 1).trim()];
}

/** Minimal, fail-closed YAML subset for this repository's JSON-like front matter. */
export function parseYamlLite(source) {
  const trimmed = source.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);
  const lines = source.replace(/\r\n?/g, "\n").split("\n")
    .map((raw, index) => ({ raw, index: index + 1 }))
    .filter(({ raw }) => raw.trim() !== "" && !raw.trimStart().startsWith("#"));

  function parseBlock(start, level) {
    if (start >= lines.length) return { value: {}, next: start };
    const sequence = lines[start].raw.slice(level).startsWith("- ") || lines[start].raw.slice(level) === "-";
    const output = sequence ? [] : {};
    let cursor = start;
    while (cursor < lines.length) {
      const { raw, index: lineNumber } = lines[cursor];
      const currentIndent = indentation(raw);
      if (currentIndent < level) break;
      if (currentIndent > level) throw new Error(`YAML ${lineNumber}行目: 予期しないインデントです`);
      const text = raw.slice(level);

      if (sequence) {
        if (!(text === "-" || text.startsWith("- "))) break;
        const itemText = text.slice(1).trim();
        if (itemText === "") {
          const child = parseBlock(cursor + 1, indentation(lines[cursor + 1]?.raw ?? ""));
          output.push(child.value);
          cursor = child.next;
          continue;
        }
        if (itemText.includes(":")) {
          const [key, rest] = splitKey(itemText, lineNumber);
          const item = {};
          if (rest === "") {
            const childLevel = indentation(lines[cursor + 1]?.raw ?? "");
            const child = parseBlock(cursor + 1, childLevel);
            item[key] = child.value;
            cursor = child.next;
          } else {
            item[key] = scalar(rest);
            cursor += 1;
          }
          while (cursor < lines.length && indentation(lines[cursor].raw) > level) {
            const childLevel = indentation(lines[cursor].raw);
            const child = parseBlock(cursor, childLevel);
            if (Array.isArray(child.value)) throw new Error(`YAML ${lines[cursor].index}行目: 配列にプロパティ名が必要です`);
            Object.assign(item, child.value);
            cursor = child.next;
          }
          output.push(item);
          continue;
        }
        output.push(scalar(itemText));
        cursor += 1;
        continue;
      }

      if (text.startsWith("- ") || text === "-") break;
      const [key, rest] = splitKey(text, lineNumber);
      if (Object.prototype.hasOwnProperty.call(output, key)) throw new Error(`YAML ${lineNumber}行目: keyが重複しています: ${key}`);
      if (rest === "") {
        const next = lines[cursor + 1];
        if (!next || indentation(next.raw) <= level) {
          output[key] = null;
          cursor += 1;
        } else {
          const child = parseBlock(cursor + 1, indentation(next.raw));
          output[key] = child.value;
          cursor = child.next;
        }
      } else if (rest === "|" || rest === ">") {
        throw new Error(`YAML ${lineNumber}行目: front matterの複数行文字列には対応していません`);
      } else {
        output[key] = scalar(rest);
        cursor += 1;
      }
    }
    return { value: output, next: cursor };
  }

  if (lines.length === 0) return {};
  if (indentation(lines[0].raw) !== 0) throw new Error("YAMLの先頭にインデントは使用できません");
  const parsed = parseBlock(0, 0);
  if (parsed.next !== lines.length) throw new Error(`YAML ${lines[parsed.next].index}行目を解釈できません`);
  return parsed.value;
}
