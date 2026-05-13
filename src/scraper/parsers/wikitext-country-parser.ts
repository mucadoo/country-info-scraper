import { Country, getEmptyLocalizedField } from '../../types/country.js';
import { parseInfoboxFromWikitext } from './wikitext-infobox.js';
import { parseDescriptionFromWikitext } from './wikitext-description.js';

export function parseCountryFromWikitext(wikitext: string, lang: string = 'en'): Partial<Country> {
  const infoboxData = parseInfoboxFromWikitext(wikitext, lang);
  console.log(`[DEBUG] Infobox data extracted: ${JSON.stringify(Object.keys(infoboxData))}`);
  
  const description = parseDescriptionFromWikitext(wikitext, lang);

  const country: Partial<Country> = {
    ...infoboxData,
  };

  const localizedDescription = getEmptyLocalizedField();
  if (description) {
    localizedDescription[lang as keyof typeof localizedDescription] = description;
  }
  country.description = localizedDescription;

  console.log(`[DEBUG] Country object after parsing: ${JSON.stringify(Object.keys(country))}`);
  return country;
}
