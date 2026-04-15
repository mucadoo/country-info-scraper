package com.countryinfoscraper;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.junit.jupiter.api.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;

public class WebScraperTest {
    private static final Logger logger = LoggerFactory.getLogger(WebScraperTest.class);

    @Test
    public void testExtractArea() {
        assertEquals("123456.78", ExtractionUtils.extractArea("123,456.78 <sup"));
        assertEquals("123456.78", ExtractionUtils.extractArea("123,456.78&nbsp;km<sup>2</sup>"));
    }

    @Test
    public void testExtractPopulation() {
        assertEquals("1000000", ExtractionUtils.extractPopulation("1,000,000 (2021 estimate)"));
        assertEquals("1500000", ExtractionUtils.extractPopulation("1-2 million"));
    }

    @Test
    public void testExtractDensity() {
        assertEquals("50", ExtractionUtils.extractDensity("50 <sup class=\"reference\">[1]</sup> / km<sup>2</sup>"));
        assertEquals("100", ExtractionUtils.extractDensity("100 / km<sup>2</sup>"));
    }

    @Tag("live-watcher")
    @TestFactory
    @DisplayName("Wikipedia Watcher: All Countries")
    Stream<DynamicTest> watchAllWikipediaCountries() throws IOException {
        logger.info("Fetching country list for watcher test...");
        Document doc = Jsoup.connect("https://en.wikipedia.org/wiki/List_of_sovereign_states").get();
        Element table = doc.select("table.wikitable").first();
        assertNotNull(table, "Country list table not found!");

        Elements rows = table.select("tbody > tr");
        List<String[]> countryLinks = new ArrayList<>();

        for (Element row : rows) {
            Elements cols = row.select("td");
            if (!cols.isEmpty()) {
                Element link = cols.get(0).select("a").first();
                if (link != null) {
                    String name = link.text();
                    String url = "https://en.wikipedia.org" + link.attr("href");
                    countryLinks.add(new String[]{name, url});
                }
            }
        }

        return countryLinks.stream().map(data -> {
            String name = data[0];
            String url = data[1];

            return DynamicTest.dynamicTest("Watching: " + name, () -> {
                logger.debug("Validating country: {}", name);
                Document countryDoc = Jsoup.connect(url)
                        .timeout(15000) 
                        .get();
                
                Country country = CountryParser.parseCountry(countryDoc);
                country.setName(name);

                assertAll(name + " validation failed",
                    () -> assertNotNull(country.getName(), "Name is null"),
                    () -> assertFalse(country.getName().isEmpty(), "Name is empty"),
                    
                    () -> assertNotNull(country.getCapital(), "Capital is null"),
                    () -> assertFalse(country.getCapital().isEmpty(), "Capital is empty"),
                    
                    () -> assertTrue(country.getPopulation() >= 0, "Population invalid: " + country.getPopulation()),
                    () -> assertTrue(country.getAreaKm2() >= 0, "Area invalid: " + country.getAreaKm2()),
                    
                    () -> assertNotNull(country.getFlagUrl(), "Flag URL is null"),
                    () -> assertTrue(country.getFlagUrl().startsWith("https://"), "Flag URL invalid: " + country.getFlagUrl()),
                    
                    () -> assertNotNull(country.getCurrency(), "Currency is null"),
                    () -> assertFalse(country.getCurrency().isEmpty(), "Currency is empty"),
                    
                    () -> assertNotNull(country.getDescription(), "Description is null"),
                    () -> assertTrue(country.getDescription().length() > 20, "Description too short"),

                    () -> {
                        if (country.getIsoCode() != null && !country.getIsoCode().isEmpty()) {
                            assertTrue(country.getIsoCode().length() >= 2, "ISO Code too short: " + country.getIsoCode());
                        } else {
                            logger.warn("ISO Code missing for {}", name);
                        }
                    },
                    () -> {
                        if (country.getCallingCode() != null && !country.getCallingCode().isEmpty()) {
                            assertTrue(country.getCallingCode().matches(".*\\d+.*"), "Calling code should contain numbers: " + country.getCallingCode());
                        }
                    },
                    () -> {
                        if (country.getInternetTld() != null && !country.getInternetTld().isEmpty()) {
                            assertTrue(country.getInternetTld().contains("."), "Internet TLD should contain a dot: " + country.getInternetTld());
                        }
                    },
                    () -> assertNotNull(country.getOfficialLanguage(), "Official language field is null"),
                    () -> assertNotNull(country.getGovernment(), "Government field is null")
                );
            });
        });
    }
}