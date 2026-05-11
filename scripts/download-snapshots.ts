// file: scripts/download-snapshots.ts
import { CheerioCrawler, log } from 'crawlee';
import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

const OUTPUT_BASE = 'tests/snapshots';
const LANGS = ['en', 'pt', 'fr', 'it', 'es'];

// Ensure directories exist
for (const lang of LANGS) {
  const dir = path.join(OUTPUT_BASE, lang);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getMinimalHtml($: cheerio.CheerioAPI): string {
  const h1 = $('h1#firstHeading');
  const infoboxes = $('table.infobox, table.infobox_v2, table.infobox_v3, table.sinottico, div.infobox, div.infobox_v2, div.infobox_v3');
  const paragraphs = $('#mw-content-text .mw-parser-output > p').slice(0, 10);
  
  return `
    <html>
      <head><meta charset="utf-8"></head>
      <body>
        ${h1.toString()}
        ${infoboxes.map((_, el) => $(el).toString()).get().join('\n')}
        ${paragraphs.map((_, el) => $(el).toString()).get().join('\n')}
      </body>
    </html>
  `;
}

const crawler = new CheerioCrawler({
  maxConcurrency: 10,
  requestHandler: async ({ $, request, enqueueLinks }) => {
    
    if (request.label === 'list') {
      log.info('Fetching sovereign states list...');
      const links: string[] = [];
      $('table.wikitable').first().find('tbody > tr').each((_, row) => {
        const link = $(row).find('td').first().find('a').first();
        const href = link.attr('href');
        if (href && !href.includes('redlink=1')) {
          links.push(`https://en.wikipedia.org${href}`);
        }
      });
      
      await enqueueLinks({ urls: links, label: 'country_en' });
      return;
    }

    if (request.label === 'country_en') {
      const baseName = request.url.split('/').pop()?.replace(/_/g, ' ') || $('h1').text();
      log.info(`Saving EN snapshot for ${baseName}...`);
      
      fs.writeFileSync(path.join(OUTPUT_BASE, 'en', `${baseName}.html`), getMinimalHtml($));

      for (const lang of ['pt', 'fr', 'it', 'es']) {
        const href = $(`.interlanguage-link-target[lang="${lang}"]`).attr('href');
        if (href) {
          const url = href.startsWith('//') ? `https:${href}` : href;
          await crawler.addRequests([{
            url,
            label: 'country_lang',
            userData: { baseName, lang }
          }]);
        }
      }
    }

    if (request.label === 'country_lang') {
      const { baseName, lang } = request.userData;
      if (!lang) {
        log.error(`Missing lang for ${request.url}`);
        return;
      }
      log.info(`Saving ${lang.toUpperCase()} snapshot for ${baseName}...`);
      fs.writeFileSync(path.join(OUTPUT_BASE, lang, `${baseName}.html`), getMinimalHtml($));
    }
  }
});

async function run() {
  log.info('Starting Organized Snapshot Downloader...');
  await crawler.run([
    { url: 'https://en.wikipedia.org/wiki/List_of_sovereign_states', label: 'list' }
  ]);
  log.info('Finished downloading all snapshots!');
}

run();
