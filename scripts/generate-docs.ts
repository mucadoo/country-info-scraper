import fs from 'fs';
import path from 'path';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { CountrySchema, LANGUAGES } from '../src/types/country.js';

const OUTPUT_DIR = 'data';
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 1. Generate schema.json
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const jsonSchema = zodToJsonSchema(CountrySchema as any, 'CountrySchema');
fs.writeFileSync(path.join(OUTPUT_DIR, 'schema.json'), JSON.stringify(jsonSchema, null, 2));

// 2. Generate DATA_MODEL.md
const mdContent = `# Data Model Documentation

This document describes the structure of the sovereign state data provided by this project.

## Metadata
- **Versioning:** Automated from package.json version.
- **Supported Languages:** ${LANGUAGES.join(', ')}

## Data Dictionary
| Field | Type | Description |
| :--- | :--- | :--- |
| \`isoCode\` | string | ISO 3166-1 alpha-2 code |
| \`name\` | Object | Localized name of the country |
| \`flagUrl\` | string | URL of the national flag |
| \`description\` | Object | Localized descriptive summary |
| \`capital\` | Array | List of capital city links |
| \`largestCity\` | Array | List of largest city links |
| \`population\` | number | Total population |
| \`areaKm2\` | number | Total area in square kilometers |
| \`densityKm2\` | number | Population density (people/km²) |
| \`government\` | Array | Type of government |
| \`officialLanguage\` | Array | Official languages |
| \`demonym\` | Array | Name of country residents |
| \`gdp\` | number | Nominal GDP (in millions USD) |
| \`hdi\` | number | Human Development Index |
| \`currency\` | Array | Official currency/ies |
| \`timeZone\` | Array | Time zones |
| \`callingCode\` | Array | International dialing codes |
| \`internetTld\` | Array | Country top-level domains |

*Note: All "Object" fields (e.g., \`name\`, \`description\`) are objects with keys for all supported languages (\`en\`, \`pt\`, \`fr\`, \`it\`, \`es\`). All "Array" fields contain objects with localized names and (where applicable) article identifiers.*
`;

fs.writeFileSync(path.join(OUTPUT_DIR, 'DATA_MODEL.md'), mdContent);

console.log('Successfully generated schema.json and DATA_MODEL.md in /data');
