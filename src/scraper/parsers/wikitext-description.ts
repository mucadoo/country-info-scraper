/* eslint-disable @typescript-eslint/no-unused-vars */
export function parseDescriptionFromWikitext(wikitext: string, _lang: string): string {
  // 1. Remove the first Infobox block
  let text = removeFirstInfobox(wikitext);

  // 2. Remove other block templates at start of line
  text = text.replace(/^\{\{.*\}\}$/gm, '');

  // 3. Find first non-empty paragraph
  const lines = text.split('\n');
  let paragraph = '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !/^==|[{[!|*]/.test(trimmed)) {
      paragraph = trimmed;
      break;
    }
  }

  if (!paragraph) return '';

  // 4. Strip Wikimarkup
  // Wikilinks: [[Article|Text]] -> Text; [[Article]] -> Article
  paragraph = paragraph.replace(/\[\[([^\]|]+\|)?([^\]|]+)\]\]/g, '$2');
  // Bold/italic markers
  paragraph = paragraph.replace(/'''|''/g, '');
  // HTML tags
  paragraph = paragraph.replace(/<[^>]+>.*?<\/[^>]+>|<[^>]+>/g, '');
  // Citation templates {{cite...}}
  paragraph = paragraph.replace(/\{\{(cite|sfn)[^}]*\}\}/gi, '');

  // 5. Iteratively remove innermost (...)
  paragraph = removeNestedParentheses(paragraph);

  // 6. Normalize and trim
  return paragraph.replace(/\s+/g, ' ').trim();
}

function removeFirstInfobox(wikitext: string): string {
  const startIdx = wikitext.toLowerCase().indexOf('{{infobox');
  if (startIdx === -1) return wikitext;

  let i = startIdx;
  while (i < wikitext.length && wikitext[i] !== '{') i++;
  
  let braceCount = 0;
  let j = i;
  while (j < wikitext.length) {
    if (wikitext.substr(j, 2) === '{{') {
      braceCount += 2;
      j += 2;
    } else if (wikitext.substr(j, 2) === '}}') {
      braceCount -= 2;
      j += 2;
      if (braceCount === 0) break;
    } else {
      j++;
    }
  }
  
  return wikitext.substring(0, i) + wikitext.substring(j);
}

function removeNestedParentheses(text: string): string {
  let prev = text;
  while (true) {
    const next = prev.replace(/\([^()]*\)/g, '');
    if (next === prev) break;
    prev = next;
  }
  return prev;
}
