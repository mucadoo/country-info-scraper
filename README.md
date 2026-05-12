# 🌍 WikiGeo Data Scraper & SDK

[![CI and Data Publishing](https://github.com/mucadoo/wikigeo-data-scraper/actions/workflows/publish-data.yml/badge.svg)](https://github.com/mucadoo/wikigeo-data-scraper/actions)
[![NPM Version](https://img.shields.io/npm/v/@mucadoo/wiki-geo-data)](https://www.npmjs.com/package/@mucadoo/wiki-geo-data)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An automated, daily-updated geographical dataset of sovereign states, scraped from Wikipedia across 5 languages (**English, Portuguese, French, Italian, Spanish**).

## 🚀 Consumption Options

This project provides multiple ways to access the data, depending on your needs.

### 1. TypeScript SDK (Recommended for Web/Node)
The SDK provides a type-safe client with support for **Pinned (Local)** or **Live (Remote)** data.

```bash
npm install @mucadoo/wiki-geo-data

import { WikiGeoClient } from '@mucadoo/wiki-geo-data';

const client = new WikiGeoClient({ dataSource: 'local' });

// Get a list of countries (Fully typed)
const countries = await client.listCountries();

// Get full details for a specific country
const brazil = await client.getCountry('BR');
console.log(brazil.name.pt); // "Brasil"
```

### 2. Static REST API (No SDK required)

Perfect for mobile apps or simple fetch calls.

  - Index:
    https://mucadoo.github.io/wikigeo-data-scraper/api/v1/index.json
  - Country Detail:
    https://mucadoo.github.io/wikigeo-data-scraper/api/v1/countries/{ISO_CODE}.json

### 3. Bulk Data Files

For data science, analytics, or offline use:

  - JSON (Full): sovereign-states.json
  - CSV: sovereign-states.csv (Ideal for Excel/Pandas)

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
