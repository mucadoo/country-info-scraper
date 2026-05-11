import { CheerioCrawler, log } from 'crawlee';
import { CountryParser } from '../src/parsers/country-parser.js';
import { WikipediaAPI } from '../src/utils/wikipedia-api.js';
import fs from 'fs';
import path from 'path';

const OUTPUT_BASE = 'tests/snapshots';
const LANGS = ['en', 'pt', 'fr', 'it', 'es'];
const CATEGORY = 'sovereign_states';
const translationsCache: Record<string, Record<string, string>> = {};

function sanitize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

for (const lang of LANGS) {
  const dir = path.join(OUTPUT_BASE, lang, CATEGORY);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getMinimalHtml($: any, skipInfobox: boolean = false): string {
  const h1 = $('h1#firstHeading');
  const infoboxes = skipInfobox ? '' : $('table.infobox, table.infobox_v2, table.infobox_v3, table.sinottico, div.infobox, div.infobox_v2, div.infobox_v3').toString();
  const paragraphs = $('#mw-content-text .mw-parser-output > p').slice(0, 10).toString();

  return `<html><head><meta charset="utf-8"></head><body>${h1.toString()}${infoboxes}${paragraphs}</body></html>`;
}

const allArticleIds = new Set<string>();

const crawler = new CheerioCrawler({
  maxConcurrency: 10,
  requestHandler: async ({ $, request }) => {
    if (request.label === 'list') {
      const links = $('table.wikitable').first().find('tbody > tr').toArray().map(r => $(r).find('td').first().find('a').attr('href')).filter(h => h && !h.includes('redlink=1')) as string[];
      await crawler.addRequests(links.map(h => ({ url: `https://en.wikipedia.org${h}`, label: 'country_en' })));
      return;
    }

    if (request.label === 'country_en') {
      const baseName = request.url.split('/').pop()?.replace(/_/g, ' ') || $('h1').text();
      const fileName = `${sanitize(baseName)}.html`;
      fs.writeFileSync(path.join(OUTPUT_BASE, 'en', CATEGORY, fileName), getMinimalHtml($));
      
      const countryData = CountryParser.parseCountry($ as any, {}, 'en');
      [...(countryData.capital?.en || []), ...(countryData.official_language?.en || []), ...(countryData.currency?.en || [])]
        .forEach(i => { if (i.articleId) allArticleIds.add(i.articleId); });

      for (const lang of ['pt', 'fr', 'it', 'es']) {
        const href = $(`.interlanguage-link-target[lang="${lang}"]`).attr('href');
        if (href) {
          const url = href.startsWith('//') ? `https:${href}` : href;
          await crawler.addRequests([{ url, label: 'country_lang', userData: { baseName, lang } }]);
        }
      }
    }

    if (request.label === 'country_lang') {
      const { baseName, lang } = request.userData;
      fs.writeFileSync(path.join(OUTPUT_BASE, lang, CATEGORY, `${sanitize(baseName)}.html`), getMinimalHtml($, true));
    }
  }
});

async function run() {
  log.info('Starting Snapshot Downloader...');
  await crawler.run([{ url: 'https://en.wikipedia.org/wiki/List_of_sovereign_states', label: 'list' }]);
  
  log.info(`Fetching translations for ${allArticleIds.size} unique articles...`);
  const translations = await WikipediaAPI.fetchTranslations(Array.from(allArticleIds), ['pt', 'fr', 'it', 'es']);
  
  fs.writeFileSync(path.join(OUTPUT_BASE, 'translations.json'), JSON.stringify(translations, null, 2));
  log.info('Finished snapshots and translations.');
}

run();
