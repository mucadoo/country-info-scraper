package com.countryinfoscraper;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;

public class SnapshotDownloader {
    private static final Logger logger = LoggerFactory.getLogger(SnapshotDownloader.class);
    private static final String SNAPSHOT_DIR = "src/test/resources/snapshots/";
    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

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
            Map.entry("zimbabwe", "https://en.wikipedia.org/wiki/Zimbabwe"),         // 16 languages, multiple currencies
            Map.entry("sri_lanka", "https://en.wikipedia.org/wiki/Sri_Lanka"),       // 2 capitals with complex coordinates
            Map.entry("malaysia", "https://en.wikipedia.org/wiki/Malaysia"),         // 2 capitals (Kuala Lumpur/Putrajaya)
            Map.entry("ivory_coast", "https://en.wikipedia.org/wiki/Ivory_Coast"),   // 2 capitals, accents in name (Côte d'Ivoire)
            Map.entry("singapore", "https://en.wikipedia.org/wiki/Singapore"),       // City-state, 4 official languages
            Map.entry("afghanistan", "https://en.wikipedia.org/wiki/Afghanistan"),   // Current JSON shows missing calling code
            Map.entry("vietnam", "https://en.wikipedia.org/wiki/Vietnam"),           // Largest city logic (Ho Chi Minh vs Hue)
            Map.entry("sweden", "https://en.wikipedia.org/wiki/Sweden")              // Current JSON shows empty calling code
    );

    public static void main(String[] args) {
        new SnapshotDownloader().downloadAll();
    }

    public void downloadAll() {
        try {
            Files.createDirectories(Paths.get(SNAPSHOT_DIR));
            for (Map.Entry<String, String> entry : COUNTRIES_TO_SNAPSHOT.entrySet()) {
                downloadSnapshot(entry.getKey(), entry.getValue());
            }
        } catch (IOException e) {
            logger.error("Failed to setup snapshots", e);
        }
    }

    private void downloadSnapshot(String fileName, String url) {
        try {
            logger.info("Downloading: {}", url);
            Document doc = Jsoup.connect(url).userAgent(USER_AGENT).timeout(15000).get();
            Files.writeString(Paths.get(SNAPSHOT_DIR, fileName + ".html"), doc.outerHtml());
        } catch (IOException e) {
            logger.error("Failed download for {}: {}", fileName, e.getMessage());
        }
    }
}
