# Country Info Scraper

A Java-based web scraper that extracts comprehensive information about sovereign states from Wikipedia and exports it to JSON format.

## Overview

This project scrapes the [Wikipedia List of sovereign states](https://en.wikipedia.org/wiki/List_of_sovereign_states) and then traverses each country's individual page to collect detailed metadata from their infoboxes. The extracted data is cleaned, processed, and saved in both pretty-printed and minified JSON formats.

## Features

- **Automated Discovery**: Automatically finds all sovereign states listed on Wikipedia.
- **Deep Scraping**: Visits each country's specific page to extract detailed attributes.
- **Data Points Extracted**:
    - Basic Info: Name, ISO 3166 code, Flag URL, Description.
    - Geography: Capital, Largest city, Area (km²), Population, Population Density.
    - Governance: Government type, Official languages, Demonym.
    - Economy: GDP (nominal), HDI (Human Development Index), Currency.
    - Connectivity: Time zone, Calling code, Internet TLD.
- **Robust Parsing**: Handles complex Wikipedia infobox structures, removing citations, references, and unnecessary parenthetical information.
- **Dual Output**: Generates both `countries.json` (human-readable) and `countries.min.json` (optimized for production).

## Technologies Used

- **Java**: Core programming language.
- **Maven**: Project management and build tool.
- **Jsoup**: For HTML parsing and DOM manipulation.
- **Gson**: For JSON serialization and formatting.

## Prerequisites

- Java Development Kit (JDK) 8 or higher.
- Apache Maven.

## Setup & Usage

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/country-info-scraper.git
   cd country-info-scraper
   ```

2. **Build the project**:
   ```bash
   mvn clean install
   ```

3. **Run the scraper**:
   ```bash
   mvn exec:java -Dexec.mainClass="com.countryinfoscraper.WebScraper"
   ```

## Output

The scraper generates two files in `src/main/resources/`:

- `countries.json`: Pretty-printed JSON file for easy inspection.
- `countries.min.json`: Minified version for application use.

### Sample Data Format

```json
{
  "name": "France",
  "ISO_code": "FR",
  "flagUrl": "https://upload.wikimedia.org/wikipedia/en/thumb/c/c3/Flag_of_France.svg/...",
  "description": "France is a country located primarily in Western Europe...",
  "capital": "Paris",
  "largest_city": "Paris",
  "population": 68373000,
  "area_km2": 643801.0,
  "density_km2": 106.0,
  "government": "Unitary semi-presidential republic",
  "official_language": "French",
  "demonym": "French",
  "GDP": "$3.130 trillion",
  "HDI": "0.910",
  "currency": "Euro, CFP franc",
  "time_zone": "UTC+01:00 (CET)",
  "calling_code": "+33",
  "internet_TLD": ".fr"
}
```

## Project Structure

- `src/main/java/com/countryinfoscraper/WebScraper.java`: Main logic for scraping and data processing.
- `pom.xml`: Maven configuration and dependencies.
- `src/main/resources/`: Directory where the resulting JSON files are stored.

## License

[MIT License](LICENSE) (or specify your license)
