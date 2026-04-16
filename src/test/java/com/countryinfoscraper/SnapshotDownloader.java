package com.countryinfoscraper;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
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

    public static void main(String[] args) {
        new SnapshotDownloader().downloadAll();
    }

    public void downloadAll() {
        try {
            cleanSnapshotDirectory();
            Files.createDirectories(Paths.get(SNAPSHOT_DIR));
            
            logger.info("Fetching country list from Wikipedia...");
            Document doc = Jsoup.connect("https://en.wikipedia.org/wiki/List_of_sovereign_states")
                    .userAgent(USER_AGENT)
                    .timeout(15000)
                    .get();

            Element table = doc.select("table.wikitable").first();
            if (table == null) {
                logger.error("Country list table not found!");
                return;
            }

            Elements rows = table.select("tbody > tr");
            for (Element row : rows) {
                Element link = row.select("td").first() != null ? row.select("td").first().select("a").first() : null;
                if (link != null) {
                    String name = link.text();
                    String url = "https://en.wikipedia.org" + link.attr("href");
                    String fileName = name.toLowerCase().replace(" ", "_").replaceAll("[^a-z0-9_]", "");
                    downloadSnapshot(fileName, url);
                }
            }
            logger.info("Finished downloading all snapshots.");
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
            Element infobox = doc.select("table.infobox").first();
            if (infobox != null) {
                cleanRoot.appendChild(infobox);
            }

            // 3. Grab the first few paragraphs that follow the infobox (for DescriptionParser)
            Elements leadParagraphs = doc.select("table.infobox ~ p");
            if (leadParagraphs.isEmpty()) {
                leadParagraphs = doc.select("p");
            }
            
            leadParagraphs.stream().limit(5).forEach(cleanRoot::appendChild);

            // 4. Save the "Skeleton" HTML
            // We force LF (\n) by replacing any CRLF and then ensuring the entire string uses \n
            String skeleton = "<html><body>\n" + cleanRoot.html() + "\n</body></html>";
            String normalizedSkeleton = skeleton.replace("\r\n", "\n").replace("\r", "\n");
            
            Files.writeString(Paths.get(SNAPSHOT_DIR, fileName + ".html"), normalizedSkeleton, StandardCharsets.UTF_8);

        } catch (IOException e) {
            logger.error("Failed download for {}: {}", fileName, e.getMessage());
        }
    }
}
