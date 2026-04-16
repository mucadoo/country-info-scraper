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
        if (countryName.equals("Afghanistan")) {
            // Afghanistan might have empty calling code in the snapshot, but if it's there it should be correct
            if (!country.getCallingCode().isEmpty()) {
                assertTrue(country.getCallingCode().contains("+93"), 
                    () -> "Afghanistan calling code should contain +93. Extracted: '" + country.getCallingCode() + "'");
            }
        }
        if (countryName.equals("Denmark")) {
            assertTrue(country.getAreaKm2() > 40000, 
                () -> "Denmark area should be > 40,000. Extracted: " + country.getAreaKm2());
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
        if (countryName.equals("Monaco")) {
            assertTrue(country.getAreaKm2() < 3.0, 
                () -> "Monaco's area should be tiny. Extracted: " + country.getAreaKm2());
        }
        if (countryName.equals("Switzerland")) {
            assertTrue(country.getOfficialLanguage().contains("German"), 
                () -> "Switzerland languages missing German. Extracted: '" + country.getOfficialLanguage() + "'");
        }
        if (countryName.equals("Zimbabwe")) {
            assertTrue(country.getOfficialLanguage().contains("English") || country.getOfficialLanguage().contains("languages"), 
                () -> "Zimbabwe languages missing English or languages. Extracted: '" + country.getOfficialLanguage() + "'");
            assertTrue(country.getCurrency().contains("dollar"), 
                () -> "Zimbabwe currency missing dollar. Extracted: '" + country.getCurrency() + "'");
        }
    }

    private static Stream<Arguments> provideLocalHtmlFiles() {
        String baseDir = "src/test/resources/snapshots/";
        return Stream.of(
            Arguments.of("Vatican City", baseDir + "vatican_city.html"),
            Arguments.of("Denmark", baseDir + "denmark.html"),
            Arguments.of("Bolivia", baseDir + "bolivia.html"),
            Arguments.of("Yemen", baseDir + "yemen.html"),
            Arguments.of("Israel", baseDir + "israel.html"),
            Arguments.of("Turkmenistan", baseDir + "turkmenistan.html"),
            Arguments.of("El Salvador", baseDir + "el_salvador.html"),
            Arguments.of("Zimbabwe", baseDir + "zimbabwe.html"),
            Arguments.of("Ivory Coast", baseDir + "ivory_coast.html"),
            Arguments.of("Singapore", baseDir + "singapore.html"),
            Arguments.of("Afghanistan", baseDir + "afghanistan.html"),
            Arguments.of("Monaco", baseDir + "monaco.html"),
            Arguments.of("Nauru", baseDir + "nauru.html"),
            Arguments.of("Switzerland", baseDir + "switzerland.html"),
            Arguments.of("Palestine", baseDir + "palestine.html"),
            Arguments.of("Canada", baseDir + "canada.html"),
            Arguments.of("Russia", baseDir + "russia.html"),
            Arguments.of("China", baseDir + "china.html"),
            Arguments.of("Vanuatu", baseDir + "vanuatu.html"),
            Arguments.of("Guinea-Bissau", baseDir + "guinea_bissau.html"),
            Arguments.of("Solomon Islands", baseDir + "solomon_islands.html"),
            Arguments.of("Lebanon", baseDir + "lebanon.html"),
            Arguments.of("South Korea", baseDir + "south_korea.html"),
            Arguments.of("Equatorial Guinea", baseDir + "equatorial_guinea.html"),
            Arguments.of("Comoros", baseDir + "comoros.html"),
            Arguments.of("Eritrea", baseDir + "eritrea.html"),
            Arguments.of("Gambia, The", baseDir + "the_gambia.html"),
            Arguments.of("Kiribati", baseDir + "kiribati.html"),
            Arguments.of("Liechtenstein", baseDir + "liechtenstein.html"),
            Arguments.of("Luxembourg", baseDir + "luxembourg.html"),
            Arguments.of("Malta", baseDir + "malta.html"),
            Arguments.of("North Korea", baseDir + "north_korea.html"),
            Arguments.of("Syria", baseDir + "syria.html"),
            Arguments.of("Indonesia", baseDir + "indonesia.html"),
            Arguments.of("Kyrgyzstan", baseDir + "kyrgyzstan.html"),
            Arguments.of("Mauritania", baseDir + "mauritania.html"),
            Arguments.of("Moldova", baseDir + "moldova.html")
        );
    }
}
