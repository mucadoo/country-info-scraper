package com.countryinfoscraper;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.gson.GsonBuilder;
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
import java.util.concurrent.ForkJoinPool;
import java.util.stream.Collectors;

public class WebScraper {
    private static final Logger logger = LoggerFactory.getLogger(WebScraper.class);
    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";
    private static final int TIMEOUT_MS = 15000;
    private static final int MAX_RETRIES = 3;
    private static final int PARALLELISM = 10; // Optimized for Wikipedia rate limits

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
            
            // Using a custom ForkJoinPool to control parallelism and avoid saturating the common pool
            ForkJoinPool customThreadPool = new ForkJoinPool(PARALLELISM);
            List<Country> countries = customThreadPool.submit(() ->
                rows.parallelStream()
                    .map(this::processRow)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList())
            ).get();
            customThreadPool.shutdown();

            String jsonOutput = serialize(countries);
            validateSchema(jsonOutput);
            exportData(jsonOutput);

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
                try { Thread.sleep(1000L * (i + 1)); } catch (InterruptedException ignored) {
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

    private String serialize(List<Country> countries) {
        return new GsonBuilder()
                .setFieldNamingStrategy(f -> {
                    String name = f.getName();
                    if (name.equals("isoCode")) return "ISO_code";
                    if (name.equals("areaKm2")) return "area_km2";
                    if (name.equals("densityKm2")) return "density_km2";
                    if (name.equals("internetTld")) return "internet_TLD";
                    if (name.equals("largestCity")) return "largest_city";
                    if (name.equals("officialLanguage")) return "official_language";
                    if (name.equals("timeZone")) return "time_zone";
                    if (name.equals("callingCode")) return "calling_code";
                    return name;
                })
                .setPrettyPrinting()
                .create()
                .toJson(countries);
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

    private void exportData(String json) throws IOException {
        Path path = Paths.get("src/main/resources/countries.json");
        Files.createDirectories(path.getParent());
        Files.write(path, json.getBytes());
        logger.info("Data exported to {}", path.toAbsolutePath());
    }
}
