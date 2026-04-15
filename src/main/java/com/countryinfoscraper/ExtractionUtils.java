package com.countryinfoscraper;

import org.jsoup.nodes.Element;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class ExtractionUtils {

    public static String cleanText(Element element) {
        if (element == null) return "";
        Element clone = element.clone();
        clone.select("sup, .reference, .geo-inline, .geo-default, .geo-dms, .geo-dec, span.plainlinks, .style, style").remove();
        return clone.text().trim();
    }

    public static String extractArea(String html) {
        if (html == null || html.isEmpty()) return "";
        Pattern pattern = Pattern.compile("([0-9]{1,3}(?:,[0-9]{3})*(?:\\.\\d+)?)(?:\\s*<sup|\\s*<|\\s*&nbsp;km|\\s*km|\\s*sq\\s*mi)");
        Matcher matcher = pattern.matcher(html);

        if (matcher.find()) {
            return matcher.group(1).replace(",", "");
        }
        return "";
    }

    public static String extractPopulation(String html) {
        if (html == null || html.isEmpty()) return "";
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

        pattern = Pattern.compile("([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)(?=\\s*(?:<sup|<span|<br|\\(|<|\\s|$))");
        matcher = pattern.matcher(html);
        while (matcher.find()) {
            String match = matcher.group(1).replace(",", "");
            if (match.length() > 4 || (!match.startsWith("20") && !match.startsWith("19"))) {
                return match;
            }
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