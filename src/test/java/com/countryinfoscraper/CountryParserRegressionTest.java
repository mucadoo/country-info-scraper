package com.countryinfoscraper;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;

public class CountryParserRegressionTest {

    @ParameterizedTest(name = "Regression Test: {0}")
    @MethodSource("provideLocalHtmlFiles")
    @DisplayName("Local Parser Regression")
    void testParsingLocalHtml(String countryName, String filePath) throws IOException {
        File htmlFile = new File(filePath);
        Assumptions.assumeTrue(htmlFile.exists(), "Snapshot file missing: " + filePath);

        Document doc = Jsoup.parse(htmlFile, StandardCharsets.UTF_8.name());
        Country country = CountryParser.parseCountry(doc);
        country.setName(countryName);

        assertAll("Validation for " + countryName,
            () -> assertNotNull(country.getName(), "Name should not be null"),
            () -> {
                if (!countryName.equals("Nauru") && !countryName.equals("Monaco") && !countryName.equals("Vatican City")) {
                    assertFalse(country.getCapital() == null || country.getCapital().isEmpty(), 
                        () -> "Capital should not be empty for " + countryName + ". Extracted: '" + country.getCapital() + "'");
                    assertFalse(country.getCapital().contains("°") || country.getCapital().contains("′"), 
                        () -> "Capital contains raw coordinates! Extracted: '" + country.getCapital() + "'");
                }
            },
            () -> assertTrue(country.getPopulation() > 0, 
                () -> "Population should be > 0. Extracted: " + country.getPopulation() + " for " + countryName),
            () -> assertTrue(country.getAreaKm2() > 0.0, 
                () -> "Area should be > 0.0. Extracted: " + country.getAreaKm2() + " for " + countryName),
            () -> assertFalse(country.getDescription().isEmpty(), 
                () -> "Description should not be empty for " + countryName),
            () -> assertTrue(country.getFlagUrl() != null && country.getFlagUrl().startsWith("https://"), 
                () -> "Flag URL invalid. Extracted: '" + country.getFlagUrl() + "' for " + countryName),
            () -> assertFalse(country.getFlagUrl().toLowerCase().contains("arms") || 
                              country.getFlagUrl().toLowerCase().contains("seal"), 
                () -> "Extracted a coat of arms/seal instead of the flag! Extracted: '" + country.getFlagUrl() + "' for " + countryName),
            () -> assertFalse(country.getDemonym().matches(".*[a-z][A-Z].*"), 
                () -> "Demonyms are missing spaces between words! Extracted: '" + country.getDemonym() + "' for " + countryName),
            () -> assertFalse(country.getOfficialLanguage().matches("^\\d+\\s+languages.*"), 
                () -> "Language list includes numerical summary prefix! Extracted: '" + country.getOfficialLanguage() + "' for " + countryName),
            () -> {
                // List of countries that should have an official language but were failing
                List<String> expectedLanguages = List.of("Argentina", "Australia", "Bahrain", "Bangladesh", "Brazil", "France", "Japan", "Moldova", "Russia", "São Tomé and Príncipe", "Sri Lanka", "Ukraine", "Yemen");
                if (expectedLanguages.contains(countryName)) {
                    assertFalse(country.getOfficialLanguage().isEmpty(), () -> "Official language should not be empty for " + countryName);
                }
            },
            () -> assertFalse(country.getOfficialLanguage().equals("federal level"), 
                () -> "Extracted footnote text instead of language data for " + countryName),
            () -> assertFalse(country.getCallingCode().contains("["), 
                () -> "Calling code contains raw footnote brackets! Extracted: '" + country.getCallingCode() + "' for " + countryName),
            () -> {
                if (!countryName.equals("Vatican City")) {
                    assertFalse(country.getGdp().isEmpty(), () -> "GDP is missing for " + countryName);
                }
            },
            () -> {
                if (!countryName.equals("Afghanistan")) {
                    assertFalse(country.getCallingCode().isEmpty(), () -> "Calling code is missing for " + countryName);
                }
            }
        );
        
        // Specific edge case validations based on previous data quirks
        if (countryName.equals("Denmark")) {
            assertTrue(country.getAreaKm2() > 40000, 
                () -> "Denmark area should be > 40,000. Extracted: " + country.getAreaKm2());
            assertEquals("Danish", country.getDemonym(), "Denmark demonym should be Danish");
        }
        if (countryName.equals("Canada")) {
            assertTrue(country.getAreaKm2() > 9000000, 
                () -> "Canada area should be ~9.9 million. Extracted: " + country.getAreaKm2());
        }
        if (countryName.equals("Russia")) {
            assertTrue(country.getAreaKm2() > 17000000, 
                () -> "Russia area should be ~17 million. Extracted: " + country.getAreaKm2());
        }
        if (countryName.equals("China")) {
            assertTrue(country.getCallingCode().contains("+86"), 
                () -> "China calling code should be +86. Extracted: '" + country.getCallingCode() + "'");
            assertFalse(country.getInternetTld().isEmpty(), "China should have Internet TLD");
            assertTrue(country.getPopulation() > 1000000000L, 
                () -> "China population should be > 1 billion. Extracted: " + country.getPopulation());
        }
        if (countryName.equals("Indonesia")) {
            assertTrue(country.getPopulation() > 250000000, 
                () -> "Indonesia population should be > 250 million. Extracted: " + country.getPopulation());
            assertTrue(country.getAreaKm2() > 1800000, 
                () -> "Indonesia area should be > 1.8 million. Extracted: " + country.getAreaKm2());
        }
        if (countryName.equals("Kiribati")) {
            assertFalse(country.getDescription().contains("truncated"), "Kiribati description should not contain truncation markers");
            assertFalse(country.getDescription().contains(" characters)"), "Kiribati description should not contain truncation markers");
        }
        if (countryName.equals("Monaco")) {
            assertTrue(country.getAreaKm2() < 3.0, 
                () -> "Monaco's area should be tiny. Extracted: " + country.getAreaKm2());
        }
        if (countryName.equals("Switzerland")) {
            assertTrue(country.getOfficialLanguage().contains("German"), 
                () -> "Switzerland languages missing German. Extracted: '" + country.getOfficialLanguage() + "'");
        }
        if (countryName.equals("Ethiopia")) {
            assertTrue(country.getOfficialLanguage().contains("Amharic"), "Ethiopia language should contain Amharic");
            assertFalse(country.getOfficialLanguage().contains("Federalih"), "Ethiopia language should not contain country name");
        }
        if (countryName.equals("Norway")) {
            assertTrue(country.getOfficialLanguage().contains("Norwegian"), "Norway language should contain Norwegian");
            assertFalse(country.getOfficialLanguage().contains("gonagasriika"), "Norway language should not contain country name");
        }
        if (countryName.equals("South Africa")) {
            assertTrue(country.getOfficialLanguage().contains("Afrikaans") || country.getOfficialLanguage().contains("Zulu"), "South Africa language missing primary languages");
            assertFalse(country.getOfficialLanguage().contains("Republiek"), "South Africa language should not contain country name");
        }
        if (countryName.equals("Spain")) {
            assertTrue(country.getOfficialLanguage().contains("Spanish"), "Spain language should contain Spanish");
        }
        if (countryName.equals("Bosnia and Herzegovina")) {
            assertTrue(country.getOfficialLanguage().contains("Bosnian"), "Bosnia language should contain Bosnian");
        }
        if (countryName.equals("Zimbabwe")) {
            assertTrue(country.getOfficialLanguage().contains("English") || country.getOfficialLanguage().contains("languages"), 
                () -> "Zimbabwe languages missing English or languages. Extracted: '" + country.getOfficialLanguage() + "'");
            assertTrue(country.getCurrency().contains("dollar"), 
                () -> "Zimbabwe currency missing dollar. Extracted: '" + country.getCurrency() + "'");
        }
        if (countryName.equals("Mauritania")) {
            assertTrue(country.getPopulation() < 10000000, 
                () -> "Mauritania population should be < 10 million. Extracted: " + country.getPopulation());
        }
        if (countryName.equals("United States")) {
            assertTrue(country.getAreaKm2() > 9000000, 
                () -> "United States area should be ~9.8 million km2. Extracted: " + country.getAreaKm2());
        }
        if (countryName.equals("Liberia")) {
            assertTrue(country.getAreaKm2() > 100000, 
                () -> "Liberia area should be ~111k km2. Extracted: " + country.getAreaKm2());
        }
    }

    private static Stream<Arguments> provideLocalHtmlFiles() {
        String baseDir = "src/test/resources/snapshots/";
        File folder = new File(baseDir);
        if (!folder.exists() || folder.listFiles() == null) {
            return Stream.empty();
        }
        
        return Stream.of(folder.listFiles())
            .filter(f -> f.getName().endsWith(".html"))
            .map(f -> {
                String fileName = f.getName().replace(".html", "");
                // Reconstruct a readable name from the snake_case filename
                String[] parts = fileName.split("_");
                StringBuilder sb = new StringBuilder();
                for (String part : parts) {
                    if (part.length() > 0) {
                        sb.append(Character.toUpperCase(part.charAt(0)))
                          .append(part.substring(1))
                          .append(" ");
                    }
                }
                String countryName = sb.toString().trim();
                // Special fixes for names that don't match exactly
                if (countryName.equals("Vatican City")) countryName = "Vatican City";
                if (countryName.equals("The Gambia")) countryName = "Gambia, The";
                
                return Arguments.of(countryName, f.getAbsolutePath());
            });
    }
}
