package com.countryinfoscraper;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

public class InfoboxParser {
    private static final Logger logger = LoggerFactory.getLogger(InfoboxParser.class);

    public static void parse(Document doc, Country country) {
        Element infobox = doc.select("table.infobox.ib-country.vcard").first();
        if (infobox == null) return;

        Elements rows = infobox.select("tr");
        ParserState state = new ParserState();

        for (Element row : rows) {
            Element header = row.select("th").first();
            Element data = row.select("td").first();

            processAreaAndPopulation(header, data, country, state);
            if (header != null && data != null) {
                processStandardFields(header, data, row, country, state);
            }
            processImages(row, country, state);
        }
    }

    private static void processAreaAndPopulation(Element header, Element data, Country country, ParserState state) {
        if (header == null) return;
        String text = header.text().toLowerCase();

        if (!state.areaHeaderFound && text.contains("area")) state.areaHeaderFound = true;
        if (!state.populationHeaderFound && text.contains("population")) state.populationHeaderFound = true;

        if (data == null) return;

        if (!state.areaFound && state.areaHeaderFound && header.select("div").text().toLowerCase().contains("total")) {
            String area = ExtractionUtils.extractArea(data.html());
            if (!area.isEmpty()) {
                try {
                    country.setAreaKm2(Double.parseDouble(area));
                } catch (NumberFormatException e) {
                    logger.warn("Failed to parse area for {}: '{}'", country.getName(), area);
                }
            }
            state.areaFound = true;
        }

        if (!state.populationFound && state.populationHeaderFound && (header.select("div").text().toLowerCase().contains("estimate") || header.select("div").text().toLowerCase().contains("census"))) {
            String pop = ExtractionUtils.extractPopulation(data.html());
            if (!pop.isEmpty()) {
                try {
                    country.setPopulation(Long.parseLong(pop));
                } catch (NumberFormatException e) {
                    logger.warn("Failed to parse population for {}: '{}'", country.getName(), pop);
                }
            }
            state.populationFound = true;
        }

        if (!state.densityFound && state.populationHeaderFound && header.select("div").text().toLowerCase().contains("density")) {
            String density = ExtractionUtils.extractDensity(data.html());
            if (!density.isEmpty()) {
                try {
                    country.setDensityKm2(Double.parseDouble(density));
                } catch (NumberFormatException e) {
                    logger.warn("Failed to parse density for {}: '{}'", country.getName(), density);
                }
            }
            state.densityFound = true;
        }
    }

    private static void processStandardFields(Element header, Element data, Element row, Country country, ParserState state) {
        String headerText = header.text();

        switch (headerText) {
            case "Capital":
            case "Capital and largest city":
            case "Capital Administrative center":
                parseCapital(data, country, headerText);
                break;
            case "Largest city":
            case "Largest city by municipal boundary":
            case "Largest city by metropolitan area population":
            case "Largest metropolitan area":
            case "Largest municipality":
            case "Largest administrative unit":
            case "Largest quarter":
            case "Largest settlement":
            case "Largest planning area by population":
                Element largestCityLink = data.select("a").first();
                if (largestCityLink != null) country.setLargestCity(largestCityLink.text());
                break;
            case "Demonym(s)":
            case "Demonym":
                country.setDemonym(parseListOrLink(data, ".hlist ul li"));
                break;
            case "Government":
                country.setGovernment(ExtractionUtils.cleanText(data));
                break;
            case "GDP (nominal)":
                parseGDP(row, country);
                break;
            case "Currency":
                country.setCurrency(parseCurrency(data));
                break;
            case "Time zone":
                country.setTimeZone(ExtractionUtils.cleanText(data));
                break;
            case "Calling code":
                country.setCallingCode(data.select("a").isEmpty() ? data.text() : data.select("a").first().text());
                break;
            case "ISO 3166 code":
                country.setIsoCode(ExtractionUtils.cleanText(data));
                break;
            case "Internet TLD":
                country.setInternetTld(ExtractionUtils.cleanText(data));
                break;
            default:
                handleOtherFields(headerText, data, country, state);
                break;
        }
    }

    private static void parseCapital(Element data, Country country, String headerText) {
        data.select("sup, .geo-inline").remove();
        String dataText = data.html().replaceAll("\\s*\\([^)]*\\)\\s*", "");
        Document cleanedData = Jsoup.parse(dataText);
        Elements links = cleanedData.select(".plainlist ul li a, a");
        List<String> capitals = new ArrayList<>();
        if (!links.isEmpty()) {
            links.forEach(l -> { if(!l.text().trim().isEmpty()) capitals.add(l.text().trim()); });
        } else {
            capitals.add(cleanedData.text().trim());
        }
        String result = String.join(", ", capitals).replaceAll("\\s+([,.])", "$1");
        country.setCapital(result);
        if (headerText.contains("Capital and largest city")) country.setLargestCity(result);
    }

    private static String parseListOrLink(Element data, String selector) {
        data.select("sup, i, br").remove();
        Elements elements = data.select(selector);
        if (!elements.isEmpty()) {
            return elements.stream().map(Element::text).collect(Collectors.joining(", "));
        }
        Element single = data.select("a").first();
        return single != null ? single.text() : data.text();
    }

    private static void parseGDP(Element row, Country country) {
        Element curr = row;
        while (curr != null) {
            Element h = curr.select("th").first();
            Element d = curr.select("td").first();
            if (h != null && h.text().toLowerCase().contains("total") && d != null) {
                d.select("span, sup").remove();
                country.setGdp(d.text().replaceAll("\\s*\\([^)]*\\)\\s*", "").trim());
                break;
            }
            curr = curr.nextElementSibling();
        }
    }

    private static String parseCurrency(Element data) {
        data.select("sup, i, br").remove();
        Elements links = data.select(".plainlist ul li a");
        if (!links.isEmpty()) {
            return links.stream()
                    .filter(l -> !l.attr("title").equalsIgnoreCase("ISO 4217"))
                    .map(l -> l.text().split("\\(")[0].trim())
                    .collect(Collectors.joining(", "));
        }
        return data.text().split("\\(")[0].trim();
    }

    private static void handleOtherFields(String headerText, Element data, Country country, ParserState state) {
        if (headerText.toLowerCase().contains("hdi")) {
            data.select("sup, br, .nowrap").remove();
            country.setHdi(data.text().split(" ")[0]);
        }
        if (headerText.toLowerCase().contains("language") && !state.languageFound && state.flagFound) {
            data.select("sup, i, br").remove();
            String langs = data.select("a").stream().map(Element::text).filter(t -> !t.equalsIgnoreCase("none")).collect(Collectors.joining(", "));
            country.setOfficialLanguage(langs);
            state.languageFound = true;
        }
    }

    private static void processImages(Element row, Country country, ParserState state) {
        Elements imageCells = row.select("td.infobox-image");
        for (Element cell : imageCells) {
            for (Element img : cell.select("img")) {
                String url = "https:" + img.attr("src");
                Element descDiv = findDescriptionDiv(img);
                if (descDiv != null && descDiv.text().toLowerCase().contains("flag")) {
                    country.setFlagUrl(url);
                    state.flagFound = true;
                }
            }
        }
    }

    private static Element findDescriptionDiv(Element img) {
        Element p = img.closest("div");
        while (p != null) {
            Element n = p.nextElementSibling();
            if (n != null) return n;
            p = p.parent();
        }
        return null;
    }

    private static class ParserState {
        boolean areaHeaderFound, areaFound, populationHeaderFound, populationFound, densityFound, languageFound, flagFound;
    }
}
