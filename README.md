# 🌍 WikiGeo Data Scraper & SDK

[![CI and Data Publishing](https://github.com/mucadoo/wikigeo-data-scraper/actions/workflows/publish-data.yml/badge.svg)](https://github.com/mucadoo/wikigeo-data-scraper/actions)
[![NPM Version](https://img.shields.io/npm/v/@mucadoo/wiki-geo-data)](https://www.npmjs.com/package/@mucadoo/wiki-geo-data)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An automated, daily-updated geographical dataset of sovereign states, scraped from Wikipedia across 5 languages (**English, Portuguese, French, Italian, Spanish**).

## 🚀 Consumption Options

This project provides multiple ways to access the data, depending on your needs.

### 1. TypeScript SDK (Recommended for Web/Node)

The SDK provides a type-safe client with support for **Pinned (Local)** or **Live (Remote)** data sources.

```bash
npm install @mucadoo/wiki-geo-data
```

#### Basic Usage

```typescript
import { WikiGeoClient } from '@mucadoo/wiki-geo-data';

// 'local' uses the data bundled with the package (pinned version)
// 'remote' fetches the latest daily updates from the live API
const client = new WikiGeoClient({ dataSource: 'local' });

// 1. Get a lightweight list of all countries
const countries = await client.listCountries();
// Returns: { isoCode: string, name: LocalizedField, flagUrl: string }[]

// 2. Get full details for a specific country by ISO code
const france = await client.getCountry('FR');
console.log(france.name.fr); // "France"
console.log(france.capital[0].name.en); // "Paris"

// 3. Bulk Export: Get the entire database in one request
// Best for rankings, data science, or building an offline search index.
const allData = await client.getFullDatabase();
console.log(`Loaded ${allData.length} countries with full details.`);
```

#### Data Sources

| Mode | Description | Reliability |
| :--- | :--- | :--- |
| `local` (Default) | Uses the `sovereign-states.json` file bundled in your `node_modules`. | **High.** Immutable until you update the package. Works offline. |
| `remote` | Fetches JSON files from GitHub Pages. | **Dynamic.** Always reflects the latest daily crawl from Wikipedia. |

### 2. Static REST API (No SDK required)

Perfect for mobile apps or simple fetch calls.

- **Index:** `https://mucadoo.github.io/wikigeo-data-scraper/api/v1/index.json`
- **Bulk Export:** `https://mucadoo.github.io/wikigeo-data-scraper/api/v1/all.json`
- **Country Detail:** `https://mucadoo.github.io/wikigeo-data-scraper/api/v1/countries/{ISO_CODE}.json` (e.g., `BR.json`, `US.json`)

### 3. Bulk Data Files

For data science, analytics, or spreadsheet use:

- **JSON (Full):** `sovereign-states.json` (Includes metadata)
- **JSON (Minified):** `sovereign-states.min.json`
- **CSV:** `sovereign-states.csv` (Ideal for Excel/Pandas)

## 🛠 Data Contract & Documentation

We use Zod to enforce a strict data contract.

  - 📖 [Data Model Dictionary](data/DATA_MODEL.md) - Explanations for every field.
  - 📜 [JSON Schema](data/schema.json) - For technical validation.

## 🔄 Versioning Strategy

  - Data Snapshots: New snapshots are generated daily. Check the GitHub Releases for historical data-YYYY.MM.DD tags.
  - SDK (SemVer): The NPM package follows Semantic Versioning. A patch version is released every time the data changes.
      - Use `dataSource: 'local'` to pin your data to the version of the SDK you installed.
      - Use `dataSource: 'remote'` to always get the live daily update from GitHub Pages.

## ⚖️ License & Attribution

  - Code: MIT License.
  - Data: Derived from Wikipedia. Data is available under Creative Commons Attribution-ShareAlike License. You must attribute Wikipedia and the contributors of this project.

Generated automatically by a team of Scraper Bots 🤖
