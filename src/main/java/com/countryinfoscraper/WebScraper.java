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

        // Initialize with default values
        countryInfo.addProperty("name", "");
        countryInfo.addProperty("area_km2", "");
        countryInfo.addProperty("population", "");
        countryInfo.addProperty("density_km2", "");
        countryInfo.addProperty("capital", "");
        countryInfo.addProperty("largest_city", "");
        countryInfo.addProperty("official_languages", "");
        countryInfo.addProperty("currency", "");
        countryInfo.addProperty("time_zone", "");
        countryInfo.addProperty("GDP", "");
        countryInfo.addProperty("HDI", "");
        countryInfo.addProperty("ISO_code", "");
        countryInfo.addProperty("internet_TLD", "");
        countryInfo.addProperty("flagUrl", "");
        countryInfo.addProperty("description", "");
        countryInfo.addProperty("demonyms", "");
        countryInfo.addProperty("calling_code", "");

        // Scrape the info from the infobox
        Element infobox = doc.select("table.infobox.ib-country.vcard").first();
        if (infobox != null) {
            Elements rows = infobox.select("tr");

            boolean areaHeaderFound = false;
            boolean areaFound = false;
            boolean populationHeaderFound = false;
            boolean populationFound = false;
            boolean densityFound = false;
            boolean languageFound = false;
            boolean flagFound = false;

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
                        case "Capital Administrative center":
                            // Remove unwanted elements: sup, coordinates
                            data.select("sup, .geo-inline").remove();

                            // Remove texts in parentheses from the entire data content first
                            String dataText = data.html().replaceAll("\\s*\\([^)]*\\)\\s*", "");

                            // Parse the cleaned data content for capitals
                            Document cleanedData = Jsoup.parse(dataText);

                            // Check for multiple capitals
                            Elements capitalElements = cleanedData.select(".plainlist ul li a");
                            List<String> capitals = new ArrayList<>();
                            if (!capitalElements.isEmpty()) {
                                for (Element capitalElement : capitalElements) {
                                    String capital = capitalElement.text().trim();
                                    if (!capital.isEmpty()) {
                                        capitals.add(capital);
                                    }
                                }
                            } else {
                                // Handle cases with no links
                                Elements singleCapitalElements = cleanedData.select("a");
                                if (!singleCapitalElements.isEmpty()) {
                                    for (Element singleCapitalElement : singleCapitalElements) {
                                        String capital = singleCapitalElement.text().trim();
                                        if (!capital.isEmpty()) {
                                            capitals.add(capital);
                                        }
                                    }
                                } else {
                                    // Handle text directly from the td element
                                    String capital = cleanedData.text().trim();
                                    if (!capital.isEmpty()) {
                                        capitals.add(capital);
                                    }
                                }
                            }

                            String capitalString = String.join(", ", capitals).replaceAll("\\s+([,.])", "$1");
                            countryInfo.addProperty("capital", capitalString);
                            if (headerText.contains("Capital and largest city")) {
                                countryInfo.addProperty("largest_city", capitalString);
                            }
                            break;
                        case "Largest city":
                            String largestCity = data.select("a").first().text();
                            countryInfo.addProperty("largest_city", largestCity);
                            break;
                        case "Demonym(s)":
                        case "Demonym":
                            data.select("sup, i, br").remove();  // Remove sup, i (italic), and br (line breaks) elements
                            List<String> demonyms = new ArrayList<>();
                            // Check if the demonyms are in a list
                            Elements demonymElements = data.select(".hlist ul li");
                            if (!demonymElements.isEmpty()) {
                                for (Element demonymElement : demonymElements) {
                                    String demonym = demonymElement.text();
                                    demonyms.add(demonym);
                                }
                            } else {
                                // Single demonym case
                                Elements singleDemonymElement = data.select("a");
                                if (!singleDemonymElement.isEmpty()) {
                                    demonyms.add(singleDemonymElement.first().text());
                                } else {
                                    // Handle case with no link
                                    demonyms.add(data.text());
                                }
                            }
                            String demonymString = String.join(", ", demonyms);
                            countryInfo.addProperty("demonyms", demonymString);
                            break;
                        case "Currency":
                            data.select("sup, i, br").remove();  // Remove sup, i (italic), and br (line breaks) elements
                            List<String> currencies = new ArrayList<>();
                            // Check if the currencies are in a list
                            Elements currencyElements = data.select(".plainlist ul li a");
                            if (!currencyElements.isEmpty()) {
                                for (Element currencyElement : currencyElements) {
                                    if (!currencyElement.attr("title").equalsIgnoreCase("ISO 4217")) {
                                        String currency = currencyElement.text().split("\\(")[0].trim();  // Ignore content in parentheses
                                        currencies.add(currency);
                                    }
                                }
                            } else {
                                // Single currency case
                                String singleCurrency = data.text().split("\\(")[0].trim();  // Ignore content in parentheses
                                currencies.add(singleCurrency);
                            }
                            String currencyString = String.join(", ", currencies);
                            countryInfo.addProperty("currency", currencyString);
                            break;
                        case "Time zone":
                            countryInfo.addProperty("time_zone", cleanText(data));
                            break;
                        case "Calling code":
                            String callingCode = data.select("a").isEmpty() ? data.text() : data.select("a").first().text();
                            countryInfo.addProperty("calling_code", callingCode);
                            break;
                        case "ISO 3166 code":
                            countryInfo.addProperty("ISO_code", cleanText(data));
                            break;
                        case "Internet TLD":
                            countryInfo.addProperty("internet_TLD", cleanText(data));
                            break;
                        default:
                            if (headerText.toLowerCase().contains("hdi")) {
                                // Remove unwanted elements and get the HDI value
                                data.select("sup, br, .nowrap").remove();
                                String hdiValue = data.text().split(" ")[0];
                                countryInfo.addProperty("HDI", hdiValue);
                            }
                            if (headerText.toLowerCase().contains("language")) {
                                if(languageFound || !flagFound){
                                    break;
                                }
                                data.select("sup, i, br").remove();  // Remove sup, i (italic), and br (line breaks) elements
                                Elements languagesElements = data.select("a");
                                List<String> languages = new ArrayList<>();
                                for (Element langElement : languagesElements) {
                                    String language = langElement.text();
                                    if (!language.equalsIgnoreCase("none")) {
                                        languages.add(language);
                                    }
                                }
                                String officialLanguages = String.join(", ", languages);
                                countryInfo.addProperty("official_languages", officialLanguages);
                                languageFound = true;
                            }
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
                        while (parentDiv != null) {
                            Element descriptionDiv = parentDiv.nextElementSibling();
                            if (descriptionDiv != null) {
                                String description = descriptionDiv.text().toLowerCase();
                                if (description.contains("flag")) {
                                    countryInfo.addProperty("flagUrl", imgUrl);
                                    flagFound = true;
                                    break;
                                }
                            }
                            parentDiv = parentDiv.parent();
                        }
                    }
                }

            }
        }

        // Scrape the country description from the first <p> element after the infobox
        Element descriptionElement = doc.select("table.infobox ~ p").first();
        while (descriptionElement != null && descriptionElement.text().trim().isEmpty()) {
            // Move to the next sibling element
            descriptionElement = descriptionElement.nextElementSibling();
            // Skip non-<p> elements
            while (descriptionElement != null && !descriptionElement.tagName().equals("p")) {
                descriptionElement = descriptionElement.nextElementSibling();
            }
        }
        if (descriptionElement != null) {
            String description = cleanText(descriptionElement);

            // Remove anything within parentheses
            description = description.replaceAll("\\(([^()]*|\\([^()]*\\))*\\)", "").replaceAll("\\s+", " ").trim();

            // Remove any space before commas and periods
            description = description.replaceAll("\\s+([,.])", "$1");

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
        Pattern pattern1 = Pattern.compile("^(\\d{1,3}(?:,\\d{3})*)<sup");
        Pattern pattern2 = Pattern.compile("(\\d{1,3}(?:,\\d{3})*)\\s*&nbsp;km<sup>2</sup>");

        Matcher matcher1 = pattern1.matcher(html);
        Matcher matcher2 = pattern2.matcher(html);

        if (matcher1.find()) {
            return matcher1.group(1).replace(",", "");
        } else if (matcher2.find()) {
            return matcher2.group(1).replace(",", "");
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
        // Pattern to match the density value outside parentheses
        Pattern pattern = Pattern.compile("([0-9,.]+)\\s*<sup[^>]*>.*?</sup>\\s*/\\s*km<sup>2</sup>");
        Matcher matcher = pattern.matcher(html);
        if (matcher.find()) {
            return matcher.group(1).replace(",", "");
        }

        // Pattern to match the density value followed by /km² and additional info
        pattern = Pattern.compile("([0-9,.]+)\\s*/\\s*km<sup>2</sup>[^<]*");
        matcher = pattern.matcher(html);
        if (matcher.find()) {
            return matcher.group(1).replace(",", "");
        }

        // Handling cases where density is followed by references or additional information
        pattern = Pattern.compile("([0-9,.]+)\\s*</?sup>\\s*/\\s*km<sup>2</sup>");
        matcher = pattern.matcher(html);
        if (matcher.find()) {
            return matcher.group(1).replace(",", "");
        }

        return "";
    }

}
