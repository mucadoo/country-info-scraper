import { CheerioCrawler, log } from 'crawlee';
import { CountryParser } from './parsers/country-parser.js';
import { CountrySchema } from './types/country.js';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const db = new Database('scraper.db');

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS countries (
    name TEXT PRIMARY KEY,
    data TEXT
  )
`);

const insertCountry = db.prepare('INSERT OR REPLACE INTO countries (name, data) VALUES (?, ?)');

const crawler = new CheerioCrawler({
  maxConcurrency: 10,
  requestHandler: async ({ $, request, enqueueLinks }) => {
    if (request.url === 'https://en.wikipedia.org/wiki/List_of_sovereign_states') {
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
      const name = $('h1#firstHeading').text();
      log.info(`Scraping ${name}...`);
      
      const countryData = CountryParser.parseCountry($);
      countryData.name = name;

      // Validate with Zod
      try {
        const validated = CountrySchema.parse(countryData);
        insertCountry.run(name, JSON.stringify(validated));
      } catch (e) {
        log.error(`Validation failed for ${name}: ${e}`);
      }
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
