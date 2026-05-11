import { Cheerio, CheerioAPI } from 'crawlee';
import { AnyNode, isTag } from 'domhandler';
import { Country } from '../../types/country.js';
import { ExtractionUtils } from '../../utils/extraction.js';
import { ParserState } from './area-population.js';

export function processImages($: CheerioAPI, row: Cheerio<AnyNode>, country: Partial<Country>, state: ParserState): void {
  if (state.flagFound) return;
  const imageCells = row.find('td.infobox-image, td.maptable');
  imageCells.each((_: number, cell: AnyNode) => {
    if (!isTag(cell)) return true;
    const $cell = $(cell);
    $cell.find('img').each((__: number, img: AnyNode) => {
      if (!isTag(img)) return true;
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
      return true;
    });
    if (state.flagFound) return false;
    return true;
  });
}
