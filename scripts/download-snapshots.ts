import { CheerioCrawler, log } from 'crawlee';
import fs from 'fs';
import path from 'path';
import type { Element } from 'domhandler';

interface GenericCheerioAPI {
  (selector: any): any;
  toString(): string;
}

const OUTPUT_BASE = 'tests/snapshots';
const LANGS = ['en', 'pt', 'fr', 'it', 'es'];
const CATEGORY = 'sovereign_states';

function sanitize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Ensure directories exist
for (const lang of LANGS) {
  const dir = path.join(OUTPUT_BASE, lang, CATEGORY);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getMinimalHtml($: GenericCheerioAPI): string {
  const h1 = $('h1#firstHeading');
  const infoboxes = $('table.infobox, table.infobox_v2, table.infobox_v3, table.sinottico, div.infobox, div.infobox_v2, div.infobox_v3');
  const paragraphs = $('#mw-content-text .mw-parser-output > p').slice(0, 10);

  const infoboxHtml = infoboxes.toArray().map((el: Element) => $(el).toString()).join('\n');
  const paragraphsHtml = paragraphs.toArray().map((el: Element) => $(el).toString()).join('\n');

  return `
    <html>
      <head><meta charset="utf-8"></head>
      <body>
        ${h1.toString()}
        ${infoboxHtml}
        ${paragraphsHtml}
      </body>
    </html>
  `;
}

const crawler = new CheerioCrawler({
  maxConcurrency: 10,
  requestHandler: async ({ $, request }) => {
    
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
      
      for (const url of links) {
        await crawler.addRequests([{ url, label: 'country_en' }]);
      }
      return;
    }

    if (request.label === 'country_en') {
      const baseName = request.url.split('/').pop()?.replace(/_/g, ' ') || $('h1').text();
      const fileName = `${sanitize(baseName)}.html`;
      log.info(`Saving EN snapshot for ${baseName}...`);
      
      fs.writeFileSync(path.join(OUTPUT_BASE, 'en', CATEGORY, fileName), getMinimalHtml($));

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
      const fileName = `${sanitize(baseName)}.html`;
      log.info(`Saving ${lang.toUpperCase()} snapshot for ${baseName}...`);
      fs.writeFileSync(path.join(OUTPUT_BASE, lang, CATEGORY, fileName), getMinimalHtml($));
    }
  }
});

async function run() {
  log.info('Starting Refined Snapshot Downloader...');
  await crawler.run([
    { url: 'https://en.wikipedia.org/wiki/List_of_sovereign_states', label: 'list' }
  ]);
  log.info('Finished downloading all snapshots!');
}

run();
