# 🌍 WikiGeoData Scraper

[![Build Status](https://github.com/mucadoo/wikigeo-data-scraper/actions/workflows/publish-data.yml/badge.svg)](https://github.com/mucadoo/wikigeo-data-scraper/actions/workflows/publish-data.yml)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Languages](https://img.shields.io/badge/Languages-EN%20%7C%20PT%20%7C%20FR%20%7C%20IT%20%7C%20ES-success)](https://github.com/mucadoo/wikigeo-data-scraper)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?logo=typescript)](https://www.typescriptlang.org/)

A modern, high-performance TypeScript-based web scraper that extracts comprehensive geographical and political information from Wikipedia. It doesn't just scrape text; it **translates and links entities** across 5 different languages to build a unified, high-quality geographical dataset.

---

## 📌 Table of Contents
- [🔥 Key Features](#-key-features)
- [📦 Live Data Access](#-live-data-access)
- [📊 Sample Data Format](#-sample-data-format)
- [🏗️ How it Works](#️-how-it-works)
- [🛠️ Development & Tooling](#️-development--tooling)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)

---

## 🔥 Key Features

- 🚀 **High Performance**: Uses [Crawlee](https://crawlee.dev/) and **CheerioCrawler** for rapid, lightweight HTML parsing.
- 🌐 **Deep Localization**: Automatically follows interlanguage links to extract data (descriptions, capitals, currencies, etc.) in **English, Portuguese, French, Italian, and Spanish**.
- 🛡️ **Data Integrity**: Every scrape is validated against strict **Zod Schemas**. Zero tolerance for `NaN`, missing critical fields, or Wikipedia artifacts.
- 📸 **Snapshot Testing**: Industry-standard regression suite using local HTML snapshots to ensure extraction logic never breaks.
- 🔗 **Linked Entities**: All list items (Capitals, Languages, Currencies) include their Wikipedia `articleId` for easy cross-referencing.
- 📉 **Optimized Output**: High-quality JSON and minified versions ready for production use.

## 📦 Live Data Access

This repository serves as a **Public Data Resource**. You can integrate the live JSON directly into your applications:

- **Full Dataset**: [sovereign-states.json](https://mucadoo.github.io/wikigeo-data-scraper/sovereign-states.json)
- **Minified**: [sovereign-states.min.json](https://mucadoo.github.io/wikigeo-data-scraper/sovereign-states.min.json)

## 📊 Sample Data Format

Our schema unifies multilingual data into a single, clean object using `camelCase` keys:

```json
{
  "metadata": {
    "generatedAt": "2026-05-11T19:54:00Z",
    "version": "1.0.2",
    "license": "ISC",
    "source": "Wikipedia"
  },
  "data": [
    {
      "isoCode": "FR",
      "name": {
        "en": "France",
        "pt": "França",
        "fr": "France",
        "it": "Francia",
        "es": "Francia"
      },
      "capital": [
        {
          "articleId": "Paris",
          "name": {
            "en": "Paris",
            "pt": "Paris",
            "fr": "Paris",
            "it": "Parigi",
            "es": "París"
          }
        }
      ],
      "officialLanguage": [
        {
          "articleId": "French_language",
          "name": {
            "en": "French",
            "pt": "Língua francesa",
            "fr": "Français",
            "it": "Lingua francese",
            "es": "Idioma francés"
          }
        }
      ],
      "currency": [
        {
          "articleId": "Euro",
          "isoCode": "EUR",
          "name": {
            "en": "Euro",
            "pt": "Euro",
            "fr": "Euro",
            "it": "Euro",
            "es": "Euro"
          }
        }
      ],
      "population": 68373000
    }
  ]
}
```

## 🚀 Roadmap

We are constantly improving the dataset to reach the "gold standard". Future updates include:

- [ ] **ISO 3166-1 alpha-3**: Adding 3-letter country codes (e.g., `FRA`).
- [ ] **IANA Time Zone IDs**: Mapping Wikipedia time zones to standard IDs (e.g., `Europe/Paris`).

## 🏗️ How it Works

The scraper follows a sophisticated multi-stage pipeline:

1.  **Discovery**: Scans the Wikipedia "List of sovereign states" to identify all target countries.
2.  **Multilingual Mapping**: Uses the Wikipedia API to find the corresponding page titles in all 5 target languages.
3.  **Concurrent Extraction**:
    -   **English Infobox**: Extracts structured data (population, area, ISO codes).
    -   **Localized Descriptions**: Extracts the first paragraph from each language's Wikipedia page.
    -   **Entity Translation**: Identifies linked entities (like "Paris") and fetches their names in all languages via the API.
4.  **Merging**: Unifies all data points into a single schema, prioritizing localized names.
5.  **Validation**: Runs a suite of quality checks (Audit + Localization) before saving.

## 🛠️ Development & Tooling

### Prerequisites
- **Node.js 20+**
- **npm**

### Essential Commands
```bash
# Install dependencies
npm install

# Build the project (SDK & Source)
npm run build
npm run build:sdk

# Run the full scraper
npm run scrape

# Run data quality validation (Audit + Localization check)
npm run validate

# Run tests
npm test
```

## 🤝 Contributing

We welcome contributions! Whether you're fixing a regex, adding a new language, or improving the schema, here's how to help:

### 1. Development Workflow
1. **Fork & Clone**: Get the repo locally.
2. **Snapshot-First**: If you're fixing extraction for a specific country, use the debug script:
   ```bash
   npx tsx scripts/debug-extraction-flow.ts "Country Name"
   ```
3. **Validate**: Always run `npm run validate` and `npm test` before submitting. We have zero tolerance for linting errors or broken tests.

### 2. Quality Gates
We use a **Validation-Gated Deployment** strategy:
- **Linting**: Strict ESLint rules to keep the code clean.
- **Audit**: `scripts/audit-data.ts` checks for `NaN`, citation brackets, and data suspiciousness.
- **Localization**: `scripts/verify-localization.ts` ensures 100% translation coverage across all target languages.

### 3. Adding New Data Types
If you want to extract new fields (e.g., "Coastline length"), you'll need to update:
1. `src/types/country.ts`: The Zod schema.
2. `src/parsers/infobox/standard-fields.ts`: The extraction logic.
3. `tests/snapshots/`: Update snapshots to include relevant pages.

## 📜 License

This project is licensed under the **ISC License**. The data generated by this scraper is free to use for any purpose.
