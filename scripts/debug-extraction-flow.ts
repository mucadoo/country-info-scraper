import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import { CountryParser } from '../src/parsers/country-parser.js';
import { DescriptionParser } from '../src/parsers/description.js';
import { WikipediaAPI } from '../src/utils/wikipedia-api.js';
import { mergeCountryData } from '../src/utils/merger.js';
import { getEmptyCountry, getEmptyLocalizedField, Country } from '../src/types/country.js';

const SNAPSHOT_BASE = 'tests/snapshots';
WikipediaAPI.useSnapshots(path.join(SNAPSHOT_BASE, 'translations.json'));

type LocalizedArrayFieldKey = 'capital' | 'largestCity' | 'officialLanguage' | 'demonym' | 'currency' | 'government' | 'timeZone';

async function debugFlow(countryName: string) {
  let mergedResult: Country = getEmptyCountry();

  console.log(`\n--- Debugging Flow for: ${countryName} ---`);

  // 1. English Pass
  const enHtmlPath = path.join(SNAPSHOT_BASE, 'en', 'sovereign_states', `${countryName.toLowerCase().replace(/ /g, '_')}.html`);
  if (!fs.existsSync(enHtmlPath)) {
      console.error(`English snapshot not found: ${enHtmlPath}`);
      return;
  }
  const enHtml = fs.readFileSync(enHtmlPath, 'utf-8');
  const $en = cheerio.load(enHtml);
  const countryData = CountryParser.parseCountry($en as unknown as Parameters<typeof CountryParser.parseCountry>[0], {}, 'en');
  
  const translations = await WikipediaAPI.fetchTranslations(
    [
        ...(countryData.capital?.map(i => i.articleId) || []),
        ...(countryData.largestCity?.map(i => i.articleId) || []),
        ...(countryData.officialLanguage?.map(i => i.articleId) || []),
        ...(countryData.currency?.map(i => i.articleId) || []),
        ...(countryData.demonym?.map(i => i.articleId) || []),
        ...(countryData.government?.map(i => i.articleId) || []),
        ...(countryData.timeZone?.map(i => i.articleId) || [])
    ].filter(Boolean) as string[],
    ['pt', 'fr', 'it', 'es']
  );
  
  const nameLoc = getEmptyLocalizedField();
  nameLoc.en = countryName;
  const countryDataEn: Country = { ...getEmptyCountry(), ...countryData, name: nameLoc };
  
  // Apply translations
  ['capital', 'largestCity', 'officialLanguage', 'currency', 'demonym', 'government', 'timeZone'].forEach(field => {
    const key = field as LocalizedArrayFieldKey;
    const items = (countryDataEn[key] as { articleId?: string | null; name: Record<string, string | null | undefined> }[]) || [];
    items.forEach(item => {
      const articleId = item.articleId?.replace(/_/g, ' ');
      ['pt', 'fr', 'it', 'es'].forEach(l => {
        const translation = articleId ? translations[articleId]?.[l] : null;
        if (translation) {
          item.name[l] = translation;
        } else if (!item.name[l]) {
          item.name[l] = item.name.en;
        }
      });
    });
  });

  mergedResult = mergeCountryData(JSON.stringify(mergedResult), countryDataEn);

  // 2. Localized Passes
  for (const lang of ['pt', 'fr', 'it', 'es']) {
    const filePath = path.join(SNAPSHOT_BASE, lang, 'sovereign_states', `${countryName.toLowerCase().replace(/ /g, '_')}.html`);
    if (!fs.existsSync(filePath)) continue;

    const html = fs.readFileSync(filePath, 'utf-8');
    const $ = cheerio.load(html);
    const nameLoc = getEmptyLocalizedField();
    nameLoc[lang as keyof typeof nameLoc] = $('h1#firstHeading').text().trim();
    const localizedData: Partial<Country> = { name: nameLoc };
    DescriptionParser.parse($ as unknown as Parameters<typeof DescriptionParser.parse>[0], localizedData, lang);
    
    mergedResult = mergeCountryData(JSON.stringify(mergedResult), localizedData as Country);
  }

  console.log('\n--- Final Merged Record ---');
  console.log(JSON.stringify(mergedResult, null, 2));
}

async function run() {
    const args = process.argv.slice(2);
    if (args.length > 0) {
        for (const arg of args) {
            await debugFlow(arg);
        }
    } else {
        await debugFlow('Brazil');
        await debugFlow('France');
    }
}

run();
