import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import { CountryParser } from '../src/parsers/country-parser.js';
import { DescriptionParser } from '../src/parsers/description.js';
import { Country } from '../src/types/country.js';

const SNAPSHOT_BASE = 'tests/snapshots';
const translations = JSON.parse(fs.readFileSync(path.join(SNAPSHOT_BASE, 'translations.json'), 'utf-8'));

type LocalizedArrayFieldKey = 'capital' | 'largest_city' | 'official_language' | 'demonym' | 'currency' | 'government';

const mergeCountryData = (country: Country, newData: Partial<Country>): Country => {
  const newCountry = { ...country };
  
  // Merge localized string fields
  ['name', 'description'].forEach(field => {
    const newVal = newData[field as keyof Country] as Record<string, string> | undefined;
    if (newVal) {
        Object.entries(newVal).forEach(([l, val]) => {
            if (val) (newCountry as any)[field] = { ...(newCountry as any)[field], [l]: val };
        });
    }
  });

  // Merge array fields
  ['capital', 'largest_city', 'official_language', 'demonym', 'currency', 'government'].forEach(field => {
    const newVal = newData[field as keyof Country] as Record<string, {text: string, articleId?: string}[]> | undefined;
    if (newVal) {
        Object.entries(newVal).forEach(([l, val]) => {
            if (val) {
                const current = (newCountry as any)[field]?.[l] || [];
                // Dedup by text
                const merged = Array.from(new Map([...current, ...val].map(i => [i.text, i])).values());
                (newCountry as any)[field] = { ...(newCountry as any)[field], [l]: merged };
            }
        });
    }
  });

  return newCountry;
};

async function debugFlow(countryName: string) {
  let mergedResult: Country = {
    name: {}, description: {}, capital: {}, largest_city: {},
    government: {}, official_language: {}, demonym: {}, currency: {}
  };

  console.log(`\n--- Debugging Flow for: ${countryName} ---`);

  // 1. English Pass
  const enHtml = fs.readFileSync(path.join(SNAPSHOT_BASE, 'en', 'sovereign_states', `${countryName.toLowerCase().replace(/ /g, '_')}.html`), 'utf-8');
  const $en = cheerio.load(enHtml);
  const countryData = CountryParser.parseCountry($en as any, {}, 'en');
  
  const localizedDataEn: Partial<Country> = { name: { en: countryName }, ...countryData };
  
  // Apply translations
  ['capital', 'largest_city', 'official_language', 'currency', 'demonym', 'government'].forEach(field => {
    const key = field as LocalizedArrayFieldKey;
    const data = (localizedDataEn[key] as any)?.en || [];
    ['pt', 'fr', 'it', 'es'].forEach(l => {
        const translated = data.map((item: any) => ({
            text: item.articleId && translations[item.articleId]?.[l] ? translations[item.articleId][l] : item.text,
            articleId: item.articleId
        }));
        if (!localizedDataEn[key]) (localizedDataEn as any)[key] = {};
        (localizedDataEn[key] as any)[l] = translated;
    });
  });

  mergedResult = mergeCountryData(mergedResult, localizedDataEn);

  // 2. Localized Passes
  for (const lang of ['pt', 'fr', 'it', 'es']) {
    const filePath = path.join(SNAPSHOT_BASE, lang, 'sovereign_states', `${countryName.toLowerCase().replace(/ /g, '_')}.html`);
    if (!fs.existsSync(filePath)) continue;

    const html = fs.readFileSync(filePath, 'utf-8');
    const $ = cheerio.load(html);
    const localizedData: Partial<Country> = { name: { [lang]: $('h1#firstHeading').text().trim() } };
    DescriptionParser.parse($ as any, localizedData, lang);
    
    mergedResult = mergeCountryData(mergedResult, localizedData);
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
