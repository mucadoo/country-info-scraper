package com.countryinfoscraper;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Objects;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;

public class CountryParserRegressionTest {

    /**
     * This test runs against locally saved HTML files.
     * It ensures that parsing logic remains consistent even when offline.
     */
    @ParameterizedTest(name = "Regression Test: {0}")
    @MethodSource("provideLocalHtmlFiles")
    @DisplayName("Local Parser Regression")
    void testParsingLocalHtml(String countryName, String filePath) throws IOException {
        File htmlFile = new File(filePath);
        
        // Skip if the user hasn't downloaded the file yet
        Assumptions.assumeTrue(htmlFile.exists(), "Snapshot file missing: " + filePath);

        Document doc = Jsoup.parse(htmlFile, StandardCharsets.UTF_8.name());
        Country country = CountryParser.parseCountry(doc);
        country.setName(countryName);

        // Assertions based on known stable data for these snapshots
        assertNotNull(country.getName());
        assertFalse(country.getCapital().isEmpty(), "Capital should be extracted from " + countryName);
        assertTrue(country.getPopulation() > 0, "Population should be extracted from " + countryName);
        assertFalse(country.getDescription().isEmpty(), "Description should be extracted from " + countryName);
    }

    private static Stream<Arguments> provideLocalHtmlFiles() {
        String baseDir = "src/test/resources/snapshots/";
        return Stream.of(
            Arguments.of("United States", baseDir + "united_states.html"),
            Arguments.of("France", baseDir + "france.html"),
            Arguments.of("Brazil", baseDir + "brazil.html")
        );
    }
}
