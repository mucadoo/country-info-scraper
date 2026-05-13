import { Country } from '../../types/country.js';
import { ExtractionUtils } from '../utils/extraction.js';

export function parseWikilinks(raw: string): Array<{ articleId: string | null, text: string }> {
  const segments = raw.split(/<br\s*\/?>|\n|\*|\{\{plainlist|\|\|\}\}/gi).map(s => s.trim()).filter(s => s.length > 0);
  return segments.map(segment => {
    const linkMatch = segment.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
    if (linkMatch) {
      return { articleId: linkMatch[1], text: linkMatch[2] || linkMatch[1] };
    }
    const cleanText = segment.replace(/'''|''|\{\{[^}]+\}\}/g, '').trim();
    return { articleId: null, text: cleanText };
  });
}

/* eslint-disable @typescript-eslint/no-unused-vars */
export function parseInfoboxFromWikitext(wikitext: string, _lang: string): Partial<Country> {
  const infoboxBody = extractInfoboxBody(wikitext);
  if (!infoboxBody) return {};

  const fields = parseFields(infoboxBody);
  const result: Partial<Country> = {};

  const FIELD_MAP = {
    capital: ['capital'],
    largestCity: ['largest_city', 'largest_settlement'],
    population: ['population_estimate', 'population_census', 'population_total', 'population'],
    areaKm2: ['area_km2', 'area_sqkm', 'area'],
    densityKm2: ['density_km2', 'population_density_km2'],
    government: ['government_type'],
    officialLanguage: ['official_languages', 'languages_type', 'languages'],
    currency: ['currency'],
    timeZone: ['timezone', 'utc_offset', 'time_zone'],
    callingCode: ['calling_code'],
    internetTld: ['cctld'],
    hdi: ['hdi'],
    gdp: ['gdp_nominal'],
    flagUrl: ['flag_image', 'flag'],
    isoCode: ['iso3166code', 'cctld'],
  };

  const getField = (keys: string[]) => {
    for (const key of keys) {
      if (fields[key] !== undefined) return fields[key];
    }
    return undefined;
  };

  // Parsing logic
  const rawPopulation = getField(FIELD_MAP.population);
  if (rawPopulation) {
    const val = ExtractionUtils.extractPopulation(rawPopulation);
    if (val) result.population = parseInt(val, 10);
  }

  const rawArea = getField(FIELD_MAP.areaKm2);
  if (rawArea) {
    const val = ExtractionUtils.extractArea(rawArea);
    if (val) result.areaKm2 = parseFloat(val);
  }

  const rawHdi = getField(FIELD_MAP.hdi);
  if (rawHdi) {
    const match = rawHdi.match(/0\.\d{3}/);
    if (match) result.hdi = parseFloat(match[0]);
  }

  const rawGdp = getField(FIELD_MAP.gdp);
  if (rawGdp) {
    result.gdp = parseNumericValue(rawGdp);
  }

  const rawIso = getField(FIELD_MAP.isoCode);
  if (rawIso) {
    const match = rawIso.match(/\b[a-zA-Z]{2}\b/);
    if (match) result.isoCode = match[0].toUpperCase();
  }

  const rawCallingCode = getField(FIELD_MAP.callingCode);
  if (rawCallingCode) {
    result.callingCode = rawCallingCode.split(/[;,]/).map(s => s.trim()).filter(s => s.length > 0);
  }

  const rawTld = getField(FIELD_MAP.internetTld);
  if (rawTld) {
    result.internetTld = rawTld.split(/[;,]/).map(s => s.trim()).filter(s => s.length > 0);
  }

  result.flagUrl = null; // TODO: Implement thumbnail URL construction

  return result;
}

function extractInfoboxBody(wikitext: string): string | null {
  const startIdx = wikitext.toLowerCase().indexOf('{{infobox');
  if (startIdx === -1) return null;

  let i = startIdx;
  while (i < wikitext.length && wikitext[i] !== '{') i++;
  i += 2; // skip {{
  
  let braceCount = 2;
  let body = '';
  while (i < wikitext.length && braceCount > 0) {
    if (wikitext.substr(i, 2) === '{{') {
      braceCount += 2;
      i += 2;
    } else if (wikitext.substr(i, 2) === '}}') {
      braceCount -= 2;
      i += 2;
    } else {
      body += wikitext[i];
      i++;
    }
  }
  return body;
}

function parseFields(body: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const lines = body.split('\n');
  for (const line of lines) {
    const pipeIdx = line.indexOf('|');
    const eqIdx = line.indexOf('=');
    if (pipeIdx !== -1 && eqIdx !== -1 && eqIdx > pipeIdx) {
      const key = line.substring(pipeIdx + 1, eqIdx).trim().toLowerCase();
      const value = line.substring(eqIdx + 1).trim();
      fields[key] = value;
    }
  }
  return fields;
}

function parseNumericValue(text: string): number | null {
  const cleaned = text.replace(/[^0-9,.]/g, '');
  if (!cleaned) return null;
  const match = cleaned.match(/([0-9.,]+)/);
  if (!match) return null;
  const numStr = match[1];
  
  // Basic heuristic for common formats
  if (numStr.includes(',') && numStr.includes('.')) {
    return numStr.indexOf(',') < numStr.indexOf('.') 
      ? parseFloat(numStr.replace(/,/g, ''))
      : parseFloat(numStr.replace(/\./g, '').replace(',', '.'));
  }
  if (numStr.includes(',')) {
    return numStr.split(',').length === 2 && numStr.split(',')[1].length === 3
      ? parseFloat(numStr.replace(/,/g, ''))
      : parseFloat(numStr.replace(',', '.'));
  }
  return parseFloat(numStr);
}
