package com.devglan.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import javax.validation.constraints.Size;

/**
 * DTO for Venue within Upcoming Match
 * Feature 005: Upcoming Matches Feed
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class VenueDTO {
    
    @Size(max = 255, message = "Venue name must not exceed 255 characters")
    private String name;
    
    @Size(max = 128, message = "City must not exceed 128 characters")
    private String city;
    
    @Size(max = 128, message = "Country must not exceed 128 characters")
    private String country;

    public VenueDTO() {}

    public VenueDTO(String name, String city, String country) {
        this.name = name;
        this.city = city;
        this.country = country;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getCountry() {
        return country;
    }

    public void setCountry(String country) {
        this.country = country;
    }
}
