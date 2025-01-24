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
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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

            boolean areaHeaderFound = false;
            boolean areaFound = false;
            boolean populationHeaderFound = false;
            boolean populationFound = false;
            boolean densityFound = false;

            for (Element row : rows) {
                Element header = row.select("th").first();
                Element data = row.select("td").first();

                // Check for the Area header
                if (!areaHeaderFound && header != null && header.text().toLowerCase().contains("area")) {
                    areaHeaderFound = true;
                }

                // Scrape area information if Area header was found
                if (!areaFound && areaHeaderFound && header != null && data != null && header.select("div").text().toLowerCase().contains("total")) {
                    String areaHtml = data.html();
                    String area = extractKm2(areaHtml);
                    countryInfo.addProperty("area_km2", area);
                    areaFound = true; // Reset the flag after capturing the area
                }

                // Check for the Population header
                if (!populationHeaderFound && header != null && header.text().toLowerCase().contains("population")) {
                    populationHeaderFound = true;
                }

                // Scrape population information if Population header was found
                if (!populationFound && populationHeaderFound && header != null && data != null && (header.select("div").text().toLowerCase().contains("estimate") || header.select("div").text().toLowerCase().contains("census"))) {
                    String populationHtml = data.html();
                    String population = extractPopulation(populationHtml);
                    countryInfo.addProperty("population", population);
                    populationFound = true; // Capture the first population estimate found
                }

                // Scrape density information if Population header was found
                if (!densityFound && populationHeaderFound && header != null && data != null && header.select("div").text().toLowerCase().contains("density")) {
                    String densityHtml = data.html();
                    String density = extractDensity(densityHtml);
                    countryInfo.addProperty("density_km2", density);
                    densityFound = true; // Capture the density information
                }

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
                        case "Currency":
                            countryInfo.addProperty("currency", cleanText(data));
                            break;
                        case "Time zone":
                            countryInfo.addProperty("time_zone", cleanText(data));
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
                }

                // Scrape flag and emblem images
                Elements imageCells = row.select("td.infobox-image");
                for (Element cell : imageCells) {
                    Elements images = cell.select("img");
                    for (Element img : images) {
                        String imgUrl = "https:" + img.attr("src");
                        Element parentDiv = img.closest("div");
                        if (parentDiv != null) {
                            Element descriptionDiv = parentDiv.nextElementSibling();
                            if (descriptionDiv != null) {
                                String description = descriptionDiv.text().toLowerCase();
                                if (description.contains("flag")) {
                                    countryInfo.addProperty("flagUrl", imgUrl);
                                } else if (description.contains("emblem") || description.contains("coat of arms")) {
                                    countryInfo.addProperty("emblemUrl", imgUrl);
                                }
                            }
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

    // Method to extract area in km² from HTML string
    private static String extractKm2(String html) {
        Pattern pattern = Pattern.compile("([0-9,]+)&nbsp;km<sup>2</sup>");
        Matcher matcher = pattern.matcher(html);
        if (matcher.find()) {
            return matcher.group(1).replace(",", "") + " km²";
        }
        return "";
    }

    // Method to extract population from HTML string
    private static String extractPopulation(String html) {
        Pattern pattern = Pattern.compile("([0-9,]+)(?=<sup|\\s*<)");
        Matcher matcher = pattern.matcher(html);
        if (matcher.find()) {
            return matcher.group(1).replace(",", "");
        }
        return "";
    }

    // Method to extract density in km² from HTML string
    private static String extractDensity(String html) {
        // First, try to find the value outside parentheses
        Pattern pattern = Pattern.compile("([0-9,.]+)\\s*/\\s*km<sup>2</sup>");
        Matcher matcher = pattern.matcher(html);
        if (matcher.find()) {
            return matcher.group(1).replace(",", "") + "/km²";
        }

        // If not found, try to find the value inside parentheses
        pattern = Pattern.compile("\\(([^)]+)\\s*/\\s*km<sup>2</sup>\\)");
        matcher = pattern.matcher(html);
        if (matcher.find()) {
            return matcher.group(1).replace(",", "") + "/km²";
        }

        return "";
    }

}
