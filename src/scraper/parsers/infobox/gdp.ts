import { Cheerio, CheerioAPI } from 'crawlee';
import { AnyNode } from 'domhandler';
import { Country } from '../../../types/country.js';

function parseNumericValue(text: string): number | null {
  if (!text) return null;
  let cleaned = text.replace(/[^\d.\w\s]/g, '').trim().toLowerCase();
  let multiplier = 1;

  if (cleaned.includes('trillion')) {
    multiplier = 1_000_000_000_000;
    cleaned = cleaned.replace('trillion', '').trim();
  } else if (cleaned.includes('billion')) {
    multiplier = 1_000_000_000;
    cleaned = cleaned.replace('billion', '').trim();
  } else if (cleaned.includes('million')) {
    multiplier = 1_000_000;
    cleaned = cleaned.replace('million', '').trim();
  }

  const parts = cleaned.split(/\s+/);
  for (const part of parts) {
    const val = parseFloat(part);
    if (!isNaN(val)) {
      return Math.round(val * multiplier);
    }
  }
  return null;
}

export function parseGDP($: CheerioAPI, row: Cheerio<AnyNode>, country: Partial<Country>): void {
  let curr = row.next();
  for (let i = 0; i < 5 && curr.length > 0; i++) {
    const rowText = curr.text().toLowerCase();
    if (rowText.includes('hdi') || rowText.includes('gini') || rowText.includes('currency')) break;

    const labelCell = curr.find('th, td').first();
    const valueCell = curr.find('td').last();

    if (labelCell.length > 0 && valueCell.length > 0) {
      const labelText = labelCell.text().toLowerCase();
      if (labelText.includes('total') || /.*\d{4}.*/.test(labelText)) {
        const dClone = valueCell.clone();
        dClone.find('sup, .reference').remove();
        let gdpValue = dClone.text().replace(/\s*\([^)]*\)\s*/g, '').trim();
        gdpValue = gdpValue.replace(/(\d+),(\d{3})\s*(million|billion|trillion)/g, '$1.$2 $3');
        const parsed = parseNumericValue(gdpValue);
        if (parsed !== null) {
          country.gdp = parsed;
          break;
        }
      }
    }
    curr = curr.next();
  }
}
