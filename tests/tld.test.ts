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
      const html = fs.readFileSync(path.join(snapshotsDir, file), 'utf-8');
      const $ = cheerio.load(html);
      const country = CountryParser.parseCountry($ as any);
      
      // TLD should not be N/A or empty
      expect(country.internet_TLD).toBeDefined();
      expect(country.internet_TLD).not.toBe('N/A');
      expect(country.internet_TLD).not.toBe('');
      
      // Should not contain style tags or CSS snippets
      expect(country.internet_TLD).not.toMatch(/\.mw-parser-output/);
      expect(country.internet_TLD).not.toMatch(/display:inline/);
    });
  });
});
