package com.countryinfoscraper;

import org.jsoup.nodes.Element;
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

    public static String extractArea(String html) {
        if (html == null || html.isEmpty()) return "";
        // Support both comma and dot as thousands separators, and handle decimal dots.
        // prioritized for English Wikipedia (comma thousands, dot decimal)
        Pattern pattern = Pattern.compile("([0-9]{1,3}(?:,[0-9]{3})*(?:\\.\\d+)?)(?:\\s*<sup|\\s*<|\\s*&nbsp;km|\\s*km|\\s*sq\\s*mi)");
        Matcher matcher = pattern.matcher(html);

        if (matcher.find()) {
            return matcher.group(1).replace(",", "");
        }
        
        // Fallback for cases using dots as thousands separators (e.g. 1.234.567)
        pattern = Pattern.compile("([0-9]{1,3}(?:\\.[0-9]{3})+)(?:\\s*<sup|\\s*<|\\s*&nbsp;km|\\s*km|\\s*sq\\s*mi)");
        matcher = pattern.matcher(html);
        if (matcher.find()) {
            return matcher.group(1).replace(".", "");
        }

        return "";
    }

    public static String extractPopulation(String html) {
        if (html == null || html.isEmpty()) return "";
        
        // 1. Range match: "1.2 - 1.5 million"
        Pattern pattern = Pattern.compile("([0-9,.]+)\\s*[–-]\\s*([0-9,.]+)\\s*(million|billion)?(?=\\s*(?:<sup|<span|<br|\\(|<|\\s|$))");
        Matcher matcher = pattern.matcher(html);

        if (matcher.find()) {
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
            return String.format("%.0f", average);
        }

        // 2. Single value with million/billion: "1.5 million"
        pattern = Pattern.compile("([0-9,.]+)\\s*(million|billion)(?=\\s*(?:<sup|<span|<br|\\(|<|\\s|$))");
        matcher = pattern.matcher(html);
        if (matcher.find()) {
            double val = Double.parseDouble(matcher.group(1).replace(",", ""));
            String multiplier = matcher.group(2).toLowerCase();
            if (multiplier.equals("million")) val *= 1_000_000;
            else if (multiplier.equals("billion")) val *= 1_000_000_000;
            return String.format("%.0f", val);
        }

        // 3. Regular numbers with commas or dots as thousands separators
        // Matches 1,234,567 or 1.234.567 or 1234567
        pattern = Pattern.compile("([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]{4,})(?=\\s*(?:<sup|<span|<br|\\(|<|\\s|$))");
        matcher = pattern.matcher(html);
        while (matcher.find()) {
            String match = matcher.group(1).replace(",", "").replace(".", "");
            // Filter out common year-like numbers (19xx, 20xx) unless they are very long
            if (match.length() > 4 || (!match.startsWith("20") && !match.startsWith("19"))) {
                return match;
            }
        }
        
        // 4. Fallback for very small populations (under 1000)
        pattern = Pattern.compile("([0-9]+)(?=\\s*(?:<sup|<span|<br|\\(|<|\\s|$))");
        matcher = pattern.matcher(html);
        if (matcher.find()) {
            return matcher.group(1);
        }

        return "";
    }

    public static String extractDensity(String html) {
        if (html == null || html.isEmpty()) return "";
        Pattern pattern = Pattern.compile("([0-9,.]+)(?=\\s*(?:<sup[^>]*>.*?</sup>\\s*)?/?\\s*km)");
        Matcher matcher = pattern.matcher(html);
        if (matcher.find()) {
            return matcher.group(1).replace(",", "");
        }
        return "";
    }
}