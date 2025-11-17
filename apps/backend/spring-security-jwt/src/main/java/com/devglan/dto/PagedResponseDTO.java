package com.devglan.dto;

import java.util.List;

/**
 * DTO for Paginated Response
 * Feature 005: Upcoming Matches Feed
 */
public class PagedResponseDTO<T> {
    
    private List<T> items;
    private int page;
    private int pageSize;
    private long total;

    public PagedResponseDTO() {}

    public PagedResponseDTO(List<T> items, int page, int pageSize, long total) {
        this.items = items;
        this.page = page;
        this.pageSize = pageSize;
        this.total = total;
    }

    public List<T> getItems() {
        return items;
    }

    public void setItems(List<T> items) {
        this.items = items;
    }

    public int getPage() {
        return page;
    }

    public void setPage(int page) {
        this.page = page;
    }

    public int getPageSize() {
        return pageSize;
    }

    public void setPageSize(int pageSize) {
        this.pageSize = pageSize;
    }

    public long getTotal() {
        return total;
    }

    public void setTotal(long total) {
        this.total = total;
    }
}
