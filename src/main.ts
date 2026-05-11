import { CheerioCrawler, log } from 'crawlee';
import { CountryParser } from './parsers/country-parser.js';
import { DescriptionParser } from './parsers/description.js';
import { CountrySchema, Country } from './types/country.js';
import { WikipediaAPI } from './utils/wikipedia-api.js';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const db = new Database('scraper.db');

// Initialize database
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS countries (
      name TEXT PRIMARY KEY,
      data TEXT
    )
  `);
  log.info('Database initialized successfully.');
} catch (e) {
  log.error('Database initialization failed: ' + e);
}
const insertCountry = db.prepare('INSERT OR REPLACE INTO countries (name, data) VALUES (?, ?)');
const getCountry = db.prepare('SELECT data FROM countries WHERE name = ?');

const writeLocks: Record<string, Promise<void>> = {};

type LocalizedFieldKey = 'name' | 'description' | 'government';
type LocalizedArrayFieldKey = 'capital' | 'largest_city' | 'official_language' | 'demonym' | 'currency';

const mergeCountryData = (existingJson: string | null, newData: Partial<Country>, lang: string): Country => {
  const existing: Country = existingJson ? JSON.parse(existingJson) : {
    name: {}, description: {}, capital: {}, largest_city: {},
    government: {}, official_language: {}, demonym: {}, currency: {}
  };
  
  const country = { ...existing };
  
  // Merge fields
  const localizedStringFields: LocalizedFieldKey[] = ['name', 'description', 'government'];
  const localizedArrayFields: LocalizedArrayFieldKey[] = ['capital', 'largest_city', 'official_language', 'demonym', 'currency'];
  
  localizedStringFields.forEach(field => {
    const newVal = newData[field] as Record<string, string> | undefined;
    if (newVal && newVal[lang]) {
      const currentVal = (country[field] || {}) as Record<string, string>;
      const merged = { ...currentVal, [lang]: newVal[lang] };
      if (field === 'name') country.name = merged;
      else if (field === 'description') country.description = merged;
      else if (field === 'government') country.government = merged;
    }
  });

  localizedArrayFields.forEach(field => {
    const newVal = newData[field] as Record<string, {text: string, articleId?: string}[]> | undefined;
    if (newVal && newVal[lang]) {
      const currentVal = (country[field] || {}) as Record<string, {text: string, articleId?: string}[]>;
      const oldArr = currentVal[lang] || [];
      const newArr = newVal[lang];
      // Dedup by text
      const mergedArr = Array.from(new Map([...oldArr, ...newArr].map(i => [i.text, i])).values());
      const merged = { ...currentVal, [lang]: mergedArr };
      if (field === 'capital') country.capital = merged;
      else if (field === 'largest_city') country.largest_city = merged;
      else if (field === 'official_language') country.official_language = merged;
      else if (field === 'demonym') country.demonym = merged;
      else if (field === 'currency') country.currency = merged;
    }
  });

  // Keep root fields if present
  if (newData.ISO_code !== undefined) country.ISO_code = newData.ISO_code;
  if (newData.flagUrl !== undefined) country.flagUrl = newData.flagUrl;
  if (newData.population !== undefined) country.population = newData.population;
  if (newData.area_km2 !== undefined) country.area_km2 = newData.area_km2;
  if (newData.density_km2 !== undefined) country.density_km2 = newData.density_km2;
  if (newData.gdp !== undefined) country.gdp = newData.gdp;
  if (newData.hdi !== undefined) country.hdi = newData.hdi;
  
  const mergeArrays = (oldArr: string[] | null | undefined, newArr: string[] | null | undefined) => 
    Array.from(new Set([...(oldArr || []), ...(newArr || [])]));

  if (newData.time_zone !== undefined) country.time_zone = mergeArrays(country.time_zone, newData.time_zone);
  if (newData.calling_code !== undefined) country.calling_code = newData.calling_code;
  if (newData.internet_TLD !== undefined) country.internet_TLD = newData.internet_TLD;

  return country;
};

const crawler = new CheerioCrawler({
  maxConcurrency: 10,
  requestHandler: async ({ $, request, enqueueLinks }) => {
    if (request.url.includes('List_of_sovereign_states')) {
      const table = $('table.wikitable').first();
      const rows = table.find('tbody > tr').toArray();
      const countryLinks = rows.map(r => {
        const a = $(r).find('td').first().find('a');
        return { 
          title: a.attr('title'), 
          href: a.attr('href') 
        };
      }).filter(l => l.title && l.href && !l.href.includes('redlink=1'));

      const titles = countryLinks.map(l => l.title!) as string[];
      const languages = ['pt', 'fr', 'it', 'es'];
      const allLangLinks = await WikipediaAPI.fetchTranslations(titles, languages);

      for (const link of countryLinks) {
        const baseName = link.title!;
        const enUrl = `https://en.wikipedia.org${link.href}`;
        
        // Enqueue English
        await enqueueLinks({ urls: [enUrl], label: 'country', userData: { baseName, lang: 'en' } });
        
        // Enqueue Localized
        const langLinks = allLangLinks[baseName];
        if (langLinks) {
          for (const lang of languages) {
            if (langLinks[lang]) {
              const locUrl = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(langLinks[lang])}`;
              await enqueueLinks({ urls: [locUrl], label: 'country', userData: { baseName, lang } });
            }
          }
        }
      }
      return;
    }

    const lang = request.userData.lang || 'en';
    const name = $('h1#firstHeading').text();
    const countryId = request.userData.baseName || name;

    if (lang === 'en') {
      const countryData = CountryParser.parseCountry($, {}, lang);
      const articleIds = new Set([
          ...(countryData.capital?.en?.map(i => i.articleId) || []),
          ...(countryData.largest_city?.en?.map(i => i.articleId) || []),
          ...(countryData.official_language?.en?.map(i => i.articleId) || []),
          ...(countryData.currency?.en?.map(i => i.articleId) || [])
      ].filter(Boolean) as string[]);
      
      const translations = await WikipediaAPI.fetchTranslations(Array.from(articleIds), ['pt', 'fr', 'it', 'es']);
      
      const localizedData: Partial<Country> = {
        name: { en: name },
        ...countryData,
      };

      // Fill translations
      ['capital', 'largest_city', 'official_language', 'currency'].forEach(field => {
        const key = field as LocalizedArrayFieldKey;
        const data = (localizedData[key] as any)?.en || [];
        ['pt', 'fr', 'it', 'es'].forEach(l => {
            const translated = data.map((item: any) => {
                const articleId = item.articleId?.replace(/_/g, ' ');
                const translation = articleId ? translations[articleId]?.[l] : null;
                return {
                    text: translation || item.text,
                    articleId: item.articleId
                };
            });
            if (!localizedData[key]) (localizedData as any)[key] = {};
            (localizedData[key] as any)[l] = translated;
        });
      });

      const merged = mergeCountryData(null, localizedData, 'en');
      insertCountry.run(countryId, JSON.stringify(merged));
    } else {
      const localizedData: Partial<Country> = { name: { [lang]: name } };
      DescriptionParser.parse($, localizedData, lang);
      const existing = getCountry.get(countryId) as { data: string } | undefined;
      const merged = mergeCountryData(existing?.data || null, localizedData, lang);
      insertCountry.run(countryId, JSON.stringify(merged));
    }
  },
});

async function run() {
  await crawler.run(['https://en.wikipedia.org/wiki/List_of_sovereign_states']);
  const countries = (db.prepare('SELECT data FROM countries').all() as { data: string }[]).map(row => JSON.parse(row.data));
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/sovereign-states.json', JSON.stringify(countries, null, 2));
}

run().catch(err => { log.error('Scraper failed', err); process.exit(1); });
