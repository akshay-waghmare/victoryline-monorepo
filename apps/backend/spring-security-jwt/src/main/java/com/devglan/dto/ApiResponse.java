package com.devglan.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;

/**
 * Standard API Response Envelope
 * Feature 005: Upcoming Matches Feed
 * 
 * Provides consistent response structure across all API endpoints
 * per Constitution III (REST API Design Standards)
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {
    
    private boolean success;
    private T data;
    private ErrorDetail error;
    private Instant timestamp;

    public ApiResponse() {
        this.timestamp = Instant.now();
    }

    public ApiResponse(boolean success, T data) {
        this.success = success;
        this.data = data;
        this.timestamp = Instant.now();
    }

    public ApiResponse(boolean success, T data, ErrorDetail error) {
        this.success = success;
        this.data = data;
        this.error = error;
        this.timestamp = Instant.now();
    }

    // Static factory methods for success responses
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, data, null);
    }

    // Static factory methods for error responses
    public static <T> ApiResponse<T> error(ErrorDetail error) {
        return new ApiResponse<>(false, null, error);
    }

    public static <T> ApiResponse<T> error(String code, String message) {
        return new ApiResponse<>(false, null, new ErrorDetail(code, message));
    }

    public static <T> ApiResponse<T> error(String code, String message, String field) {
        return new ApiResponse<>(false, null, new ErrorDetail(code, message, field));
    }

    // Getters and Setters
    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public T getData() {
        return data;
    }

    public void setData(T data) {
        this.data = data;
    }

    public ErrorDetail getError() {
        return error;
    }

    public void setError(ErrorDetail error) {
        this.error = error;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }

    /**
     * Error detail structure
     */
    public static class ErrorDetail {
        private String code;
        private String message;
        private String field;

        public ErrorDetail() {}

        public ErrorDetail(String code, String message) {
            this.code = code;
            this.message = message;
        }

        public ErrorDetail(String code, String message, String field) {
            this.code = code;
            this.message = message;
            this.field = field;
        }

        public String getCode() {
            return code;
        }

        public void setCode(String code) {
            this.code = code;
        }

        public String getMessage() {
            return message;
        }

        public void setMessage(String message) {
            this.message = message;
        }

        public String getField() {
            return field;
        }

        public void setField(String field) {
            this.field = field;
        }
    }
}
