import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

const COUNTRIES = ['Brazil', 'France', 'Japan', 'Switzerland'];
const OUTPUT_DIR = 'tests/snapshots';
const axiosInstance = axios.create({
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WikiGeoScraper/1.0; +https://github.com/mucadoo/wikigeo-data-scraper)' }
});

async function downloadSnapshot(url: string, filename: string) {
  try {
    const { data } = await axiosInstance.get(url);
    const $ = cheerio.load(data);
    
    // Remove heavy/unnecessary elements
    $('script, style, link[rel="stylesheet"], noscript, svg, .mw-editsection').remove();
    
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), $.html());
    console.log(`Saved ${filename}`);
  } catch (err) {
    console.error(`Failed to download ${url}: ${err instanceof Error ? err.message : err}`);
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
      await downloadSnapshot(enUrl, `${country.toLowerCase()}_en.html`);
      
      // Find interlanguage links
      for (const lang of ['pt', 'fr', 'it', 'es']) {
        const link = $(`.interlanguage-link-target[lang="${lang}"]`).attr('href');
        if (link) {
          await downloadSnapshot(link, `${country.toLowerCase()}_${lang}.html`);
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
