import { describe, it, expect } from 'vitest';
import * as cheerio from 'cheerio';
import { ExtractionUtils } from '../src/utils/extraction.js';
import { parseListOrLink } from '../src/parsers/infobox/utils.js';
import { parseCurrency } from '../src/parsers/infobox/currency.js';

describe('ExtractionUtils', () => {
  // ... existing tests ...
  describe('extractArea', () => {
    it('should extract standard area with commas', () => {
      expect(ExtractionUtils.extractArea('1,234,567.8 km2')).toBe('1234567.8');
    });

    it('should extract area with km2 suffix', () => {
      expect(ExtractionUtils.extractArea('123.45 km2')).toBe('123.45');
    });

    it('should handle square miles fallback', () => {
      expect(ExtractionUtils.extractArea('100,000 sq mi')).toBe('100000');
    });

    it('should handle non-breaking spaces and unicode markers', () => {
      expect(ExtractionUtils.extractArea('1\u00A0234\u200E km\u00B2')).toBe('1234');
    });
  });

  describe('extractPopulation', () => {
    it('should extract single value with million', () => {
      expect(ExtractionUtils.extractPopulation('68.3 million')).toBe('68300000');
    });

    it('should extract single value with billion', () => {
      expect(ExtractionUtils.extractPopulation('1.4 billion')).toBe('1400000000');
    });

    it('should calculate average for range populations', () => {
      expect(ExtractionUtils.extractPopulation('1.2 – 1.4 million')).toBe('1300000');
    });

    it('should extract large numbers with commas', () => {
      expect(ExtractionUtils.extractPopulation('1,392,730,000')).toBe('1392730000');
    });

    it('should filter out year-like numbers', () => {
      expect(ExtractionUtils.extractPopulation('2024 estimate (1,234,567)')).toBe('1234567');
    });
  });

  describe('extractDensity', () => {
    it('should extract density values', () => {
      expect(ExtractionUtils.extractDensity('106.0 /km2')).toBe('106.0');
    });
  });

  describe('normalizeFlagUrl', () => {
    it('should normalize thumbnail size to 250px', () => {
      const url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Flag_of_France.svg/125px-Flag_of_France.svg.png';
      expect(ExtractionUtils.normalizeFlagUrl(url)).toBe('https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Flag_of_France.svg/250px-Flag_of_France.svg.png');
    });

    it('should prepend https if missing', () => {
      expect(ExtractionUtils.normalizeFlagUrl('//upload.wikimedia.org/test.png')).toBe('https://upload.wikimedia.org/test.png');
    });
  });
});

describe('Infobox Utilities', () => {
  describe('parseListOrLink', () => {
    it('should extract multiple links correctly', () => {
      const html = '<ul><li><a href="/wiki/Item_1">Item 1</a></li><li><a href="/wiki/Item_2">Item 2</a></li></ul>';
      const $ = cheerio.load(html);
      const result = parseListOrLink($('ul') as unknown as Parameters<typeof parseListOrLink>[0], 'li');
      expect(result).toEqual([
        { text: 'Item 1', articleId: 'Item_1' },
        { text: 'Item 2', articleId: 'Item_2' }
      ]);
    });

    it('should handle plain text fallbacks', () => {
      const html = '<div>Plain Text</div>';
      const $ = cheerio.load(html);
      const result = parseListOrLink($('div') as unknown as Parameters<typeof parseListOrLink>[0], 'li');
      expect(result).toEqual([{ text: 'Plain Text' }]);
    });

    it('should handle single link with complex href', () => {
      const html = '<a href="/wiki/Item_1#Anchor">Item 1</a>';
      const $ = cheerio.load(html);
      const result = parseListOrLink($('a') as unknown as Parameters<typeof parseListOrLink>[0], 'a');
      console.log('DEBUG result:', JSON.stringify(result));
      expect(result).toEqual([{ text: 'Item 1', articleId: 'Item_1#Anchor' }]);
    });
  });

  describe('parseCurrency', () => {
    it('should skip ISO 4217 links', () => {
      const html = '<div><a href="/wiki/Euro" title="Currency">Euro</a> (<a href="/wiki/ISO_4217" title="ISO 4217">ISO 4217</a>)</div>';
      const $ = cheerio.load(html);
      const result = parseCurrency($('div') as unknown as Parameters<typeof parseCurrency>[0]);
      expect(result).toEqual([{ text: 'Euro', articleId: 'Euro' }]);
    });

    it('should extract ISO code from text', () => {
      const html = '<div><a href="/wiki/Euro">Euro</a> (EUR)</div>';
      const $ = cheerio.load(html);
      const result = parseCurrency($('div') as unknown as Parameters<typeof parseCurrency>[0]);
      expect(result).toEqual([{ text: 'Euro', articleId: 'Euro', isoCode: 'EUR' }]);
    });
  });
});
