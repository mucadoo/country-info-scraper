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

/**
 * Utility to download Wikipedia pages and save them as local HTML snapshots.
 * These snapshots are used for stable, offline regression testing.
 */
public class SnapshotDownloader {
    private static final Logger logger = LoggerFactory.getLogger(SnapshotDownloader.class);
    private static final String SNAPSHOT_DIR = "src/test/resources/snapshots/";
    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

    private static final Map<String, String> COUNTRIES_TO_SNAPSHOT = Map.of(
            "united_states", "https://en.wikipedia.org/wiki/United_States",
            "france", "https://en.wikipedia.org/wiki/France",
            "brazil", "https://en.wikipedia.org/wiki/Brazil",
            "india", "https://en.wikipedia.org/wiki/India",
            "vatican_city", "https://en.wikipedia.org/wiki/Vatican_City" // Small country edge case
    );

    public static void main(String[] args) {
        SnapshotDownloader downloader = new SnapshotDownloader();
        downloader.downloadAll();
    }

    public void downloadAll() {
        try {
            Path path = Paths.get(SNAPSHOT_DIR);
            Files.createDirectories(path);
            logger.info("Ensuring snapshot directory exists at: {}", path.toAbsolutePath());

            for (Map.Entry<String, String> entry : COUNTRIES_TO_SNAPSHOT.entrySet()) {
                downloadSnapshot(entry.getKey(), entry.getValue());
            }
            logger.info("Snapshot download process completed.");
        } catch (IOException e) {
            logger.error("Failed to create snapshot directory", e);
        }
    }

    private void downloadSnapshot(String fileName, String url) {
        try {
            logger.info("Downloading snapshot for {}: {}", fileName, url);
            Document doc = Jsoup.connect(url)
                    .userAgent(USER_AGENT)
                    .timeout(15000)
                    .get();

            Path targetFile = Paths.get(SNAPSHOT_DIR, fileName + ".html");
            Files.writeString(targetFile, doc.outerHtml());
            logger.info("Saved snapshot to: {}", targetFile.toAbsolutePath());
        } catch (IOException e) {
            logger.error("Failed to download snapshot for {}: {}", fileName, e.getMessage());
        }
    }
}
