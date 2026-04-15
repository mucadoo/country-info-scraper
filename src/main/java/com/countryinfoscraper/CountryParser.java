package com.countryinfoscraper;

import org.jsoup.nodes.Document;

public class CountryParser {

    /**
     * Orchestrates the parsing of a Wikipedia country document.
     * Delegates specific parsing tasks to specialized parsers.
     */
    public static Country parseCountry(Document doc) {
        Country country = new Country();
        
        // Use InfoboxParser for structured data table
        InfoboxParser.parse(doc, country);
        
        // Use DescriptionParser for the summary paragraph
        DescriptionParser.parse(doc, country);

        return country;
    }
}
