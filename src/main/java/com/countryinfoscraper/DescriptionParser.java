package com.countryinfoscraper;

import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;

public class DescriptionParser {

    public static void parse(Document doc, Country country) {
        Element p = doc.select("table.infobox ~ p").first();
        while (p != null && p.text().trim().isEmpty()) {
            p = p.nextElementSibling();
            while (p != null && !p.tagName().equals("p")) p = p.nextElementSibling();
        }
        if (p != null) {
            String desc = ExtractionUtils.cleanText(p);
            desc = desc.replaceAll("\\(([^()]*|\\([^()]*\\))*\\)", "").replaceAll("\\s+", " ").trim();
            desc = desc.replaceAll("\\s+([,.])", "$1");
            country.setDescription(desc);
        }
    }
}
