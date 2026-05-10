# Country Info Scraper

A modern, high-performance TypeScript-based web scraper that extracts comprehensive information about sovereign states from Wikipedia and publishes it as a live JSON API.

## Overview

This project scrapes the [Wikipedia List of sovereign states](https://en.wikipedia.org/wiki/List_of_sovereign_states) and traverses each country's individual page to collect detailed metadata. The system is designed for **high reliability**, **performance**, and **automated delivery** using the 2026 recommended stack: TypeScript, Node.js, Crawlee, and Zod.

## Project Status & Roadmap

This is an **ongoing project**. We are actively working on:
- **Multilanguage Support**: Expanding the scraper to extract data from various language versions of Wikipedia.
- **Data Consistency**: Improving extraction algorithms to handle the diversity of Wikipedia page structures more reliably and consistently.
- **Data Crossing**: Extending the architecture to join country data with other Wikipedia resources (Cities, Leaders, etc.) using an intermediate SQLite layer (`scraper.db`).

## Features

- **High Performance**: Uses **Crawlee** with **CheerioCrawler** for rapid, lightweight HTML parsing without the overhead of a full browser.
- **Resilient**: Implements automatic retries, request queuing, and state persistence.
- **Data Integrity**: Every scrape is validated against a strict **Zod Schema** before being stored or published.
- **Automated Delivery**:
    - **Live API**: Latest data is automatically published to a dedicated `data` branch.
    - **Historical Archive**: Daily snapshots are archived as GitHub Releases.
- **Data Points**: ISO Code, Flag, Capital, Population, Area, GDP, HDI, Currency, Time Zones, and more.

## Use it in your Projects! 🚀

This repository is a **Public Data Resource**. You don't need to run the scraper yourself to get the data. You can integrate the live JSON directly into your web or mobile applications.

### 1. Live Data (Always Latest)
Perfect for apps that need up-to-date country information:
- **JSON**: [https://mucadoo.github.io/country-info-scraper/countries.json](https://mucadoo.github.io/country-info-scraper/countries.json)
- **Minified**: [https://mucadoo.github.io/country-info-scraper/countries.min.json](https://mucadoo.github.io/country-info-scraper/countries.min.json)

### 2. Historical Snapshots
For researchers or projects requiring stable, versioned data, download a specific snapshot from the **[Releases](https://github.com/mucadoo/country-info-scraper/releases)** page.

## Sample Data Format

```json
[
  {
    "name": "France",
    "ISO_code": "FR",
    "flagUrl": "https://upload.wikimedia.org/wikipedia/commons/c/c3/Flag_of_France.svg",
    "description": "France is a country located primarily in Western Europe, consisting of metropolitan France and several overseas regions and territories.",
    "capital": "Paris",
    "largest_city": "Paris",
    "population": 68373000,
    "area_km2": 643801.0,
    "density_km2": 106.0,
    "government": "Unitary semi-presidential republic",
    "official_language": "French",
    "demonym": "French",
    "gdp": 3130000000000,
    "hdi": 0.910,
    "currency": "Euro, CFP franc",
    "time_zone": "UTC+01:00 (CET)",
    "calling_code": "+33",
    "internet_TLD": ".fr"
  }
]
```

## Development

### Prerequisites
- **Node.js 20+**
- **npm**

### Build & Test
```bash
npm install
npm run build
```

### Running the Scraper Locally
```bash
# Development mode (ts-node)
npm run start

# Production mode (after build)
npm run scrape
```

### Testing Strategy
- **Validation**: Every scrape is validated against a strict **Zod schema** in `src/types/country.ts`.
- **Wikipedia Watcher**: A scheduled GitHub Action job checks for Wikipedia HTML structure changes by running a limited scrape.

## CI/CD Strategy: Validation-Gated Deployment

This project implements an industry-standard **Validation-Gated Deployment** pipeline. To ensure data reliability, the publishing process is strictly controlled by multiple quality gates.

### 1. Quality Gates
- **Code Verification**: Runs `npm run build` and schema validation before any scraping begins.
- **Schema Enforcement**: Every scraped dataset is validated against a strict **Zod Schema** (defined in `src/types/country.ts`).
    - **Integrity Check**: Rejects updates if the number of countries drops suspiciously (min. 150 countries).
- **Change Detection**: The pipeline uses a `git diff` mechanism to compare new results with the current live data. If no meaningful changes are detected, it skips redundant releases.

### 2. The "Data Branch" Pattern
We use a dedicated, orphan `data` branch to store the scraped results. This provides several advantages:
- **Clean Main Branch**: The `main` branch remains focused strictly on the scraper's source code.
- **Immutable History**: Provides a full, Git-native audit trail of every data change over time.
- **High Availability**: Data is served directly from the `data` branch via GitHub Pages, acting as a stable, versioned API.

### 3. Automated Publishing Flow
The [Publish Workflow](.github/workflows/publish-data.yml) runs daily and handles:
- **Environment Context**: Automatically switches release naming between "Daily Snapshots" (scheduled) and "Automated Updates" (manual push).
- **GitHub Releases**: Packages the validated `countries.json` and `countries.min.json` as downloadable assets.
- **Deployment**: Synchronizes the `data` branch and updates the live API endpoints.

## Project Structure
- `src/main.ts`: Orchestrates the scraping and publication flow using Crawlee.
- `src/parsers/country-parser.ts`: Delegates parsing to `InfoboxParser` and `DescriptionParser`.
- `src/utils/extraction.ts`: Clean, reusable regex-based extraction logic.
- `src/types/country.ts`: Zod schema definitions.
- `scraper.db`: Intermediate SQLite storage for crossing data.

## License

Feel free to use the generated data and the code for your own projects!
