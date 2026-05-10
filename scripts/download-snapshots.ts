import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

const COUNTRIES = ['Brazil', 'France', 'Japan', 'Switzerland'];
const OUTPUT_DIR = 'tests/snapshots';
const axiosInstance = axios.create({
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WikiGeoScraper/1.0; +https://github.com/mucadoo/wikigeo-data-scraper)' }
});

async function downloadMinimalSnapshot(url: string, filename: string) {
  try {
    const { data } = await axiosInstance.get(url);
    const $ = cheerio.load(data);
    
    // Extract required elements
    const h1 = $('h1#firstHeading');
    const infobox = $('table.infobox');
    const paragraphs = $('#mw-content-text .mw-parser-output > p').slice(0, 5);
    
    // Construct minimal HTML
    const minimalHtml = `
      <html>
        <body>
          ${h1.toString()}
          ${infobox.toString()}
          ${paragraphs.toString()}
        </body>
      </html>
    `;
    
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), minimalHtml);
    console.log(`Saved minimal snapshot: ${filename}`);
  } catch (err) {
    console.error(`Failed to download/process ${url}: ${err instanceof Error ? err.message : err}`);
  }
}

async function run() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const country of COUNTRIES) {
    const enUrl = `https://en.wikipedia.org/wiki/${country.replace(/ /g, '_')}`;
    console.log(`Processing ${country}...`);
    
    try {
      const { data } = await axiosInstance.get(enUrl);
      const $ = cheerio.load(data);
      
      // Save English snapshot
      await downloadMinimalSnapshot(enUrl, `${country.toLowerCase()}_en.html`);
      
      // Find interlanguage links
      for (const lang of ['pt', 'fr', 'it', 'es']) {
        const link = $(`.interlanguage-link-target[lang="${lang}"]`).attr('href');
        if (link) {
          await downloadMinimalSnapshot(link, `${country.toLowerCase()}_${lang}.html`);
        } else {
          console.log(`Link for ${lang} not found for ${country}`);
        }
      }
    } catch (err) {
      console.error(`Error processing ${country}: ${err instanceof Error ? err.message : err}`);
    }
  }
}

run();
