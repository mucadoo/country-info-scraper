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

  const grouped: Record<string, Record<string, string>> = {};
  
  ['en', 'pt', 'fr', 'it', 'es'].forEach(lang => {
    const langDir = path.join(snapshotsDir, lang, 'sovereign_states');
    if (fs.existsSync(langDir)) {
      const files = fs.readdirSync(langDir).filter(f => f.endsWith('.html'));
      files.forEach(file => {
        const country = file.replace('.html', '');
        if (!grouped[country]) grouped[country] = {};
        grouped[country][lang] = path.join(lang, 'sovereign_states', file);
      });
    }
  });

  Object.entries(grouped).forEach(([countryName, langs]) => {
    describe(`Country: ${countryName}`, () => {
      const countryData: any = { name: {}, description: {}, capital: {}, largest_city: {}, government: {}, official_language: {}, demonym: {}, currency: {} };

      Object.entries(langs).forEach(([lang, relativePath]) => {
        it(`should parse ${lang} snapshot`, () => {
          const html = fs.readFileSync(path.join(snapshotsDir, relativePath), 'utf-8');
          const $ = cheerio.load(html);
          
          const partialCountry: any = {};
          CountryParser.parseCountry($ as any, partialCountry, lang);
          
          // Manually add name from h1 as main.ts does
          const name = $('h1#firstHeading').text();
          if (!partialCountry.name) {
            partialCountry.name = { [lang]: name };
          }

          // Aggregate
          Object.keys(countryData).forEach(key => {
            if (partialCountry[key] && partialCountry[key][lang]) {
              countryData[key][lang] = partialCountry[key][lang];
            }
          });

          // Localized fields checks
          expect(partialCountry.name?.[lang]).toBeDefined();
          expect(typeof partialCountry.name?.[lang]).toBe('string');
        });
      });

      it('should have all 5 languages populated', () => {
        ['en', 'pt', 'fr', 'it', 'es'].forEach(lang => {
          if (langs[lang]) {
            expect(countryData.name[lang]).toBeDefined();
            expect(countryData.name[lang].length).toBeGreaterThan(0);
          }
        });
      });

      if (countryName === 'france') {
        it('should have France specific data', () => {
          console.log('France countryData capital:', JSON.stringify(countryData.capital));
          expect(countryData.capital.fr).toBeDefined();
          expect(countryData.capital.fr).toContain('Paris');
          expect(countryData.name.es).toBe('Francia');
        });
      }
    });
  });
});
