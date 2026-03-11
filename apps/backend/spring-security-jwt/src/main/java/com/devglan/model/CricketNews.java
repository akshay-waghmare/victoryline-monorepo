package com.devglan.model;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Lob;
import javax.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "cricket_news")
public class CricketNews {

    @Id
    @Column(name = "news_id")
    private String newsId;

    private String title;

    @Lob
    private String body;

    @Lob
    @Column(name = "media_url")
    private String mediaUrl;

    @Lob
    @Column(name = "news_url")
    private String newsUrl;

    private String credit;

    @Column(name = "created_timestamp")
    private Long createdTimestamp;

    @Column(name = "fetched_at")
    private LocalDateTime fetchedAt;

    public CricketNews() {}

    public String getNewsId() { return newsId; }
    public void setNewsId(String newsId) { this.newsId = newsId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }

    public String getMediaUrl() { return mediaUrl; }
    public void setMediaUrl(String mediaUrl) { this.mediaUrl = mediaUrl; }

    public String getNewsUrl() { return newsUrl; }
    public void setNewsUrl(String newsUrl) { this.newsUrl = newsUrl; }

    public String getCredit() { return credit; }
    public void setCredit(String credit) { this.credit = credit; }

    public Long getCreatedTimestamp() { return createdTimestamp; }
    public void setCreatedTimestamp(Long createdTimestamp) { this.createdTimestamp = createdTimestamp; }

    public LocalDateTime getFetchedAt() { return fetchedAt; }
    public void setFetchedAt(LocalDateTime fetchedAt) { this.fetchedAt = fetchedAt; }
}
