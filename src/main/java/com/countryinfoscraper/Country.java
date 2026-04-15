package com.countryinfoscraper;

public class Country {
    private String isoCode;
    private String name;
    private String flagUrl;
    private String description;
    private String capital;
    private String largestCity;
    private long population;
    private double areaKm2;
    private double densityKm2;
    private String government;
    private String officialLanguage;
    private String demonym;
    private String gdp;
    private String hdi;
    private String currency;
    private String timeZone;
    private String callingCode;
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

    public String getGdp() { return gdp; }
    public void setGdp(String gdp) { this.gdp = gdp; }

    public String getHdi() { return hdi; }
    public void setHdi(String hdi) { this.hdi = hdi; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getTimeZone() { return timeZone; }
    public void setTimeZone(String timeZone) { this.timeZone = timeZone; }

    public String getCallingCode() { return callingCode; }
    public void setCallingCode(String callingCode) { this.callingCode = callingCode; }

    public String getInternetTld() { return internetTld; }
    public void setInternetTld(String internetTld) { this.internetTld = internetTld; }
}
