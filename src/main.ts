import { DataValidator } from './utils/validator.js';
import { CheerioCrawler, log } from 'crawlee';
import { CountryParser } from './parsers/country-parser.js';
import { DescriptionParser } from './parsers/description.js';
import { Country, getEmptyCountry, getEmptyLocalizedField } from './types/country.js';
import { WikipediaAPI } from './utils/wikipedia-api.js';
import { mergeCountryData } from './utils/merger.js';
import Database from 'better-sqlite3';
import fs from 'fs';

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
  log.error('Database initialization failed: ' + (e instanceof Error ? e.message : String(e)));
}
const insertCountry = db.prepare('INSERT OR REPLACE INTO countries (name, data) VALUES (?, ?)');
const getCountry = db.prepare('SELECT data FROM countries WHERE name = ?');

const writeLocks: Record<string, Promise<void>> = {};

type LocalizedArrayFieldKey = 'capital' | 'largestCity' | 'officialLanguage' | 'demonym' | 'currency' | 'government' | 'timeZone';

const crawler = new CheerioCrawler({
  maxConcurrency: 10,
  requestHandler: async ({ $, request }) => {
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
      log.info(`Found ${titles.length} countries. Fetching translations...`);
      const languages = ['pt', 'fr', 'it', 'es'];
      const allLangLinks = await WikipediaAPI.fetchTranslations(titles, languages);

      for (const link of countryLinks) {
        const baseName = link.title!;
        const enUrl = `https://en.wikipedia.org${link.href}`;
        
        const requests = [];
        // Enqueue English
        requests.push({ url: enUrl, label: 'country', userData: { baseName, lang: 'en' } });
        
        // Enqueue Localized
        const langLinks = allLangLinks[baseName];
        if (langLinks) {
          for (const lang of languages) {
            if (langLinks[lang]) {
              const locUrl = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(langLinks[lang])}`;
              requests.push({ url: locUrl, label: 'country', userData: { baseName, lang } });
            }
          }
        }
        await crawler.addRequests(requests);
      }
      return;
    }

    const lang = request.userData.lang || 'en';
    const name = $('h1#firstHeading').text();
    const countryId = request.userData.baseName || name;

    // Use a simple lock to prevent race conditions during database updates
    if (!writeLocks[countryId]) {
      writeLocks[countryId] = Promise.resolve();
    }

    await writeLocks[countryId];
    let resolveLock: () => void;
    writeLocks[countryId] = new Promise((resolve) => { resolveLock = resolve; });

    try {
      if (lang === 'en') {
        const countryData = CountryParser.parseCountry($, {}, lang);
        const articleIds = new Set([
            ...(countryData.capital?.map(i => i.articleId) || []),
            ...(countryData.largestCity?.map(i => i.articleId) || []),
            ...(countryData.officialLanguage?.map(i => i.articleId) || []),
            ...(countryData.currency?.map(i => i.articleId) || []),
            ...(countryData.demonym?.map(i => i.articleId) || []),
            ...(countryData.government?.map(i => i.articleId) || []),
            ...(countryData.timeZone?.map(i => i.articleId) || [])
        ].filter(Boolean) as string[]);
        
        const translations = await WikipediaAPI.fetchTranslations(Array.from(articleIds), ['pt', 'fr', 'it', 'es']);
        
        const nameLoc = getEmptyLocalizedField();
        nameLoc.en = name;
        const localizedData: Country = {
          ...getEmptyCountry(),
          ...countryData,
          name: nameLoc,
        };

        // Fill translations
        ['capital', 'largestCity', 'officialLanguage', 'currency', 'demonym', 'government', 'timeZone'].forEach(field => {
          const key = field as LocalizedArrayFieldKey;
          const items = (localizedData[key] as { articleId?: string | null; name: Record<string, string | null | undefined> }[]) || [];
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

        const existing = getCountry.get(countryId) as { data: string } | undefined;
        const merged = mergeCountryData(existing?.data || null, localizedData);
        insertCountry.run(countryId, JSON.stringify(merged));
      } else {
        const nameLoc = getEmptyLocalizedField();
        nameLoc[lang as keyof typeof nameLoc] = name;
        const localizedData: Partial<Country> = { name: nameLoc };
        DescriptionParser.parse($, localizedData, lang);
        const existing = getCountry.get(countryId) as { data: string } | undefined;
        const merged = mergeCountryData(existing?.data || null, localizedData as Country);
        insertCountry.run(countryId, JSON.stringify(merged));
      }
    } finally {
      resolveLock!();
    }
  },
});

async function run() {
  await crawler.run(['https://en.wikipedia.org/wiki/List_of_sovereign_states']);
  const rawCountries = (db.prepare('SELECT data FROM countries').all() as { data: string }[]).map(row => JSON.parse(row.data) as Country);
  
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

  // Normalize and validate all countries
  const countries = rawCountries
    .sort((a, b) => (a.isoCode || '').localeCompare(b.isoCode || ''))
    .map(country => {
      const normalized = { ...getEmptyCountry(), ...country };
      normalized.callingCode = normalized.callingCode || [];
      normalized.internetTld = normalized.internetTld || [];
      const { isoCode, ...rest } = normalized;
      return DataValidator.validate({ isoCode, ...rest });
    });

  // 1. Generate standard full files
  const output = {
    metadata: {
      generatedAt: new Date().toISOString(),
      version: pkg.version,
      license: pkg.license,
      source: 'Wikipedia'
    },
    data: countries
  };

  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/sovereign-states.json', JSON.stringify(output, null, 2));
  fs.writeFileSync('data/sovereign-states.min.json', JSON.stringify(output));

  // 2. Generate Static REST API structure
  const API_DIR = 'data/api/v1';
  const COUNTRY_DIR = `${API_DIR}/countries`;
  fs.mkdirSync(COUNTRY_DIR, { recursive: true });

  // Index file
  const index = countries.map(({ isoCode, name, flagUrl }) => ({ isoCode, name, flagUrl }));
  fs.writeFileSync(`${API_DIR}/index.json`, JSON.stringify(index, null, 2));

  // Bulk export file
  fs.writeFileSync(`${API_DIR}/all.json`, JSON.stringify(countries, null, 2));

  // Individual files
  countries.forEach(country => {
    if (country.isoCode) {
      fs.writeFileSync(`${COUNTRY_DIR}/${country.isoCode}.json`, JSON.stringify(country, null, 2));
    }
  });
}

run().catch(err => { log.error('Scraper failed', err); process.exit(1); });
