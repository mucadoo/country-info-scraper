package com.countryinfoscraper;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class ExtractionUtilsTest {

    @Test
    public void testExtractArea() {
        assertEquals("123456.78", ExtractionUtils.extractArea("123,456.78 <sup"));
        assertEquals("123456.78", ExtractionUtils.extractArea("123,456.78&nbsp;km<sup>2</sup>"));
    }

    @Test
    public void testExtractPopulation() {
        assertEquals("1000000", ExtractionUtils.extractPopulation("1,000,000 (2021 estimate)"));
        assertEquals("1500000", ExtractionUtils.extractPopulation("1-2 million"));
    }

    @Test
    public void testExtractDensity() {
        assertEquals("50", ExtractionUtils.extractDensity("50 <sup class=\"reference\">[1]</sup> / km<sup>2</sup>"));
        assertEquals("100", ExtractionUtils.extractDensity("100 / km<sup>2</sup>"));
    }
}