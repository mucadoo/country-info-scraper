import { Cheerio } from 'crawlee';
import { AnyNode } from 'domhandler';
import { Country } from '../../types/country.js';
import { ExtractionUtils } from '../../utils/extraction.js';

export interface ParserState {
  areaHeaderFound: boolean;
  areaFound: boolean;
  populationHeaderFound: boolean;
  populationFound: boolean;
  densityFound: boolean;
  languageFound: boolean;
  flagFound: boolean;
  currentSection: string | null;
}

export function processAreaAndPopulation(
  header: Cheerio<AnyNode>,
  data: Cheerio<AnyNode>,
  country: Partial<Country>,
  state: ParserState
): void {
  if (header.length === 0) return;
  const text = header.text().toLowerCase().trim();

  const isMainHeader = header.hasClass('infobox-header') || header.attr('colspan') === '2';

  if (isMainHeader) {
    if (text.includes('area')) {
      state.currentSection = 'area';
      state.areaHeaderFound = true;
    } else if (text.includes('population')) {
      state.currentSection = 'population';
      state.populationHeaderFound = true;
    } else if (text.includes('gdp') || text.includes('hdi') || text.includes('government') || text.includes('demographics') || text.includes('geography')) {
      state.currentSection = 'other';
    }
  } else if (state.currentSection === null) {
    if (text === 'area') {
      state.currentSection = 'area';
      state.areaHeaderFound = true;
    } else if (text === 'population') {
      state.currentSection = 'population';
      state.populationHeaderFound = true;
    }
  }

  if (data.length === 0) return;

  if (state.currentSection === 'area' && !state.areaFound) {
    if (text.includes('total') || text.includes('land') || text.includes('•') || text === 'area') {
      const area = ExtractionUtils.extractArea(ExtractionUtils.cleanText(data));
      if (area) {
        country.area_km2 = parseFloat(area);
        state.areaFound = true;
      }
    }
  }

  if (state.currentSection === 'population' && !state.populationFound) {
    if (text.includes('estimate') || text.includes('census') || text.includes('total') || text.includes('•') || text === 'population') {
      const pop = ExtractionUtils.extractPopulation(ExtractionUtils.cleanText(data));
      if (pop) {
        country.population = parseInt(pop, 10);
        state.populationFound = true;
      }
    }
  }

  if (!state.densityFound && state.currentSection === 'population' && text.includes('density')) {
    const density = ExtractionUtils.extractDensity(ExtractionUtils.cleanText(data));
    if (density) {
      country.density_km2 = parseFloat(density);
      state.densityFound = true;
    }
  }
}
