import { CheerioCrawler, log } from 'crawlee';
import { CountryParser } from './parsers/country-parser.js';
import { DescriptionParser } from './parsers/description.js';
import { Country } from './types/country.js';
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
  log.error('Database initialization failed: ' + e);
}
const insertCountry = db.prepare('INSERT OR REPLACE INTO countries (name, data) VALUES (?, ?)');
const getCountry = db.prepare('SELECT data FROM countries WHERE name = ?');

const writeLocks: Record<string, Promise<void>> = {};

type LocalizedArrayFieldKey = 'capital' | 'largest_city' | 'official_language' | 'demonym' | 'currency' | 'government' | 'time_zone';

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
            ...(countryData.largest_city?.map(i => i.articleId) || []),
            ...(countryData.official_language?.map(i => i.articleId) || []),
            ...(countryData.currency?.map(i => i.articleId) || []),
            ...(countryData.demonym?.map(i => i.articleId) || []),
            ...(countryData.government?.map(i => i.articleId) || []),
            ...(countryData.time_zone?.map(i => i.articleId) || [])
        ].filter(Boolean) as string[]);
        
        const translations = await WikipediaAPI.fetchTranslations(Array.from(articleIds), ['pt', 'fr', 'it', 'es']);
        
        const localizedData: Partial<Country> = {
          name: { en: name },
          ...countryData,
        };

        // Fill translations
        ['capital', 'largest_city', 'official_language', 'currency', 'demonym', 'government', 'time_zone'].forEach(field => {
          const key = field as LocalizedArrayFieldKey;
          const items = localizedData[key] as any[] || [];
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
        const localizedData: Partial<Country> = { name: { [lang]: name } };
        DescriptionParser.parse($, localizedData, lang);
        const existing = getCountry.get(countryId) as { data: string } | undefined;
        const merged = mergeCountryData(existing?.data || null, localizedData);
        insertCountry.run(countryId, JSON.stringify(merged));
      }
    } finally {
      resolveLock!();
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
