// file: scripts/debug-extraction-flow.ts
import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import { CountryParser } from '../src/parsers/country-parser.js';
import { Country } from '../src/types/country.js';

const SNAPSHOT_BASE = 'tests/snapshots';
const LANGS = ['en', 'pt', 'fr', 'it', 'es'];
const CATEGORY = 'sovereign_states';

type LocalizedFieldKey = 'name' | 'description' | 'capital' | 'largest_city' | 'government' | 'official_language' | 'demonym' | 'currency';

const mergeCountryData = (existing: Country, newData: Partial<Country>, lang: string): Country => {
  const country = { ...existing };
  const localizedFields: LocalizedFieldKey[] = ['name', 'description', 'capital', 'largest_city', 'government', 'official_language', 'demonym', 'currency'];
  
  localizedFields.forEach(field => {
    const newVal = newData[field] as Record<string, string> | undefined;
    if (newVal && newVal[lang]) {
      const currentVal = (country[field] || {}) as Record<string, string>;
      const merged = { ...currentVal, [lang]: newVal[lang] };
      if (field === 'name') country.name = merged;
      else if (field === 'description') country.description = merged;
      else if (field === 'capital') country.capital = merged;
      else if (field === 'largest_city') country.largest_city = merged;
      else if (field === 'government') country.government = merged;
      else if (field === 'official_language') country.official_language = merged;
      else if (field === 'demonym') country.demonym = merged;
      else if (field === 'currency') country.currency = merged;
    }
  });

  return country;
};

async function debugFlow(countryName: string) {
  let mergedResult: Country = {
    name: {}, description: {}, capital: {}, largest_city: {},
    government: {}, official_language: {}, demonym: {}, currency: {}
  };

  console.log(`\n--- Debugging Flow for: ${countryName} ---`);

  for (const lang of LANGS) {
    const filePath = path.join(SNAPSHOT_BASE, lang, CATEGORY, `${countryName.toLowerCase().replace(/ /g, '_')}.html`);
    
    if (!fs.existsSync(filePath)) {
      console.warn(`[${lang}] Snapshot missing: ${filePath}`);
      continue;
    }

    const html = fs.readFileSync(filePath, 'utf-8');
    const $ = cheerio.load(html);
    
    // Simulate what happens in requestHandler
    const parsedData = CountryParser.parseCountry($ as any, {}, lang);
    const nameFromH1 = $('h1#firstHeading').text().trim();
    
    const localizedData: Partial<Country> = {
      name: { [lang]: nameFromH1 },
      ...parsedData,
    };

    console.log(`[${lang}] Parsed Capital:`, (localizedData.capital as any)?.[lang] || 'MISSING');
    
    mergedResult = mergeCountryData(mergedResult, localizedData, lang);
  }

  console.log('\n--- Final Merged Record ---');
  console.log(JSON.stringify(mergedResult, null, 2));
}

// Test with Brazil and France
async function run() {
    await debugFlow('Brazil');
    await debugFlow('France');
}

run();
