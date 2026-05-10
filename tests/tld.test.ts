import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import { CountryParser } from '../src/parsers/country-parser.js';

describe('TLD Regression Tests', () => {
  const snapshotsDir = path.join(process.cwd(), 'tests/snapshots');
  const files = fs.readdirSync(snapshotsDir).filter(f => f.endsWith('.html'));

  files.forEach(file => {
    it(`should parse internet_TLD for ${file}`, () => {
      // Only English snapshots contain TLD in our minimal parsing logic
      if (!file.endsWith('_en.html')) {
        return;
      }
      const html = fs.readFileSync(path.join(snapshotsDir, file), 'utf-8');
      const $ = cheerio.load(html);
      const country = CountryParser.parseCountry($ as any);
      
      expect(country.internet_TLD).toBeDefined();
      expect(country.internet_TLD).not.toBe('N/A');
      expect(country.internet_TLD).not.toBe('');
      
      expect(country.internet_TLD).not.toMatch(/\.mw-parser-output/);
      expect(country.internet_TLD).not.toMatch(/display:inline/);
    });
  });
});
