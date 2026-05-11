import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import { CountryParser } from '../src/parsers/country-parser.js';
import { DescriptionParser } from '../src/parsers/description.js';

describe('Regression Tests', () => {
  const snapshotsDir = path.join(process.cwd(), 'tests/snapshots');
  const translations = JSON.parse(fs.readFileSync(path.join(snapshotsDir, 'translations.json'), 'utf-8'));
  
  if (!fs.existsSync(snapshotsDir)) {
    it.skip('Snapshots directory not found', () => {});
    return;
  }

  const grouped: Record<string, Record<string, string>> = {};
  ['en', 'pt', 'fr', 'it', 'es'].forEach(lang => {
    const langDir = path.join(snapshotsDir, lang, 'sovereign_states');
    if (fs.existsSync(langDir)) {
      fs.readdirSync(langDir).filter(f => f.endsWith('.html')).forEach(file => {
        const country = file.replace('.html', '');
        if (!grouped[country]) grouped[country] = {};
        grouped[country][lang] = path.join(lang, 'sovereign_states', file);
      });
    }
  });

  Object.entries(grouped).forEach(([countryName, langs]) => {
    describe(`Country: ${countryName}`, () => {
      const countryData: any = { 
        name: {}, description: {}, 
        capital: {}, largest_city: {}, government: {}, official_language: {}, demonym: {}, currency: {} 
      };

      // 1. Process EN Pass
      if (langs['en']) {
        it('should process EN infobox and map translations', () => {
          const html = fs.readFileSync(path.join(snapshotsDir, langs['en']), 'utf-8');
          const $ = cheerio.load(html);
          const partialData: any = {};
          CountryParser.parseCountry($ as any, partialData, 'en');
          
          ['capital', 'official_language', 'currency'].forEach(field => {
            const data = partialData[field]?.en || [];
            countryData[field] = { en: data };
            
            ['pt', 'fr', 'it', 'es'].forEach(l => {
              countryData[field][l] = data.map((item: any) => ({
                text: item.articleId && translations[item.articleId]?.[l] ? translations[item.articleId][l] : item.text,
                articleId: item.articleId
              }));
            });
          });
          
          expect(countryData.capital.en[0]).toHaveProperty('text');
          expect(countryData.capital.en[0]).toHaveProperty('articleId');
          expect(countryData.capital.fr).toBeDefined();
        });
      }

      // 2. Localized Passes
      ['pt', 'fr', 'it', 'es'].forEach(lang => {
        if (langs[lang]) {
          it(`should process ${lang} localized description`, () => {
            const html = fs.readFileSync(path.join(snapshotsDir, langs[lang]), 'utf-8');
            const $ = cheerio.load(html);
            
            const locData: any = { name: { [lang]: '' }, description: { [lang]: '' } };
            locData.name[lang] = $('h1#firstHeading').text().trim();
            DescriptionParser.parse($ as any, locData, lang);

            countryData.name[lang] = locData.name[lang];
            countryData.description[lang] = locData.description[lang];

            expect(countryData.name[lang]).toBeDefined();
            expect(countryData.description[lang]).toBeDefined();          });
        }
      });

      if (countryName === 'france') {
        it('should have correct French specific translations', () => {
          expect(countryData.capital.fr[0].text).toBe('Paris');
          expect(countryData.name.es).toBe('Francia');
          expect(countryData.description.es).toBeDefined();
        });
      }
    });
  });
});
