import { CheerioCrawler, log } from 'crawlee';
import { CountryParser } from './parsers/country-parser.js';
import { CountrySchema, Country } from './types/country.js';
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

type LocalizedFieldKey = 'name' | 'description' | 'capital' | 'largest_city' | 'government' | 'official_language' | 'demonym' | 'currency';

const mergeCountryData = (existingJson: string | null, newData: Partial<Country>, lang: string): Country => {
  const existing: Country = existingJson ? JSON.parse(existingJson) : {
    name: {}, description: {}, capital: {}, largest_city: {},
    government: {}, official_language: {}, demonym: {}, currency: {}
  };
  
  const country = { ...existing };
  
  // Merge localized fields
  const localizedFields: LocalizedFieldKey[] = ['name', 'description', 'capital', 'largest_city', 'government', 'official_language', 'demonym', 'currency'];
  
  localizedFields.forEach(field => {
    const newVal = newData[field] as Record<string, string> | undefined;
    if (newVal && newVal[lang]) {
      const currentVal = (country[field] || {}) as Record<string, string>;
      const merged = { ...currentVal, [lang]: newVal[lang] };
      // Exhaustive assignment to avoid any
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

  // Keep root fields if present
  if (newData.ISO_code !== undefined) country.ISO_code = newData.ISO_code;
  if (newData.flagUrl !== undefined) country.flagUrl = newData.flagUrl;
  if (newData.population !== undefined) country.population = newData.population;
  if (newData.area_km2 !== undefined) country.area_km2 = newData.area_km2;
  if (newData.density_km2 !== undefined) country.density_km2 = newData.density_km2;
  if (newData.gdp !== undefined) country.gdp = newData.gdp;
  if (newData.hdi !== undefined) country.hdi = newData.hdi;
  if (newData.time_zone !== undefined) country.time_zone = newData.time_zone;
  if (newData.calling_code !== undefined) country.calling_code = newData.calling_code;
  if (newData.internet_TLD !== undefined) country.internet_TLD = newData.internet_TLD;

  return country;
};

const crawler = new CheerioCrawler({
  maxConcurrency: 10,
  requestHandler: async ({ $, request, enqueueLinks }) => {
    if (request.url.includes('List_of_sovereign_states')) {
      log.info('Processing country list...');
      const table = $('table.wikitable').first();
      const links: string[] = [];
      
      table.find('tbody > tr').each((_, row) => {
        const link = $(row).find('td').first().find('a').first();
        if (link.length > 0) {
          const href = link.attr('href');
          if (href) {
            links.push(`https://en.wikipedia.org${href}`);
          }
        }
      });
      
      await enqueueLinks({
        urls: links,
        label: 'country',
      });
      return;
    }

    if (request.label === 'country') {
      const lang = request.userData.lang || 'en';
      const name = $('h1#firstHeading').text();
      log.info(`Scraping ${name} (${lang})...`);
      
      const countryData = CountryParser.parseCountry($);
      // Map to localized fields
      const localizedData: Partial<Country> = {
        name: { [lang]: name },
        ...countryData,
      };
      
      // Enqueue interlanguage links if base language
      if (lang === 'en') {
        const interLinks = $('.interlanguage-link-target');
        const languages = ['pt', 'fr', 'it', 'es'];
        
        for (const el of interLinks.toArray()) {
          const $el = $(el);
          const langCode = $el.attr('lang');
          const href = $el.attr('href');
          
          if (langCode && languages.includes(langCode) && href) {
            await enqueueLinks({
              urls: [href],
              label: 'country',
              userData: { baseName: request.userData.baseName || name, lang: langCode },
              strategy: 'all',
            });
          }
        }
      }

      // Update DB
      const countryId = request.userData.baseName || name;
      
      if (!writeLocks[countryId]) {
        writeLocks[countryId] = Promise.resolve();
      }

      writeLocks[countryId] = writeLocks[countryId].then(async () => {
        const existing = getCountry.get(countryId) as { data: string } | undefined;
        const merged = mergeCountryData(existing?.data || null, localizedData, lang);
        
        try {
          const validated = CountrySchema.parse(merged);
          insertCountry.run(countryId, JSON.stringify(validated));
        } catch (e) {
          log.error('Validation failed for ' + name + ': ' + e);
        }
      });

      await writeLocks[countryId];
    }
  },
});

async function run() {
  log.info('Starting scraper...');
  await crawler.run(['https://en.wikipedia.org/wiki/List_of_sovereign_states']);
  
  log.info('Exporting data...');
  const allCountries = db.prepare('SELECT data FROM countries').all() as { data: string }[];
  const countries = allCountries.map(row => JSON.parse(row.data));
  
  const prettyPath = 'data/countries.json';
  const minPath = 'data/countries.min.json';
  
  fs.mkdirSync(path.dirname(prettyPath), { recursive: true });
  fs.writeFileSync(prettyPath, JSON.stringify(countries, null, 2));
  fs.writeFileSync(minPath, JSON.stringify(countries));
  
  log.info(`Exported ${countries.length} countries.`);
}

run().catch(err => {
  log.error('Scraper failed', err);
  process.exit(1);
});
