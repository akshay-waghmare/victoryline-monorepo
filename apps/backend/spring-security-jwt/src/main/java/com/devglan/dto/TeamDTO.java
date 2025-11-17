package com.devglan.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;

/**
 * DTO for Team within Upcoming Match
 * Feature 005: Upcoming Matches Feed
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TeamDTO {
    
    @NotBlank(message = "Team name is required")
    @Size(max = 128, message = "Team name must not exceed 128 characters")
    private String name;
    
    @Size(max = 16, message = "Team code must not exceed 16 characters")
    private String code;

    public TeamDTO() {}

    public TeamDTO(String name, String code) {
        this.name = name;
        this.code = code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }
}
