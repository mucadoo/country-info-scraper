import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import { CountryParser } from '../src/parsers/country-parser.js';
import { DescriptionParser } from '../src/parsers/description.js';
import { WikipediaAPI } from '../src/utils/wikipedia-api.js';
import { mergeCountryData } from '../src/utils/merger.js';
import { Country } from '../src/types/country.js';

describe('Regression Tests', () => {
  const snapshotsDir = path.join(process.cwd(), 'tests/snapshots');
  
  beforeAll(() => {
    WikipediaAPI.useSnapshots(path.join(snapshotsDir, 'translations.json'));
  });

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
    it(`should process all languages for ${countryName}`, async () => {
      let countryData: Country = { 
        name: {}, description: {}, 
        capital: [], largest_city: [], government: [], official_language: [], demonym: [], currency: [], time_zone: [] 
      };

      // 1. Process EN Pass
      if (langs['en']) {
        const html = fs.readFileSync(path.join(snapshotsDir, langs['en']), 'utf-8');
        const $ = cheerio.load(html);
        const rawParsed = CountryParser.parseCountry($ as any, {}, 'en');
        
        const translations = await WikipediaAPI.fetchTranslations(
          [
              ...(rawParsed.capital?.map(i => i.articleId) || []),
              ...(rawParsed.largest_city?.map(i => i.articleId) || []),
              ...(rawParsed.official_language?.map(i => i.articleId) || []),
              ...(rawParsed.currency?.map(i => i.articleId) || []),
              ...(rawParsed.demonym?.map(i => i.articleId) || []),
              ...(rawParsed.government?.map(i => i.articleId) || []),
              ...(rawParsed.time_zone?.map(i => i.articleId) || [])
          ].filter(Boolean) as string[],
          ['pt', 'fr', 'it', 'es']
        );

        const localizedDataEn: Partial<Country> = { name: { en: countryName }, ...rawParsed };
        
        ['capital', 'largest_city', 'official_language', 'currency', 'demonym', 'government', 'time_zone'].forEach(field => {
          const items = (localizedDataEn as any)[field] || [];
          items.forEach((item: any) => {
            const articleId = item.articleId?.replace(/_/g, ' ');
            ['pt', 'fr', 'it', 'es'].forEach(l => {
              const translation = articleId ? translations[articleId]?.[l] : null;
              if (translation) {
                item.name[l] = translation;
              } else if (!item.name[l]) {
                item.name[l] = item.name.en;
              }
            });
          });
        });

        countryData = mergeCountryData(JSON.stringify(countryData), localizedDataEn);
      }

      // 2. Localized Passes
      ['pt', 'fr', 'it', 'es'].forEach(lang => {
        if (langs[lang]) {
          const html = fs.readFileSync(path.join(snapshotsDir, langs[lang]), 'utf-8');
          const $ = cheerio.load(html);
          
          const locData: Partial<Country> = { name: { [lang]: $('h1#firstHeading').text().trim() } };
          DescriptionParser.parse($ as any, locData, lang);

          countryData = mergeCountryData(JSON.stringify(countryData), locData);
        }
      });

      // Basic assertions
      expect(countryData.name.en).toBeDefined();
      if (langs['en']) {
        expect(countryData.capital[0].name.en).toBeDefined();
      }
      
      ['pt', 'fr', 'it', 'es'].forEach(lang => {
        if (langs[lang]) {
          expect((countryData.name as any)[lang]).toBeDefined();
          expect((countryData.description as any)[lang]).toBeDefined();
        }
      });

      if (countryName === 'france') {
        expect(countryData.capital[0].name.fr).toBe('Paris');
        expect(countryData.name.es).toBe('Francia');
      }
    });
  });
});
