package com.countryinfoscraper;

import org.jsoup.nodes.Element;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class ExtractionUtils {

    // Method to clean text from unnecessary elements like superscripts and coordinates
    public static String cleanText(Element element) {
        if (element == null) return "";
        element.select("sup").remove(); // Remove sup elements
        element.select(".geo-inline").remove(); // Remove coordinates
        return element.text().trim();
    }

    // Method to extract area in km² from HTML string
    public static String extractArea(String html) {
        if (html == null || html.isEmpty()) return "";
        // Pattern to match area values with commas and optional decimal points
        Pattern pattern1 = Pattern.compile("^(\\d{1,3}(?:,\\d{3})*(?:\\.\\d+)?)(?:<sup|<)");
        Pattern pattern2 = Pattern.compile("(\\d{1,3}(?:,\\d{3})*(?:\\.\\d+)?)\\s*&nbsp;km<sup>2</sup>");

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
    public static String extractPopulation(String html) {
        if (html == null || html.isEmpty()) return "";
        // Pattern to match population ranges, excluding values within parentheses
        Pattern pattern = Pattern.compile("([0-9,.]+)\\s*[–-]\\s*([0-9,.]+)\\s*(million|billion)?(?=\\s*(?:<sup|<span|<br|\\(|<))");
        Matcher matcher = pattern.matcher(html);

        // Check for ranges first
        if (matcher.find()) {
            double low = Double.parseDouble(matcher.group(1).replace(",", ""));
            double high = Double.parseDouble(matcher.group(2).replace(",", ""));
            double average = (low + high) / 2;

            // Adjust based on the multiplier (million or billion)
            String multiplier = matcher.group(3);
            if (multiplier != null) {
                switch (multiplier.toLowerCase()) {
                    case "million":
                        average *= 1_000_000;
                        break;
                    case "billion":
                        average *= 1_000_000_000;
                        break;
                }
            }
            return String.format("%.0f", average); // Return without decimal places
        }

        // Fallback pattern to match single population number
        pattern = Pattern.compile("([0-9,]+)(?=\\s*(?:<sup|<span|<br|\\(|<))");
        matcher = pattern.matcher(html);
        if (matcher.find()) {
            return matcher.group(1).replace(",", "");
        }

        return "";
    }

    // Method to extract density in km² from HTML string
    public static String extractDensity(String html) {
        if (html == null || html.isEmpty()) return "";
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
