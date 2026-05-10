import { Cheerio, AnyNode } from 'crawlee';
import { Country } from '../../types/country.js';
import { ExtractionUtils } from '../../utils/extraction.js';

export function processImages($: any, row: Cheerio<AnyNode>, country: Partial<Country>, state: any): void {
  if (state.flagFound) return;
  const imageCells = row.find('td.infobox-image, td.maptable');
  imageCells.each((_, cell) => {
    const $cell = $(cell);
    $cell.find('img').each((_, img) => {
      const $img = $(img);
      const url = 'https:' + ($img.attr('src') || '');
      const alt = ($img.attr('alt') || '').toLowerCase();
      
      const descText = $cell.text().toLowerCase();
      if (descText.includes('flag') || alt.includes('flag') || url.toLowerCase().includes('flag')) {
        if (!alt.includes('arms') && !url.toLowerCase().includes('arms') && !url.toLowerCase().includes('seal')) {
          country.flagUrl = ExtractionUtils.normalizeFlagUrl(url);
          state.flagFound = true;
          return false; // break
        }
      }
    });
    if (state.flagFound) return false;
  });
}
