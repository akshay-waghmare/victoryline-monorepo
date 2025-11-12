# SSE Reconnection & Troubleshooting Guide

**Feature**: Live Cricket Match Updates via Server-Sent Events (SSE)  
**Document Version**: 1.0  
**Last Updated**: November 2025

## Table of Contents
1. [Overview](#overview)
2. [How EventSource Works](#how-eventsource-works)
3. [Automatic Reconnection Strategy](#automatic-reconnection-strategy)
4. [Connection States](#connection-states)
5. [Troubleshooting](#troubleshooting)
6. [Monitoring & Debugging](#monitoring--debugging)
7. [Performance Considerations](#performance-considerations)
8. [Production Checklist](#production-checklist)

---

## Overview

The live match updates feature uses **Server-Sent Events (SSE)** to stream real-time cricket commentary from the backend to the frontend. This document explains how the reconnection logic works and how to troubleshoot connection issues.

### Key Features
- ✅ **Automatic reconnection** with exponential backoff
- ✅ **Connection status UI** (connected/reconnecting/error)
- ✅ **Screen reader announcements** for accessibility
- ✅ **Persistent connection** for up to 24 hours
- ✅ **Event history** (last 100 events retained)

---

## How EventSource Works

### Basic Flow
```
1. Client creates EventSource('/api/live/matches/{matchId}/stream')
2. Browser establishes persistent HTTP connection
3. Server sends events as text/event-stream
4. Browser fires 'message' events for each data chunk
5. Connection stays open until closed or error occurs
```

### EventSource API
```typescript
const eventSource = new EventSource(url);

eventSource.onopen = () => {
  console.log('Connection opened');
};

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Event received:', data);
};

eventSource.onerror = (error) => {
  console.error('Connection error:', error);
  // Browser automatically retries after 3 seconds
};

// Manual close
eventSource.close();
```

### Browser Behavior
- **Automatic retry**: Browser retries connection after 3 seconds by default
- **No custom retry-time**: EventSource spec doesn't support configurable retry intervals
- **Last-Event-ID**: Browser sends last received event ID on reconnect (we don't use this)

---

## Automatic Reconnection Strategy

Our implementation adds **exponential backoff** on top of the browser's default retry:

### Exponential Backoff Parameters
```typescript
const INITIAL_DELAY = 2000;      // 2 seconds
const MAX_DELAY = 30000;         // 30 seconds
const MAX_RETRIES = 5;           // Give up after 5 attempts
const BACKOFF_MULTIPLIER = 2;    // Double delay each time
```

### Retry Schedule
| Attempt | Delay    | Total Time Elapsed |
|---------|----------|--------------------|
| 1       | 2s       | 2s                 |
| 2       | 4s       | 6s                 |
| 3       | 8s       | 14s                |
| 4       | 16s      | 30s                |
| 5       | 30s (max)| 60s                |

After 5 failed attempts (~60 seconds), the connection status shows an error and stops auto-retry.

### Implementation
```typescript
private connectToLiveUpdates(): void {
  if (this.retryCount >= this.MAX_RETRIES) {
    this.connectionStatus = 'error';
    console.error('Max reconnection attempts reached');
    return;
  }

  const url = `/api/live/matches/${this.matchId}/stream`;
  this.eventSource = new EventSource(url);

  this.eventSource.onopen = () => {
    this.connectionStatus = 'connected';
    this.retryCount = 0; // Reset on success
  };

  this.eventSource.onerror = (error) => {
    this.eventSource?.close();
    this.retryCount++;
    
    if (this.retryCount < this.MAX_RETRIES) {
      this.connectionStatus = 'reconnecting';
      const delay = Math.min(
        this.INITIAL_RECONNECT_DELAY * Math.pow(2, this.retryCount - 1),
        this.MAX_RECONNECT_DELAY
      );
      
      this.reconnectTimeout = setTimeout(() => {
        this.connectToLiveUpdates();
      }, delay);
    } else {
      this.connectionStatus = 'error';
    }
  };
}
```

---

## Connection States

### 1. Connected ✅
**Appearance**: Green banner "Connected to live updates"  
**Meaning**: SSE connection is active and events are flowing  
**User Action**: None required

### 2. Reconnecting 🔄
**Appearance**: Yellow banner "Reconnecting... (Attempt X/5)"  
**Meaning**: Connection lost, automatic retry in progress  
**User Action**: Wait for reconnection (usually < 30 seconds)

### 3. Error ❌
**Appearance**: Red banner with "Reconnect" button  
**Meaning**: Max retries exceeded, manual intervention needed  
**User Action**: Click "Reconnect" or refresh the page

### 4. Loading ⏳
**Appearance**: Spinner with "Connecting to live updates..."  
**Meaning**: Initial connection attempt in progress  
**User Action**: Wait (usually < 5 seconds)

---

## Troubleshooting

### Issue 1: Connection Immediately Fails
**Symptoms**: "Connection failed" appears within 1-2 seconds

**Possible Causes**:
1. Backend server is down
2. Nginx is not running or misconfigured
3. Network connectivity issue
4. CORS policy blocking the request

**Debug Steps**:
```bash
# 1. Check if backend is running
curl http://localhost:8099/live/matches/TEST123/stream

# 2. Check if Nginx is proxying correctly
curl http://localhost/api/live/matches/TEST123/stream

# 3. Check browser console for CORS errors
# Open DevTools → Console → Look for:
# "Access-Control-Allow-Origin" errors

# 4. Verify Nginx SSE config
grep -A 10 "location /api/live/" /etc/nginx/nginx.conf
# Should have: proxy_buffering off, chunked_transfer_encoding on
```

**Solutions**:
- Restart backend: `docker-compose restart backend`
- Restart Nginx: `nginx -s reload`
- Check firewall rules: `sudo ufw status`
- Verify environment variables: `echo $BACKEND_URL`

---

### Issue 2: Connection Drops After 60 Seconds
**Symptoms**: Initial connection works, then drops exactly at 60s mark

**Possible Causes**:
1. Nginx `proxy_read_timeout` too short
2. Load balancer timeout (e.g., AWS ALB default 60s)
3. Firewall dropping idle connections

**Debug Steps**:
```bash
# Check Nginx timeout
grep proxy_read_timeout /etc/nginx/nginx.conf
# Should be: proxy_read_timeout 86400; (24 hours)

# Monitor connection with curl
curl -N http://localhost/api/live/matches/TEST123/stream
# Wait 65 seconds - should still be connected
```

**Solutions**:
```nginx
# In nginx.conf, /api/live/ location block:
location /api/live/ {
    proxy_pass http://backend:8099/live/;
    proxy_read_timeout 86400;  # 24 hours
    proxy_buffering off;
    chunked_transfer_encoding on;
}
```

For AWS ALB:
```bash
aws elbv2 modify-target-group-attributes \
  --target-group-arn <arn> \
  --attributes Key=deregistration_delay.timeout_seconds,Value=300
```

---

### Issue 3: Events Arrive in Batches, Not Real-Time
**Symptoms**: Events appear every 10-30 seconds in groups, not individually

**Possible Causes**:
1. Nginx buffering enabled (most common!)
2. Backend using buffered output stream
3. Browser-level buffering (rare)

**Debug Steps**:
```bash
# Test raw backend (no Nginx)
curl -N http://localhost:8099/live/matches/TEST123/stream

# vs Nginx-proxied
curl -N http://localhost/api/live/matches/TEST123/stream

# If Nginx version is batched, check config
```

**Solutions**:
```nginx
# Ensure these are set in /api/live/ location:
proxy_buffering off;
proxy_cache off;
chunked_transfer_encoding on;
add_header X-Accel-Buffering "no";
```

Backend (Spring Boot):
```java
// Already correct in LiveUpdateController
SseEmitter emitter = new SseEmitter(0L); // No timeout
emitter.send(...); // Flushes immediately
```

---

### Issue 4: Rapid Reconnects Overwhelming Server
**Symptoms**: Server logs show 100+ connections/second for same matchId

**Possible Causes**:
1. Reconnect delay too short
2. Multiple tabs open to same page
3. Infinite reconnect loop (browser bug)

**Debug Steps**:
```bash
# Check backend logs for SSE_CONNECT events
tail -f /var/log/backend/spring.log | grep SSE_CONNECT

# Count connections per second
tail -f /var/log/backend/spring.log | grep SSE_CONNECT | awk '{print $1}' | uniq -c
```

**Solutions**:
```typescript
// Increase INITIAL_RECONNECT_DELAY if needed
const INITIAL_DELAY = 5000; // 5 seconds instead of 2

// Add connection ID tracking
sessionStorage.setItem('sse-connection-id', crypto.randomUUID());
// Send as query param to deduplicate
```

---

### Issue 5: Memory Leak After Long Sessions
**Symptoms**: Browser tab uses 1GB+ memory after 2 hours

**Possible Causes**:
1. Event array growing without limit
2. Old EventSource instances not closed
3. Timeout references not cleared

**Debug Steps**:
```typescript
// In browser console
console.log(this.events.length); // Should be <= 100

// Check for orphaned timeouts
// (Use Chrome DevTools → Performance → Memory)
```

**Solutions**:
```typescript
// Already implemented - verify it's working:
if (this.events.length >= 100) {
  this.events = this.events.slice(0, 100);
}

// On component destroy:
ngOnDestroy(): void {
  this.cleanup(); // Closes EventSource
}
```

---

## Monitoring & Debugging

### Backend Logs
```bash
# View SSE activity
tail -f /var/log/backend/spring.log | grep SSE_

# Sample log entries:
# INFO  SSE_CONNECT: matchId=IPL2025_01, timestamp=2025-11-12T10:30:00Z, totalClients=15
# INFO  SSE_COMPLETE: matchId=IPL2025_01, timestamp=2025-11-12T10:35:00Z, remainingClients=14
# WARN  SSE_TIMEOUT: matchId=IPL2025_01, timestamp=2025-11-12T11:00:00Z, remainingClients=13
# ERROR SSE_ERROR: matchId=IPL2025_01, error=Broken pipe
```

### Frontend Debugging
```typescript
// Enable verbose logging in LiveMatchComponent
private DEBUG = true;

connectToLiveUpdates() {
  if (this.DEBUG) {
    console.log('[SSE] Connecting to:', url);
  }
}

// Monitor connection state changes
watch(this.connectionStatus, (newStatus) => {
  console.log('[SSE] Status changed to:', newStatus);
});
```

### Browser DevTools
```javascript
// Network tab: Look for EventStream type
// Name: /api/live/matches/{matchId}/stream
// Type: eventsource
// Status: (pending) - means connected!

// Console: Enable verbose EventSource logs
// Right-click console → Settings → Enable verbose
```

### Prometheus Metrics (Optional)
```java
// Add to LiveUpdateController
@Autowired
private MeterRegistry meterRegistry;

private void recordConnection(String matchId) {
    meterRegistry.counter("sse.connections.total", 
                          "matchId", matchId).increment();
}

private void recordDisconnect(String matchId, String reason) {
    meterRegistry.counter("sse.disconnections.total",
                          "matchId", matchId, 
                          "reason", reason).increment();
}
```

---

## Performance Considerations

### Concurrency Limits
- **Per Match**: 1000+ concurrent connections (ConcurrentHashMap + CopyOnWriteArrayList)
- **Total**: Limited by server resources (memory, threads)

### Memory Usage
- **Per Connection**: ~1KB (SseEmitter overhead)
- **1000 Connections**: ~1MB
- **10,000 Connections**: ~10MB

### CPU Usage
- **Idle**: Negligible (event-driven, no polling)
- **Active Broadcasting**: ~5ms per 1000 connections (single-threaded send loop)

### Network Bandwidth
- **Idle Connection**: ~50 bytes/minute (keep-alive heartbeats)
- **Active Match**: ~500 bytes/event × 60 events/hour = 30KB/hour per client
- **1000 Clients**: 30MB/hour

### Scaling Recommendations
- **< 1000 concurrent users**: Single server fine
- **1000-10,000 users**: Add Redis Pub/Sub for horizontal scaling
- **> 10,000 users**: Consider WebSockets or CDN-based SSE (Pusher, Ably)

---

## Production Checklist

### Pre-Deployment
- [ ] Verify Nginx SSE config (`proxy_buffering off`, `chunked_transfer_encoding on`)
- [ ] Set `proxy_read_timeout` to 86400 (24 hours)
- [ ] Test reconnection logic (kill backend, should auto-reconnect)
- [ ] Load test with 100+ concurrent connections
- [ ] Monitor memory usage during 2+ hour session
- [ ] Verify CORS headers allow production domain

### Monitoring
- [ ] Set up alerts for high disconnect rate (> 10% per minute)
- [ ] Monitor SSE_ERROR logs for patterns
- [ ] Track average connection duration (should be > 30 minutes for active matches)
- [ ] Monitor backend heap memory (should be stable, not growing)

### User Experience
- [ ] Test on slow 3G network (should still reconnect gracefully)
- [ ] Verify screen reader announces connection status changes
- [ ] Check mobile browser compatibility (iOS Safari, Android Chrome)
- [ ] Test with ad blockers enabled (some block EventSource)

### Fallback Strategy
If SSE is unavailable (e.g., corporate firewall blocks):
```typescript
// Detect EventSource support
if (!window.EventSource) {
  // Fallback to polling
  this.pollInterval = setInterval(() => {
    this.http.get(`/api/live/matches/${this.matchId}/events`)
      .subscribe(events => this.events = events);
  }, 5000); // Poll every 5 seconds
}
```

---

## Additional Resources

### Related Files
- **Frontend Component**: `apps/frontend/src/app/live/live-match.component.ts`
- **Backend Controller**: `apps/backend/.../live/LiveUpdateController.java`
- **Nginx Config**: `apps/frontend/nginx.conf` (lines 160-173)
- **Unit Tests**: `apps/backend/.../live/LiveUpdateControllerTest.java`
- **Integration Tests**: `apps/backend/.../live/LiveEventIntegrationTest.java`

### External Documentation
- [MDN: EventSource API](https://developer.mozilla.org/en-US/docs/Web/API/EventSource)
- [HTML5 SSE Spec](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [Spring Boot SSE Guide](https://spring.io/guides/gs/messaging-sse/)
- [Nginx SSE Configuration](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)

### Support
- **GitHub Issues**: [victoryline-monorepo/issues](https://github.com/akshay-waghmare/victoryline-monorepo/issues)
- **Email**: support@crickzen.com
- **Slack**: #live-updates channel

---

**Last Updated**: November 12, 2025  
**Document Owner**: Backend Team  
**Review Cycle**: Quarterly
