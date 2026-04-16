package com.countryinfoscraper;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class ExtractionUtilsTest {

    @Test
    public void testExtractArea() {
        assertEquals("123456.78", ExtractionUtils.extractArea("123,456.78"));
        assertEquals("123456.78", ExtractionUtils.extractArea("123,456.78 km2"));
        assertEquals("123456", ExtractionUtils.extractArea("123.456 km2")); // Dot separator
        // US/Liberia case: Pick km2 even if sq mi is present
        assertEquals("9833517", ExtractionUtils.extractArea("9,833,517 km2 (3,796,742 sq mi)"));
        assertEquals("111369", ExtractionUtils.extractArea("43,000 sq mi (111,369 km2)"));
    }

    @Test
    public void testExtractPopulation() {
        assertEquals("1000000", ExtractionUtils.extractPopulation("1,000,000 (2021 estimate)"));
        assertEquals("1500000", ExtractionUtils.extractPopulation("1-2 million"));
        assertEquals("1404890000", ExtractionUtils.extractPopulation("1,404,890,000 (2020)"));
        assertEquals("5461319", ExtractionUtils.extractPopulation("5,461,319 (2026 estimate)"));
    }

    @Test
    public void testExtractDensity() {
        assertEquals("50", ExtractionUtils.extractDensity("50 / km2"));
        assertEquals("140.9", ExtractionUtils.extractDensity("140.9/km2 (364.9/sq mi)"));
    }
}