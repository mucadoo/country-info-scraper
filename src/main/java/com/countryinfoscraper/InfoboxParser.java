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
        Element infobox = doc.select("table.infobox.ib-country").first();
        if (infobox == null) infobox = doc.select("table.infobox.vcard").first();
        if (infobox == null) infobox = doc.select("table.infobox").first();
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
        
        // Final fallback checks if anything is completely missing to avoid unhandled NPEs
        if (country.getDemonym() == null) country.setDemonym("");
        if (country.getCallingCode() == null) country.setCallingCode("");
        if (country.getGdp() == null) country.setGdp("");
        if (country.getOfficialLanguage() == null) country.setOfficialLanguage("");
        if (country.getCapital() == null) country.setCapital("");
        if (country.getInternetTld() == null) country.setInternetTld("");
    }

    private static void processAreaAndPopulation(Element header, Element data, Country country, ParserState state) {
        if (header == null) return;
        String text = header.text().toLowerCase();

        if (!state.areaHeaderFound && text.contains("area")) state.areaHeaderFound = true;
        if (!state.populationHeaderFound && text.contains("population")) state.populationHeaderFound = true;

        if (data == null) return;

        // Note: Avoiding strict `.select("div")` lookup because older wikis have plain `<th>• Total</th>`
        if (!state.areaFound && state.areaHeaderFound && header.text().toLowerCase().contains("total")) {
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

        if (!state.populationFound && state.populationHeaderFound && (header.text().toLowerCase().contains("estimate") || header.text().toLowerCase().contains("census") || header.text().toLowerCase().contains("total"))) {
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

        if (!state.densityFound && state.populationHeaderFound && header.text().toLowerCase().contains("density")) {
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
        Element headerClone = header.clone();
        headerClone.select("sup, .reference, span.nowrap").remove();
        String headerText = headerClone.text().replace("\u00A0", " ").replaceAll("\\[.*?\\]", "").trim();

        if (headerText.contains("Capital") && (headerText.equals("Capital") || headerText.contains("largest city") || headerText.contains("Administrative center"))) {
            parseCapital(data, country, headerText);
            return;
        }

        switch (headerText) {
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
                country.setDemonym(parseListOrLink(data, ".hlist ul li, .plainlist ul li"));
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
                Element dataClone = data.clone();
                dataClone.select("sup, .reference, span.plainlinks").remove();
                String cc = dataClone.text().split("\\[")[0].trim();
                country.setCallingCode(cc);
                break;
            case "ISO 3166 code":
                country.setIsoCode(ExtractionUtils.cleanText(data));
                break;
            case "Internet TLD":
                Element tldClone = data.clone();
                tldClone.select("sup, .reference").remove();
                country.setInternetTld(tldClone.text().split("\\[")[0].trim());
                break;
            default:
                handleOtherFields(headerText, data, country, state);
                break;
        }
    }

    private static void parseCapital(Element data, Country country, String headerText) {
        Element dataClone = data.clone();
        dataClone.select("sup, .geo-inline, .geo-default, .geo-dms, .geo-dec, span.plainlinks, .reference, .style, style").remove();
        String dataText = dataClone.html().replaceAll("\\s*\\([^)]*\\)\\s*", "");
        Document cleanedData = Jsoup.parse(dataText);
        Elements links = cleanedData.select(".plainlist ul li a, a");
        List<String> capitals = new ArrayList<>();
        if (!links.isEmpty()) {
            links.forEach(l -> { 
                String t = l.text().trim();
                if(!t.isEmpty() && !t.contains("°") && !t.matches(".*\\d+.*")) capitals.add(t); 
            });
        } else {
            capitals.add(cleanedData.text().trim());
        }
        String result = String.join(", ", capitals).replaceAll("\\s+([,.])", "$1");
        
        // Final fallback to remove unstripped coordinates left behind
        result = result.replaceAll("\\s*[0-9]+°[0-9]+′.*", "").trim();
        result = result.replaceAll("\\s*[0-9]+°[NSEW].*", "").trim();
        result = result.replaceAll("\\s*\\d+\\.\\d+;\\s*\\d+\\.\\d+.*", "").trim();
        
        country.setCapital(result);
        if (headerText.contains("largest city")) country.setLargestCity(result);
    }

    private static String parseListOrLink(Element data, String selector) {
        Element dataClone = data.clone();
        dataClone.select("sup, i, br, .reference").remove();
        Elements elements = dataClone.select(selector);
        if (!elements.isEmpty()) {
            return elements.stream().map(Element::text).collect(Collectors.joining(", "));
        }
        Element single = dataClone.select("a").first();
        if (single != null && !single.text().matches("^\\[\\d+\\]$")) {
            return single.text();
        }
        return dataClone.text();
    }

    private static void parseGDP(Element row, Country country) {
        Element curr = row.nextElementSibling();
        while (curr != null) {
            String rowText = curr.text().toLowerCase();
            if (rowText.contains("gdp") && !rowText.contains("nominal")) break; 
            if (rowText.contains("hdi") || rowText.contains("gini") || rowText.contains("currency")) break;

            Elements ths = curr.select("th");
            Elements tds = curr.select("td");
            Element labelCell = ths.isEmpty() ? (tds.size() > 1 ? tds.get(0) : null) : ths.first();
            Element valueCell = tds.isEmpty() ? null : tds.last();

            if (labelCell != null && labelCell.text().toLowerCase().contains("total") && valueCell != null && labelCell != valueCell) {
                Element dClone = valueCell.clone();
                dClone.select("span, sup, .reference").remove();
                country.setGdp(dClone.text().replaceAll("\\s*\\([^)]*\\)\\s*", "").trim());
                break;
            }
            curr = curr.nextElementSibling();
        }
    }

    private static String parseCurrency(Element data) {
        Element dataClone = data.clone();
        dataClone.select("sup, i, br, .reference").remove();
        Elements links = dataClone.select(".plainlist ul li a, a");
        if (!links.isEmpty()) {
            return links.stream()
                    .filter(l -> !l.attr("title").equalsIgnoreCase("ISO 4217"))
                    .map(l -> l.text().split("\\(")[0].trim())
                    .filter(t -> !t.isEmpty())
                    .collect(Collectors.joining(", "));
        }
        return dataClone.text().split("\\(")[0].trim();
    }

    private static void handleOtherFields(String headerText, Element data, Country country, ParserState state) {
        if (headerText.toLowerCase().contains("hdi")) {
            Element dataClone = data.clone();
            dataClone.select("sup, br, .nowrap, .reference").remove();
            country.setHdi(dataClone.text().split(" ")[0]);
        }
        if (headerText.toLowerCase().contains("language") && !state.languageFound) {
            String langs = parseListOrLink(data, ".hlist ul li, .plainlist ul li");
            langs = langs.replaceAll("(?i)^\\d+\\s+languages?\\s*,?\\s*", "");
            if (!langs.isEmpty()) {
                country.setOfficialLanguage(langs);
                state.languageFound = true;
            }
        }
    }

    private static void processImages(Element row, Country country, ParserState state) {
        if (state.flagFound) return;
        Elements imageCells = row.select("td.infobox-image, td.maptable");
        for (Element cell : imageCells) {
            for (Element img : cell.select("img")) {
                String url = "https:" + img.attr("src");
                Element descDiv = findDescriptionDiv(img);
                String alt = img.attr("alt").toLowerCase();
                
                // Broad flag heuristics
                if ((descDiv != null && descDiv.text().toLowerCase().contains("flag")) || alt.contains("flag") || url.toLowerCase().contains("flag")) {
                    if (!alt.contains("arms") && !url.toLowerCase().contains("arms") && !url.toLowerCase().contains("seal")) {
                        country.setFlagUrl(url);
                        state.flagFound = true;
                        return;
                    }
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