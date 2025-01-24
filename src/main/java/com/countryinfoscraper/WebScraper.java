package com.countryinfoscraper;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import com.google.gson.JsonObject;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

public class WebScraper {
    public static void main(String[] args) {
        try {
            // Connect to the Wikipedia page
            Document doc = Jsoup.connect("https://en.wikipedia.org/wiki/List_of_sovereign_states").get();

            // Select the table with the list of countries
            Element table = doc.select("table.wikitable").first();

            // Get rows from the table
            Elements rows = table.select("tbody > tr");

            List<JsonObject> countries = new ArrayList<>();

            // Loop through rows and get country links
            for (Element row : rows) {
                Elements cols = row.select("td");
                if (!cols.isEmpty()) {
                    Element link = cols.get(0).select("a").first();
                    if (link != null) {
                        String countryName = link.text();
                        String countryLink = "https://en.wikipedia.org" + link.attr("href");

                        // Scrape the country page
                        JsonObject countryInfo = scrapeCountryInfo(countryLink);
                        countryInfo.addProperty("name", countryName);
                        countries.add(countryInfo);
                    }
                }
            }

            // Create a Gson instance with pretty printing
            Gson gson = new GsonBuilder().setPrettyPrinting().create();
            // Convert the list of countries to pretty-printed JSON
            String json = gson.toJson(countries);

            // Write JSON to file
            Path path = Paths.get("src/main/resources/countries.json");
            Files.createDirectories(path.getParent());
            Files.write(path, json.getBytes());
            System.out.println("Pretty-printed JSON file generated at: " + path.toAbsolutePath());

        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private static JsonObject scrapeCountryInfo(String url) throws IOException {
        Document doc = Jsoup.connect(url).get();
        JsonObject countryInfo = new JsonObject();

        // Scrape the info from the infobox
        Element infobox = doc.select("table.infobox.ib-country.vcard").first();
        if (infobox != null) {
            Elements rows = infobox.select("tr");

            for (Element row : rows) {
                Element header = row.select("th").first();
                Element data = row.select("td").first();
                if (header != null && data != null) {
                    String headerText = header.text();

                    switch (headerText) {
                        case "Capital":
                        case "Capital and largest city":
                            String capital = data.select("a").first().text();
                            countryInfo.addProperty("capital", capital);
                            if (headerText.contains("Capital and largest city")) {
                                countryInfo.addProperty("largest_city", capital);
                            }
                            break;
                        case "Largest city":
                            String largestCity = data.select("a").first().text();
                            countryInfo.addProperty("largest_city", largestCity);
                            break;
                        case "Official languages":
                            countryInfo.addProperty("official_languages", cleanText(data));
                            break;
                        case "Religion":
                            countryInfo.addProperty("religion", cleanText(data));
                            break;
                        case "Currency":
                            countryInfo.addProperty("currency", cleanText(data));
                            break;
                        case "Time zone":
                            countryInfo.addProperty("time_zone", cleanText(data));
                            break;
                        case "Population":
                            countryInfo.addProperty("population", cleanText(data));
                            break;
                        case "GDP":
                            countryInfo.addProperty("GDP", cleanText(data));
                            break;
                        case "HDI":
                            countryInfo.addProperty("HDI", cleanText(data));
                            break;
                        case "Drives on":
                            countryInfo.addProperty("drives_on", cleanText(data));
                            break;
                        case "ISO 3166 code":
                            countryInfo.addProperty("ISO_code", cleanText(data));
                            break;
                        case "Internet TLD":
                            countryInfo.addProperty("internet_TLD", cleanText(data));
                            break;
                        // Add more cases as needed
                        default:
                            break;
                    }

                    // Scrape flag image URL
                    if (headerText.contains("Flag")) {
                        Element flagImg = data.select("img").first();
                        if (flagImg != null) {
                            String flagUrl = "https:" + flagImg.attr("src");
                            countryInfo.addProperty("flagUrl", flagUrl);
                        }
                    }

                    // Scrape coat of arms image URL
                    if (headerText.contains("Emblem") || headerText.contains("Coat of Arms")) {
                        Element emblemImg = data.select("img").first();
                        if (emblemImg != null) {
                            String emblemUrl = "https:" + emblemImg.attr("src");
                            countryInfo.addProperty("emblemUrl", emblemUrl);
                        }
                    }
                }
            }
        }

        // Scrape the country description
        Element pElement = infobox.nextElementSibling();
        if (pElement != null && pElement.tagName().equals("p")) {
            String description = cleanText(pElement);
            countryInfo.addProperty("description", description);
        }

        return countryInfo;
    }

    // Method to clean text from unnecessary elements like superscripts and coordinates
    private static String cleanText(Element element) {
        element.select("sup").remove(); // Remove sup elements
        element.select(".geo-inline").remove(); // Remove coordinates
        return element.text();
    }
}
