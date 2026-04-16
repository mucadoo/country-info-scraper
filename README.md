# Country Info Scraper

A modern, high-performance Java-based web scraper that extracts comprehensive information about sovereign states from Wikipedia and publishes it as a live JSON API.

## Overview

This project scrapes the [Wikipedia List of sovereign states](https://en.wikipedia.org/wiki/List_of_sovereign_states) and traverses each country's individual page to collect detailed metadata. The system is designed for **high reliability**, **performance**, and **automated delivery**.

## Project Status & Roadmap

This is an **ongoing project**. We are actively working on:
- **Multilanguage Support**: Expanding the scraper to extract data from various language versions of Wikipedia.
- **Data Consistency**: Improving extraction algorithms to handle the diversity of Wikipedia page structures more reliably and consistently.

## Features

- **High Performance**: Uses Java 21 parallel streams and custom thread pools for rapid scraping.
- **Resilient**: Implements automatic retries with exponential backoff and connection timeouts.
- **Data Integrity**: Every scrape is validated against a **JSON Schema** before publication.
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
    "gdp": "$3.130 trillion",
    "hdi": "0.910",
    "currency": "Euro, CFP franc",
    "time_zone": "UTC+01:00 (CET)",
    "calling_code": "+33",
    "internet_TLD": ".fr"
  }
]
```

## Development

### Prerequisites
- **Java 21** or higher.
- **Maven 3.8+**.

### Build & Test
```bash
mvn clean install
```

### Running the Scraper Locally
```bash
mvn exec:java -Dexec.mainClass="com.countryinfoscraper.WebScraper"
```

### Testing Strategy
- **Unit Tests**: Verify extraction logic in `ExtractionUtils`.
- **Regression Tests**: Run against local HTML snapshots in `src/test/resources/snapshots`.
- **Wikipedia Watcher**: A dynamic test factory that checks all 200+ countries live to spot Wikipedia HTML changes.

## CI/CD Strategy: Validation-Gated Deployment

This project implements an industry-standard **Validation-Gated Deployment** pipeline. To ensure data reliability, the publishing process is strictly controlled by multiple quality gates.

### 1. Quality Gates
- **Code Verification**: Runs `mvn verify` to ensure all unit and regression tests pass before any scraping begins.
- **Schema Enforcement**: Every scraped dataset is validated against a strict [JSON Schema](src/main/resources/country-schema.json) using `ajv-cli`.
    - **Integrity Check**: Rejects updates if the number of countries drops suspiciously (min. 150 countries).
    - **Type Safety**: Enforces strict regex patterns for URLs and numeric constraints for population/area.
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
- `WebScraper`: Orchestrates the scraping and publication flow.
- `CountryParser`: Delegates parsing to `InfoboxParser` and `DescriptionParser`.
- `ExtractionUtils`: Clean, reusable regex-based extraction logic.
- `src/main/resources/country-schema.json`: The source of truth for data validation.

## License

Feel free to use the generated data and the code for your own projects!
