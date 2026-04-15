package com.countryinfoscraper;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.networknt.schema.JsonSchema;
import com.networknt.schema.JsonSchemaFactory;
import com.networknt.schema.SpecVersion;
import com.networknt.schema.ValidationMessage;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.Semaphore;
import java.util.stream.Collectors;

public class WebScraper {
    private static final Logger logger = LoggerFactory.getLogger(WebScraper.class);
    private static final String USER_AGENT = "CountryInfoScraper/1.0 (https://github.com/mucadoo/country-info-scraper; your_email@example.com) Java/21";
    private static final int TIMEOUT_MS = Integer.parseInt(System.getProperty("scraper.timeout", "15000"));
    private static final int MAX_RETRIES = Integer.parseInt(System.getProperty("scraper.retries", "3"));
    private static final int PARALLELISM = Integer.parseInt(System.getProperty("scraper.parallelism", "10"));

    private final Semaphore semaphore = new Semaphore(PARALLELISM);

    public static void main(String[] args) {
        new WebScraper().run();
    }

    public void run() {
        try {
            logger.info("Starting scraper with parallelism: {}", PARALLELISM);
            Document doc = fetchWithRetry("https://en.wikipedia.org/wiki/List_of_sovereign_states");
            if (doc == null) return;

            Element table = doc.select("table.wikitable").first();
            if (table == null) {
                logger.error("Country list table not found!");
                return;
            }

            Elements rows = table.select("tbody > tr");

            List<Country> countries;
            ExecutorService executor = Executors.newFixedThreadPool(PARALLELISM);
            try {
                List<Future<Country>> futures = rows.stream()
                        .map(row -> executor.submit(() -> {
                            semaphore.acquire();
                            try {
                                return processRow(row);
                            } finally {
                                semaphore.release();
                            }
                        }))
                        .collect(Collectors.toList());

                countries = futures.stream()
                        .map(f -> {
                            try {
                                return f.get();
                            } catch (InterruptedException | ExecutionException e) {
                                logger.error("Failed to process row", e);
                                return null;
                            }
                        })
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());
            } finally {
                executor.shutdown();
            }

            validateSchema(serialize(countries, true));
            exportData(countries);

        } catch (Exception e) {
            logger.error("Scraping process failed", e);
        }
    }

    private Document fetchWithRetry(String url) {
        for (int i = 0; i < MAX_RETRIES; i++) {
            try {
                return Jsoup.connect(url).userAgent(USER_AGENT).timeout(TIMEOUT_MS).get();
            } catch (IOException e) {
                logger.warn("Attempt {} failed for {}: {}", i + 1, url, e.getMessage());
                try {
                    Thread.sleep(1000L * (i + 1));
                } catch (InterruptedException ignored) {
                    Thread.currentThread().interrupt();
                }
            }
        }
        return null;
    }

    private Country processRow(Element row) {
        Element link = row.select("td").first() != null ? row.select("td").first().select("a").first() : null;
        if (link == null) return null;

        String name = link.text();
        String url = "https://en.wikipedia.org" + link.attr("href");

        Document countryDoc = fetchWithRetry(url);
        if (countryDoc == null) return null;

        Country country = CountryParser.parseCountry(countryDoc);
        country.setName(name);
        return country;
    }

    private String serialize(List<Country> countries, boolean pretty) throws JsonProcessingException {
        ObjectMapper mapper = new ObjectMapper();
        if (pretty) {
            mapper.enable(SerializationFeature.INDENT_OUTPUT);
        }
        return mapper.writeValueAsString(countries);
    }

    private void validateSchema(String jsonContent) {
        try (InputStream schemaStream = getClass().getResourceAsStream("/country-schema.json")) {
            if (schemaStream == null) return;
            JsonSchema schema = JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V7).getSchema(schemaStream);
            ObjectMapper mapper = new ObjectMapper();
            JsonNode node = mapper.readTree(jsonContent);
            Set<ValidationMessage> errors = schema.validate(node);

            if (errors.isEmpty()) {
                logger.info("Schema validation passed.");
            } else {
                errors.forEach(e -> logger.error("Schema Error: {}", e.getMessage()));
            }
        } catch (Exception e) {
            logger.error("Schema validation execution failed", e);
        }
    }

    private void exportData(List<Country> countries) throws IOException {
        Path prettyPath = Paths.get("src/main/resources/countries.json");
        Path minPath = Paths.get("src/main/resources/countries.min.json");
        Files.createDirectories(prettyPath.getParent());

        Files.writeString(prettyPath, serialize(countries, true));
        Files.writeString(minPath, serialize(countries, false));

        logger.info("Data exported to {} and {}", prettyPath.toAbsolutePath(), minPath.toAbsolutePath());
    }
}
