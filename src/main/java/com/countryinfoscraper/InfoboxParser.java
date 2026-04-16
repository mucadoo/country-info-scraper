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

        ParserState state = new ParserState();
        
        // Only process top-level rows of the infobox to avoid picking up data from nested tables (common in Algeria, etc.)
        Elements rows = infobox.select("> tr, > tbody > tr");
        if (rows.isEmpty()) {
            rows = infobox.select("tr");
        }

        for (Element row : rows) {
            Element header = row.select("th").first();
            Element data = row.select("td").first();

            processAreaAndPopulation(header, data, country, state);
            if (header != null && data != null) {
                processStandardFields(header, data, row, country, state);
            }
            processImages(row, country, state);
        }
        
        // Automated density calculation if missing
        if (country.getDensityKm2() == 0 && country.getPopulation() > 0 && country.getAreaKm2() > 0) {
            country.setDensityKm2((double) country.getPopulation() / country.getAreaKm2());
        }

        if (country.getLargestCity() == null || country.getLargestCity().isEmpty()) {
            country.setLargestCity(country.getCapital());
        }

        // Final fallback checks if anything is completely missing to avoid unhandled NPEs
        if (country.getDemonym() == null) country.setDemonym("");
        if (country.getCallingCode() == null) country.setCallingCode("");
        if (country.getGdp() == null) country.setGdp("");
        if (country.getOfficialLanguage() == null) country.setOfficialLanguage("");
        if (country.getCapital() == null) country.setCapital("");
        if (country.getInternetTld() == null) country.setInternetTld("");
        if (country.getLargestCity() == null) country.setLargestCity("");
    }

    private static void processAreaAndPopulation(Element header, Element data, Country country, ParserState state) {
        if (header == null) return;
        String text = header.text().toLowerCase().trim();

        // 1. Detect section transitions (main headers)
        // Main headers typically have colspan=2 and/or infobox-header class
        boolean isMainHeader = header.hasClass("infobox-header") || (header.hasAttr("colspan") && header.attr("colspan").equals("2"));

        if (isMainHeader) {
            if (text.contains("area")) {
                state.currentSection = "area";
                state.areaHeaderFound = true;
            } else if (text.contains("population")) {
                state.currentSection = "population";
                state.populationHeaderFound = true;
            } else if (text.contains("gdp") || text.contains("hdi") || text.contains("government") || text.contains("demographics") || text.contains("geography")) {
                state.currentSection = "other";
            }
        } else if (state.currentSection == null) {
            // Fallback for flat infoboxes - use exact match to avoid accidental hits like "Largest city by population"
            if (text.equals("area")) {
                state.currentSection = "area";
                state.areaHeaderFound = true;
            } else if (text.equals("population")) {
                state.currentSection = "population";
                state.populationHeaderFound = true;
            }
        }

        if (data == null) return;

        // 2. Extract based on current section
        if ("area".equals(state.currentSection) && !state.areaFound) {
            // Broaden to handle Moldova's "• Incl. Transnistria" or flat "Area" rows
            if (text.contains("total") || text.contains("land") || text.contains("•") || text.equals("area")) {
                String area = ExtractionUtils.extractArea(ExtractionUtils.cleanText(data));
                if (!area.isEmpty()) {
                    try {
                        country.setAreaKm2(Double.parseDouble(area));
                        state.areaFound = true;
                    } catch (NumberFormatException e) {
                        logger.warn("Failed to parse area for {}: '{}'", country.getName(), area);
                    }
                }
            }
        }

        if ("population".equals(state.currentSection) && !state.populationFound) {
            // Broaden to handle sub-rows or flat "Population" rows
            if (text.contains("estimate") || text.contains("census") || text.contains("total") || text.contains("•") || text.equals("population")) {
                String pop = ExtractionUtils.extractPopulation(ExtractionUtils.cleanText(data));
                if (!pop.isEmpty()) {
                    try {
                        country.setPopulation(Long.parseLong(pop));
                        state.populationFound = true;
                    } catch (NumberFormatException e) {
                        logger.warn("Failed to parse population for {}: '{}'", country.getName(), pop);
                    }
                }
            }
        }

        if (!state.densityFound && "population".equals(state.currentSection) && text.contains("density")) {
            String density = ExtractionUtils.extractDensity(ExtractionUtils.cleanText(data));
            if (!density.isEmpty()) {
                try {
                    country.setDensityKm2(Double.parseDouble(density));
                    state.densityFound = true;
                } catch (NumberFormatException e) {
                    logger.warn("Failed to parse density for {}: '{}'", country.getName(), density);
                }
            }
        }
    }

    private static void processStandardFields(Element header, Element data, Element row, Country country, ParserState state) {
        // 1. Normalize header text: Replace all whitespace types and STRIP footnotes like [a], [1], etc.
        String headerText = header.text()
                .replaceAll("\\[.*?\\]", "") // Removes footnotes from the header name
                .replaceAll("[\\s\\u00A0]+", " ") 
                .trim();

        // 2. Handle Capital / Largest City
        if (headerText.toLowerCase().contains("capital") && (headerText.length() < 30 || headerText.toLowerCase().contains("largest city") || headerText.toLowerCase().contains("center"))) {
            parseCapital(data, country, headerText);
            return;
        }

        // 3. Flexible matching
        if (headerText.toLowerCase().contains("largest city") || 
            headerText.toLowerCase().contains("largest settlement") || 
            headerText.toLowerCase().contains("largest metropolitan area")) {
            
            // Try to find the first link, but fallback to text if no link is present
            Element largestCityLink = data.select("a").first();
            String cityText = (largestCityLink != null) ? largestCityLink.text() : ExtractionUtils.cleanText(data);
            
            // If it's a list, just take the first one or clean it
            if (cityText.contains(",")) cityText = cityText.split(",")[0].trim();
            if (cityText.contains(";")) cityText = cityText.split(";")[0].trim();
            if (cityText.toLowerCase().contains("locally:")) cityText = cityText.split("(?i)locally:")[0].trim();
            
            country.setLargestCity(cityText);
        } 
        else if (headerText.toLowerCase().contains("demonym")) {
            String demonym = parseListOrLink(data, ".hlist ul li, .plainlist ul li");
            // If the demonym contains "locally:", it might be picking up sub-entities like for Denmark.
            // Let's try to get the main one which is usually at the start of the text.
            String fullText = ExtractionUtils.cleanText(data);
            if (fullText.contains(";")) {
                demonym = fullText.split(";")[0].trim();
            }
            country.setDemonym(demonym);
        } 
        else if (headerText.equalsIgnoreCase("Government")) {
            country.setGovernment(ExtractionUtils.cleanText(data));
        } 
        else if (headerText.contains("GDP") && headerText.contains("nominal")) {
            parseGDP(row, country); 
        } 
        else if (headerText.equalsIgnoreCase("Currency")) {
            country.setCurrency(parseCurrency(data));
        } 
        else if (headerText.equalsIgnoreCase("Time zone")) {
            country.setTimeZone(ExtractionUtils.cleanText(data));
        }
        // FIX: Use contains and lower case to handle "Calling code", "Calling codes", etc.
        else if (headerText.toLowerCase().contains("calling code")) {
            Element dataClone = data.clone();
            dataClone.select("sup, .reference").remove(); 
            String cc = dataClone.text().split("\\[")[0].trim();
            country.setCallingCode(cc);
        } 
        else if (headerText.contains("ISO 3166 code")) {
            country.setIsoCode(ExtractionUtils.cleanText(data));
        } 
        else if (headerText.contains("Internet TLD")) {
            Element tldClone = data.clone();
            tldClone.select("sup, .reference").remove();
            country.setInternetTld(tldClone.text().split("\\[")[0].trim());
        } 
        else {
            handleOtherFields(headerText, data, country, state);
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
        if (headerText.toLowerCase().contains("largest city")) country.setLargestCity(result);
    }

    private static String parseListOrLink(Element data, String selector) {
        Element dataClone = data.clone();
        dataClone.select("sup, i, .reference").remove();
        
        // Handle line breaks by replacing them with a space to avoid merging words
        dataClone.select("br").append(" ");
        
        Elements elements = dataClone.select(selector);
        if (!elements.isEmpty()) {
            return elements.stream()
                    .map(Element::text)
                    .map(String::trim)
                    .filter(t -> !t.isEmpty())
                    .collect(Collectors.joining(", "));
        }
        Element single = dataClone.select("a").first();
        if (single != null && !single.text().matches("^\\[\\d+\\]$")) {
            return single.text().trim();
        }
        return dataClone.text().trim();
    }

    private static void parseGDP(Element row, Country country) {
        Element curr = row.nextElementSibling();
        // Look ahead up to 3 rows to find the "Total" GDP value
        for (int i = 0; i < 3 && curr != null; i++) {
            String rowText = curr.text().toLowerCase();
            
            // Break if we hit the next major section
            if (rowText.contains("hdi") || rowText.contains("gini") || rowText.contains("currency")) break;

            Element labelCell = curr.select("th, td").first();
            Element valueCell = curr.select("td").last();

            if (labelCell != null && labelCell.text().toLowerCase().contains("total") && valueCell != null) {
                Element dClone = valueCell.clone();
                // FIX: Only remove citations and footnotes, NOT spans
                dClone.select("sup, .reference").remove(); 
                String gdpValue = dClone.text().replaceAll("\\s*\\([^)]*\\)\\s*", "").trim();
                
                // Fix typos like "$113,494 billion" -> "$113.494 billion"
                gdpValue = gdpValue.replaceAll("(\\d+),(\\d{3})\\s*(million|billion|trillion)", "$1.$2 $3");
                
                country.setGdp(gdpValue);
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
        // Broaden language matching to catch "National language", "Official language and national language", etc.
        if (headerText.toLowerCase().contains("language") && !state.languageFound) {
            String lowerHeader = headerText.toLowerCase();
            // EXCLUDE headers that are about names in those languages (e.g. "Name in official languages")
            if ((lowerHeader.contains("official") || lowerHeader.contains("national") || lowerHeader.equals("languages")) 
                 && !lowerHeader.contains("name in") && !lowerHeader.contains("native name")) {
                
                String langs = parseListOrLink(data, ".hlist ul li, .plainlist ul li");
                langs = langs.replaceAll("(?i)^\\d+\\s+languages?\\s*,?\\s*", "");
                
                // For countries like Argentina/Brazil/Russia where it might just be text like "Spanish [a]"
                if (langs.isEmpty()) {
                    langs = ExtractionUtils.cleanText(data);
                }

                if (!langs.isEmpty()) {
                    country.setOfficialLanguage(langs);
                    state.languageFound = true;
                }
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
                        country.setFlagUrl(ExtractionUtils.normalizeFlagUrl(url));
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
        String currentSection = null;
    }
}