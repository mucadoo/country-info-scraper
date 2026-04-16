package com.countryinfoscraper;

import org.jsoup.nodes.Element;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class ExtractionUtils {

    public static String cleanText(Element element) {
        if (element == null) return "";
        Element clone = element.clone();
        // REMOVED 'span' and '.style' from removal list to preserve text within formatted spans
        clone.select("sup, .reference, .geo-inline, .geo-default, .geo-dms, .geo-dec, span.plainlinks, style").remove();
        // Normalize spaces (replaces NBSP and multiple spaces with one space)
        return clone.text().replaceAll("[\\s\\u00A0]+", " ").trim();
    }

    public static String extractArea(String text) {
        if (text == null || text.isEmpty()) return "";

        // Normalize text: remove hidden markers and replace km² with km2
        String normalized = text.replace("\u200E", "").replace("\u200F", "").replace("km\u00B2", "km2").replace("&nbsp;", " ");

        // 1. Try to find km2 specifically first to avoid picking sq mi
        // Case A: Standard English format (1,234,567.89 km2)
        Pattern kmPattern = Pattern.compile("([0-9]{1,3}(?:,[0-9]{3})+(?:\\.\\d+)?)\\s*km2?");
        Matcher kmMatcher = kmPattern.matcher(normalized);
        if (kmMatcher.find()) {
            return kmMatcher.group(1).replace(",", "");
        }
        
        // Case B: Single number with optional decimal (123.45 km2)
        kmPattern = Pattern.compile("([0-9]+(?:\\.\\d+)?)\\s*km2?");
        kmMatcher = kmPattern.matcher(normalized);
        if (kmMatcher.find()) {
            return kmMatcher.group(1);
        }

        // 2. Fallback to general area pattern if km is not found (might pick sq mi)
        Pattern pattern = Pattern.compile("([0-9]{1,3}(?:[.,][0-9]{3})*(?:\\.\\d+)?)(?:\\s*sq\\s*mi|\\s*<|\\s*$)");
        Matcher matcher = pattern.matcher(normalized);

        if (matcher.find()) {
            return matcher.group(1).replace(",", "");
        }

        return "";
    }

    public static String extractPopulation(String text) {
        if (text == null || text.isEmpty()) return "";
        
        // Normalize text: remove hidden markers
        String normalized = text.replace("\u200E", "").replace("\u200F", "");

        // 1. Range match: "1.2 - 1.5 million"
        Pattern pattern = Pattern.compile("([0-9,.]+)\\s*[–-]\\s*([0-9,.]+)\\s*(million|billion)?(?=\\s*(?:\\(|\\s|$))");
        Matcher matcher = pattern.matcher(normalized);

        if (matcher.find()) {
            try {
                double low = Double.parseDouble(matcher.group(1).replace(",", ""));
                double high = Double.parseDouble(matcher.group(2).replace(",", ""));
                double average = (low + high) / 2;

                String multiplier = matcher.group(3);
                if (multiplier != null) {
                    switch (multiplier.toLowerCase()) {
                        case "million": average *= 1_000_000; break;
                        case "billion": average *= 1_000_000_000; break;
                    }
                }
                return String.format(Locale.ROOT, "%.0f", average);
            } catch (NumberFormatException e) {
                // Ignore and try next pattern
            }
        }

        // 2. Single value with million/billion: "1.5 million"
        pattern = Pattern.compile("([0-9,.]+)\\s*(million|billion)(?=\\s*(?:\\(|\\s|$))");
        matcher = pattern.matcher(normalized);
        if (matcher.find()) {
            try {
                double val = Double.parseDouble(matcher.group(1).replace(",", ""));
                String multiplier = matcher.group(2).toLowerCase();
                if (multiplier.equals("million")) val *= 1_000_000;
                else if (multiplier.equals("billion")) val *= 1_000_000_000;
                return String.format(Locale.ROOT, "%.0f", val);
            } catch (NumberFormatException e) {
                // Ignore and try next pattern
            }
        }

        // 3. Regular numbers with commas or dots as thousands separators
        // Matches 1,234,567 or 1.234.567 or 1234567
        pattern = Pattern.compile("([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]{4,})(?=\\s*(?:\\(|\\s|$))");
        matcher = pattern.matcher(normalized);
        while (matcher.find()) {
            String match = matcher.group(1).replace(",", "").replace(".", "");
            // System.out.println("Match: " + match + " Length: " + match.length());
            // Filter out common year-like numbers (19xx, 20xx) unless they are very long
            if (match.length() > 4 || (!match.startsWith("20") && !match.startsWith("19"))) {
                return match;
            }
        }
        
        // 4. Fallback for very small populations (under 1000)
        pattern = Pattern.compile("([0-9]+)(?=\\s*(?:\\(|\\s|$))");
        matcher = pattern.matcher(normalized);
        if (matcher.find()) {
            return matcher.group(1);
        }

        return "";
    }

    public static String extractDensity(String text) {
        if (text == null || text.isEmpty()) return "";
        // Normalize text: remove hidden markers
        String normalized = text.replace("\u200E", "").replace("\u200F", "");
        Pattern pattern = Pattern.compile("([0-9,.]+)(?=\\s*/?\\s*km)");
        Matcher matcher = pattern.matcher(normalized);
        if (matcher.find()) {
            return matcher.group(1).replace(",", "");
        }
        return "";
    }
}