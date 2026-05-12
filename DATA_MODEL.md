# Data Model Documentation

This document describes the structure of the sovereign state data provided by this project.

## Metadata
- **Versioning:** Automated from package.json version.
- **Supported Languages:** en, pt, fr, it, es

## Data Dictionary
| Field | Type | Description |
| :--- | :--- | :--- |
| `isoCode` | string | ISO 3166-1 alpha-2 code |
| `name` | Object | Localized name of the country |
| `flagUrl` | string | URL of the national flag |
| `description` | Object | Localized descriptive summary |
| `capital` | Array | List of capital city links |
| `largestCity` | Array | List of largest city links |
| `population` | number | Total population |
| `areaKm2` | number | Total area in square kilometers |
| `densityKm2` | number | Population density (people/km²) |
| `government` | Array | Type of government |
| `officialLanguage` | Array | Official languages |
| `demonym` | Array | Name of country residents |
| `gdp` | number | Nominal GDP (in millions USD) |
| `hdi` | number | Human Development Index |
| `currency` | Array | Official currency/ies |
| `timeZone` | Array | Time zones |
| `callingCode` | Array | International dialing codes |
| `internetTld` | Array | Country top-level domains |

*Note: All "Object" fields (e.g., `name`, `description`) are objects with keys for all supported languages (`en`, `pt`, `fr`, `it`, `es`). All "Array" fields contain objects with localized names and (where applicable) article identifiers.*
