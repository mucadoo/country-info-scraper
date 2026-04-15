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
            () -> assertNotNull(country.getName()),
            () -> assertFalse(country.getCapital().isEmpty(), "Capital should not be empty"),
            () -> assertTrue(country.getPopulation() >= 0, "Population should be non-negative"),
            () -> assertFalse(country.getDescription().isEmpty(), "Description should not be empty"),
            () -> assertNotNull(country.getFlagUrl(), "Flag URL should be present")
        );
        
        // Specific edge case validations for problematic countries
        if (countryName.equals("South Africa")) {
            assertTrue(country.getCapital().contains("Pretoria") && country.getCapital().contains("Cape Town"), "South Africa should have multiple capitals");
        }
        if (countryName.equals("Bolivia")) {
            assertTrue(country.getCapital().contains("Sucre") && country.getCapital().contains("La Paz"), "Bolivia should have multiple capitals");
        }
        if (countryName.equals("Denmark")) {
            assertTrue(country.getAreaKm2() > 0, "Denmark's area should be extracted correctly");
            assertFalse(country.getCallingCode().contains("["), "Denmark's calling code should not contain brackets");
        }
        if (countryName.equals("Netherlands")) {
            assertFalse(country.getCurrency().isEmpty(), "Netherlands currency should not be empty");
            assertFalse(country.getInternetTld().isEmpty(), "Netherlands TLD should not be empty");
        }
        if (countryName.equals("Yemen")) {
            assertFalse(country.getCapital().contains("°"), "Yemen's capital should not contain coordinates");
        }
        if (countryName.equals("Israel")) {
            assertTrue(country.getAreaKm2() > 0, "Israel's area should be extracted correctly");
        }
        if (countryName.equals("Turkmenistan")) {
            assertTrue(country.getPopulation() > 0, "Turkmenistan's population should be extracted correctly");
        }
        if (countryName.equals("El Salvador")) {
            assertTrue(country.getCurrency().contains("Bitcoin") || country.getCurrency().contains("United States dollar"), "El Salvador's currency should include Bitcoin/USD");
        }
        if (countryName.equals("Zimbabwe")) {
            assertTrue(country.getOfficialLanguage().contains("languages"), "Zimbabwe should list multiple languages");
        }
        if (countryName.equals("Sri Lanka")) {
            assertTrue(country.getCapital().contains("Sri Jayawardenepura Kotte") && country.getCapital().contains("Colombo"), "Sri Lanka should have multiple capitals");
        }
        if (countryName.equals("Afghanistan")) {
            assertFalse(country.getCallingCode().isEmpty(), "Afghanistan should have a calling code");
        }
        if (countryName.equals("Sweden")) {
            assertFalse(country.getCallingCode().isEmpty(), "Sweden should have a calling code");
        }
    }

    private static Stream<Arguments> provideLocalHtmlFiles() {
        String baseDir = "src/test/resources/snapshots/";
        return Stream.of(
            Arguments.of("United States", baseDir + "united_states.html"),
            Arguments.of("France", baseDir + "france.html"),
            Arguments.of("India", baseDir + "india.html"),
            Arguments.of("Vatican City", baseDir + "vatican_city.html"),
            Arguments.of("South Africa", baseDir + "south_africa.html"),
            Arguments.of("Denmark", baseDir + "denmark.html"),
            Arguments.of("Netherlands", baseDir + "netherlands.html"),
            Arguments.of("Bolivia", baseDir + "bolivia.html"),
            Arguments.of("Yemen", baseDir + "yemen.html"),
            Arguments.of("Israel", baseDir + "israel.html"),
            Arguments.of("Turkmenistan", baseDir + "turkmenistan.html"),
            Arguments.of("El Salvador", baseDir + "el_salvador.html"),
            Arguments.of("Zimbabwe", baseDir + "zimbabwe.html"),
            Arguments.of("Sri Lanka", baseDir + "sri_lanka.html"),
            Arguments.of("Malaysia", baseDir + "malaysia.html"),
            Arguments.of("Ivory Coast", baseDir + "ivory_coast.html"),
            Arguments.of("Singapore", baseDir + "singapore.html"),
            Arguments.of("Afghanistan", baseDir + "afghanistan.html"),
            Arguments.of("Vietnam", baseDir + "vietnam.html"),
            Arguments.of("Sweden", baseDir + "sweden.html")
        );
    }
}
