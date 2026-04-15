package com.countryinfoscraper;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Comparator;
import java.util.Map;
import java.util.stream.Stream;

public class SnapshotDownloader {
    private static final Logger logger = LoggerFactory.getLogger(SnapshotDownloader.class);
    private static final String SNAPSHOT_DIR = "src/test/resources/snapshots/";
    private static final String USER_AGENT = "CountryInfoScraper/1.0 (https://github.com/mucadoo/country-info-scraper; your_email@example.com) Java/21";

    private static final Map<String, String> COUNTRIES_TO_SNAPSHOT = Map.ofEntries(
            Map.entry("united_states", "https://en.wikipedia.org/wiki/United_States"),
            Map.entry("france", "https://en.wikipedia.org/wiki/France"),
            Map.entry("india", "https://en.wikipedia.org/wiki/India"),
            Map.entry("vatican_city", "https://en.wikipedia.org/wiki/Vatican_City"),
            Map.entry("south_africa", "https://en.wikipedia.org/wiki/South_Africa"),
            Map.entry("denmark", "https://en.wikipedia.org/wiki/Denmark"),
            Map.entry("netherlands", "https://en.wikipedia.org/wiki/Netherlands"),
            Map.entry("bolivia", "https://en.wikipedia.org/wiki/Bolivia"),
            Map.entry("yemen", "https://en.wikipedia.org/wiki/Yemen"),
            Map.entry("israel", "https://en.wikipedia.org/wiki/Israel"),
            Map.entry("turkmenistan", "https://en.wikipedia.org/wiki/Turkmenistan"),
            Map.entry("el_salvador", "https://en.wikipedia.org/wiki/El_Salvador"),
            Map.entry("zimbabwe", "https://en.wikipedia.org/wiki/Zimbabwe"),
            Map.entry("sri_lanka", "https://en.wikipedia.org/wiki/Sri_Lanka"),
            Map.entry("malaysia", "https://en.wikipedia.org/wiki/Malaysia"),
            Map.entry("ivory_coast", "https://en.wikipedia.org/wiki/Ivory_Coast"),
            Map.entry("singapore", "https://en.wikipedia.org/wiki/Singapore"),
            Map.entry("afghanistan", "https://en.wikipedia.org/wiki/Afghanistan"),
            Map.entry("vietnam", "https://en.wikipedia.org/wiki/Vietnam"),
            Map.entry("sweden", "https://en.wikipedia.org/wiki/Sweden"),
            Map.entry("monaco", "https://en.wikipedia.org/wiki/Monaco"),
            Map.entry("nauru", "https://en.wikipedia.org/wiki/Nauru"),
            Map.entry("switzerland", "https://en.wikipedia.org/wiki/Switzerland"),
            Map.entry("palestine", "https://en.wikipedia.org/wiki/State_of_Palestine"),
            Map.entry("canada", "https://en.wikipedia.org/wiki/Canada"),
            Map.entry("russia", "https://en.wikipedia.org/wiki/Russia"),
            Map.entry("china", "https://en.wikipedia.org/wiki/China"),
            Map.entry("mongolia", "https://en.wikipedia.org/wiki/Mongolia"),
            Map.entry("vanuatu", "https://en.wikipedia.org/wiki/Vanuatu"),
            Map.entry("guinea_bissau", "https://en.wikipedia.org/wiki/Guinea-Bissau"),
            Map.entry("solomon_islands", "https://en.wikipedia.org/wiki/Solomon_Islands"),
            Map.entry("lebanon", "https://en.wikipedia.org/wiki/Lebanon"),
            Map.entry("south_korea", "https://en.wikipedia.org/wiki/South_Korea"),
            Map.entry("senegal", "https://en.wikipedia.org/wiki/Senegal"),
            Map.entry("equatorial_guinea", "https://en.wikipedia.org/wiki/Equatorial_Guinea"),
            Map.entry("comoros", "https://en.wikipedia.org/wiki/Comoros"),
            Map.entry("eritrea", "https://en.wikipedia.org/wiki/Eritrea")
    );

    public static void main(String[] args) {
        new SnapshotDownloader().downloadAll();
    }

    public void downloadAll() {
        try {
            cleanSnapshotDirectory();
            Files.createDirectories(Paths.get(SNAPSHOT_DIR));
            for (Map.Entry<String, String> entry : COUNTRIES_TO_SNAPSHOT.entrySet()) {
                downloadSnapshot(entry.getKey(), entry.getValue());
            }
        } catch (IOException e) {
            logger.error("Failed to setup snapshots", e);
        }
    }

    private void cleanSnapshotDirectory() throws IOException {
        Path path = Paths.get(SNAPSHOT_DIR);
        if (Files.exists(path)) {
            logger.info("Cleaning snapshot directory: {}", SNAPSHOT_DIR);
            try (Stream<Path> walk = Files.walk(path)) {
                walk.sorted(Comparator.reverseOrder())
                    .map(Path::toFile)
                    .forEach(File::delete);
            }
        }
    }

    private void downloadSnapshot(String fileName, String url) {
        try {
            logger.info("Downloading and Trimming: {}", url);
            Document doc = Jsoup.connect(url).userAgent(USER_AGENT).timeout(15000).get();

            // 1. Create a "Clean" container
            Element cleanRoot = doc.createElement("div");

            // 2. Grab the Infobox (for InfoboxParser)
            // We use a broad selector to ensure we catch it
            Element infobox = doc.select("table.infobox").first();
            if (infobox != null) {
                cleanRoot.appendChild(infobox);
            }

            // 3. Grab the first few paragraphs that follow the infobox (for DescriptionParser)
            // DescriptionParser specifically uses "table.infobox ~ p"
            Elements leadParagraphs = doc.select("table.infobox ~ p");
            if (leadParagraphs.isEmpty()) {
                // Fallback if structure is slightly different
                leadParagraphs = doc.select("p");
            }
            
            leadParagraphs.stream().limit(5).forEach(cleanRoot::appendChild);

            // 4. Save the "Skeleton" HTML
            String skeleton = "<html><body>" + cleanRoot.html() + "</body></html>";
            Files.writeString(Paths.get(SNAPSHOT_DIR, fileName + ".html"), skeleton);

        } catch (IOException e) {
            logger.error("Failed download for {}: {}", fileName, e.getMessage());
        }
    }
}
