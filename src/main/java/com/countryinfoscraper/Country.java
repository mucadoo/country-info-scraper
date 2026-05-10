package com.countryinfoscraper;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;

@JsonPropertyOrder({
    "name", "ISO_code", "flagUrl", "description", "capital", "largest_city",
    "population", "area_km2", "density_km2", "government", "official_language",
    "demonym", "gdp", "hdi", "currency", "time_zone", "calling_code", "internet_TLD"
})
public class Country {
    @JsonProperty("ISO_code")
    private String isoCode;
    private String name;
    private String flagUrl;
    private String description;
    private String capital;
    @JsonProperty("largest_city")
    private String largestCity;
    private long population;
    @JsonProperty("area_km2")
    private double areaKm2;
    @JsonProperty("density_km2")
    private double densityKm2;
    private String government;
    @JsonProperty("official_language")
    private String officialLanguage;
    private String demonym;
    @JsonInclude(JsonInclude.Include.ALWAYS)
    private Double gdp;
    @JsonInclude(JsonInclude.Include.ALWAYS)
    private Double hdi;
    private String currency;
    @JsonProperty("time_zone")
    private String timeZone;
    @JsonProperty("calling_code")
    private String callingCode;
    @JsonProperty("internet_TLD")
    private String internetTld;

    // Getters and Setters
    public String getIsoCode() { return isoCode; }
    public void setIsoCode(String isoCode) { this.isoCode = isoCode; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getFlagUrl() { return flagUrl; }
    public void setFlagUrl(String flagUrl) { this.flagUrl = flagUrl; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getCapital() { return capital; }
    public void setCapital(String capital) { this.capital = capital; }

    public String getLargestCity() { return largestCity; }
    public void setLargestCity(String largestCity) { this.largestCity = largestCity; }

    public long getPopulation() { return population; }
    public void setPopulation(long population) { this.population = population; }

    public double getAreaKm2() { return areaKm2; }
    public void setAreaKm2(double areaKm2) { this.areaKm2 = areaKm2; }

    public double getDensityKm2() { return densityKm2; }
    public void setDensityKm2(double densityKm2) { this.densityKm2 = densityKm2; }

    public String getGovernment() { return government; }
    public void setGovernment(String government) { this.government = government; }

    public String getOfficialLanguage() { return officialLanguage; }
    public void setOfficialLanguage(String officialLanguage) { this.officialLanguage = officialLanguage; }

    public String getDemonym() { return demonym; }
    public void setDemonym(String demonym) { this.demonym = demonym; }

    public Double getGdp() { return gdp; }
    public void setGdp(Double gdp) { this.gdp = gdp; }

    public Double getHdi() { return hdi; }
    public void setHdi(Double hdi) { this.hdi = hdi; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getTimeZone() { return timeZone; }
    public void setTimeZone(String timeZone) { this.timeZone = timeZone; }

    public String getCallingCode() { return callingCode; }
    public void setCallingCode(String callingCode) { this.callingCode = callingCode; }

    public String getInternetTld() { return internetTld; }
    public void setInternetTld(String internetTld) { this.internetTld = internetTld; }
}
