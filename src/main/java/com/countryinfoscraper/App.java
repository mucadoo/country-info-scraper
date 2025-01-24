package com.countryinfoscraper;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import com.google.gson.JsonObject;
import com.google.gson.Gson;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public class App {
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

            // Convert the list of countries to JSON
            String json = new Gson().toJson(countries);
            System.out.println(json);

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
                            countryInfo.addProperty("capital", data.text());
                            break;
                        case "Official languages":
                            countryInfo.addProperty("official_languages", data.text());
                            break;
                        case "Ethnic groups":
                            countryInfo.addProperty("ethnic_groups", data.text());
                            break;
                        case "Religion":
                            countryInfo.addProperty("religion", data.text());
                            break;
                        case "Currency":
                            countryInfo.addProperty("currency", data.text());
                            break;
                        case "Time zone":
                            countryInfo.addProperty("time_zone", data.text());
                            break;
                        case "Population":
                            countryInfo.addProperty("population", data.text());
                            break;
                        case "GDP":
                            countryInfo.addProperty("GDP", data.text());
                            break;
                        case "HDI":
                            countryInfo.addProperty("HDI", data.text());
                            break;
                        case "Drives on":
                            countryInfo.addProperty("drives_on", data.text());
                            break;
                        case "ISO 3166 code":
                            countryInfo.addProperty("ISO_code", data.text());
                            break;
                        case "Internet TLD":
                            countryInfo.addProperty("internet_TLD", data.text());
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
            String description = pElement.text();
            countryInfo.addProperty("description", description);
        }

        return countryInfo;
    }
}
