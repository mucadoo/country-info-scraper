import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import { CountryParser } from '../src/parsers/country-parser.js';

describe('Regression Tests', () => {
  const snapshotsDir = path.join(process.cwd(), 'tests/snapshots');
  
  if (!fs.existsSync(snapshotsDir)) {
    it.skip('Snapshots directory not found', () => {});
    return;
  }

  const files = fs.readdirSync(snapshotsDir).filter(f => f.endsWith('.html'));

  files.forEach(file => {
    it(`should correctly parse ${file}`, () => {
      const html = fs.readFileSync(path.join(snapshotsDir, file), 'utf-8');
      const $ = cheerio.load(html);
      const country = CountryParser.parseCountry($ as any);
      
      expect(country.name).toBeDefined();
      expect(country.capital).toBeDefined();
      expect(country.population).toBeGreaterThan(0);
      expect(country.area_km2).toBeGreaterThan(0);
    });
  });
});
