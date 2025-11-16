# Backend Batch Support - Quick Implementation Checklist

## 📋 Implementation Checklist

### Phase 1: Create DTO Classes (✓ 15 min)

- [ ] Create `src/main/java/com/devglan/dao/BatchedCricketDataRequest.java`
  - Fields: `url`, `batchSize`, `updates`
  - Method: `isBatched()`
  
- [ ] Create `src/main/java/com/devglan/dao/BatchProcessingResult.java`
  - Fields: `status`, `totalUpdates`, `successfulUpdates`, `failedUpdates`, `processingTimeMs`
  - Methods: `success()`, `failure()`

### Phase 2: Update Controller (✓ 30 min)

- [ ] Modify `CricketDataController.java`
  - Update `@PostMapping` method signature to accept `Map<String, Object>`
  - Add batch detection logic (`requestBody.containsKey("batch_size")`)
  - Add `processBatchedRequest()` method
  - Add `processIndividualRequest()` method
  - Extract `mergeUpdate()` helper method

### Phase 3: Update Service (✓ 20 min)

- [ ] Verify `CricketDataService.java` has needed methods:
  - `getLastUpdatedData(String url)`
  - `saveCricketData(CricketDataDTO data)`
  - `broadcastToSubscribers(String url, CricketDataDTO data)`
  
- [ ] Add transaction support (`@Transactional`)

### Phase 4: Add Metrics (✓ 15 min)

- [ ] Add logging for batch processing
  - Start: "Processing batched request: url={}, batchSize={}"
  - End: "Batch processing complete: successful={}, failed={}, timeMs={}"
  
- [ ] Add error tracking
  - Log warnings for individual update failures
  - Continue processing remaining updates

### Phase 5: Testing (✓ 45 min)

- [ ] Unit Tests
  - `testIndividualUpdate_BackwardsCompatibility()`
  - `testBatchedUpdate_Success()`
  - `testBatchedUpdate_PartialFailure()`
  - `testBatchedUpdate_InvalidRequest()`

- [ ] Integration Tests
  - Send 100 batched requests
  - Verify database has final state
  - Verify WebSocket subscribers receive updates
  - Verify performance improvement

- [ ] Load Tests
  - Simulate 10 concurrent matches
  - Measure CPU/memory before and after
  - Verify 90% reduction in API calls

### Phase 6: Documentation (✓ 15 min)

- [ ] Update API documentation
- [ ] Create deployment checklist
- [ ] Document rollback procedure

---

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] All tests passing (unit + integration)
- [ ] Code review completed
- [ ] Performance benchmarks recorded
- [ ] Rollback plan prepared
- [ ] Monitoring dashboards configured

### Deployment

- [ ] Build backend: `mvn clean package`
- [ ] Tag current version: `git tag backend-v1.0-pre-batch`
- [ ] Deploy to staging environment
- [ ] Run smoke tests on staging
- [ ] Deploy to production (zero-downtime)
- [ ] Verify health endpoint responds
- [ ] Test individual format (backwards compatibility)
- [ ] Test batched format
- [ ] Monitor logs for 30 minutes

### Post-Deployment

- [ ] Monitor API call rate (should drop 90%)
- [ ] Monitor database write rate (should drop 90%)
- [ ] Monitor WebSocket broadcast rate (should drop 90%)
- [ ] Monitor error rate (should remain stable)
- [ ] Deploy updated scraper (gradual rollout)

---

## 📊 Success Criteria

### Performance Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| API calls reduced | 90% ↓ | `/actuator/metrics/http.server.requests` |
| Database writes reduced | 90% ↓ | Check `saveCricketData` call count in logs |
| WebSocket broadcasts reduced | 90% ↓ | Check `broadcastToSubscribers` call count |
| Backend CPU reduced | 60% ↓ | `docker stats backend` |
| Response time improved | 50% ↓ | Check `processing_time_ms` in logs |

### Functional Metrics

| Test | Expected Result |
|------|----------------|
| Individual update (old format) | Returns HTTP 200 "Data received successfully" |
| Batched update (new format) | Returns HTTP 200 with `BatchProcessingResult` |
| Mixed individual + batched | Both work independently |
| Partial batch failure | Successful updates processed, failed logged |
| WebSocket broadcast | Only final state sent (not intermediate) |

---

## 🔧 Code Snippets for Quick Copy-Paste

### 1. Update Controller Method Signature

**Before:**
```java
@PostMapping
public ResponseEntity<String> receiveCricketData(@RequestBody CricketDataDTO data) {
```

**After:**
```java
@PostMapping
@Transactional
public ResponseEntity<?> receiveCricketData(@RequestBody Map<String, Object> requestBody) {
    long startTime = System.currentTimeMillis();
    
    try {
        // Detect batch format
        boolean isBatched = requestBody.containsKey("batch_size") && 
                           requestBody.get("batch_size") != null;
        
        if (isBatched) {
            return processBatchedRequest(requestBody, startTime);
        } else {
            return processIndividualRequest(requestBody, startTime);
        }
    } catch (Exception e) {
        log.error("Error processing cricket data: {}", e.getMessage(), e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("status", "error", "message", e.getMessage()));
    }
}
```

### 2. Test Individual Format (Backwards Compatibility)

```bash
curl -X POST http://localhost:8099/cricket-data \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://crex.com/test",
    "score": "150/3",
    "currentRunRate": "5.2"
  }'

# Expected Response:
# "Data received successfully"
```

### 3. Test Batched Format

```bash
curl -X POST http://localhost:8099/cricket-data \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://crex.com/test",
    "batch_size": 3,
    "updates": [
      {"score": "150/3", "currentRunRate": "5.2"},
      {"score": "151/3", "currentRunRate": "5.3"},
      {"score": "152/3", "currentRunRate": "5.4"}
    ]
  }'

# Expected Response:
# {
#   "status": "success",
#   "url": "https://crex.com/test",
#   "totalUpdates": 3,
#   "successfulUpdates": 3,
#   "failedUpdates": 0,
#   "processingTimeMs": 45
# }
```

---

## ⚠️ Common Pitfalls to Avoid

### 1. Don't Break Backwards Compatibility
❌ **Wrong:** Remove old `CricketDataDTO` parameter
✅ **Right:** Accept `Map<String, Object>` and detect format

### 2. Don't Broadcast Intermediate States
❌ **Wrong:** Broadcast after each update in batch
✅ **Right:** Broadcast only final merged state

### 3. Don't Fail Entire Batch on Single Error
❌ **Wrong:** Throw exception on first failed update
✅ **Right:** Log error, continue processing, return summary

### 4. Don't Forget Transaction Management
❌ **Wrong:** Multiple database saves per batch
✅ **Right:** Single transaction with `@Transactional`

### 5. Don't Skip Logging
❌ **Wrong:** No visibility into batch processing
✅ **Right:** Log start, progress, end with metrics

---

## 🎯 Quick Start (30-Minute Implementation)

If you need to implement quickly, focus on **minimum viable changes**:

1. **5 min:** Add batch detection in controller
   ```java
   boolean isBatched = requestBody.containsKey("batch_size");
   ```

2. **10 min:** Add batch processing loop
   ```java
   for (Map<String, Object> update : updates) {
       ObjectMapper mapper = new ObjectMapper();
       CricketDataDTO dto = mapper.convertValue(update, CricketDataDTO.class);
       mergeUpdate(existingData, dto);
   }
   ```

3. **10 min:** Test with curl commands above

4. **5 min:** Deploy and monitor

**Total: 30 minutes to basic working implementation**

---

## 📞 Support & Troubleshooting

### Issue: Batch requests returning 400 Bad Request

**Cause:** ObjectMapper cannot parse batched format
**Fix:** Use `Map<String, Object>` instead of `CricketDataDTO` in controller method signature

### Issue: Individual requests stopped working

**Cause:** Broke backwards compatibility
**Fix:** Ensure `processIndividualRequest()` uses original logic

### Issue: WebSocket subscribers receiving too many updates

**Cause:** Broadcasting after each update in batch
**Fix:** Move `broadcastToSubscribers()` outside the batch loop

### Issue: Partial batch failures causing data loss

**Cause:** Transaction rolled back on any error
**Fix:** Catch exceptions inside loop, log, continue processing

---

## 📈 Monitoring Queries

### Check API Call Rate
```bash
# Before batch support (high rate)
curl http://localhost:8099/actuator/metrics/http.server.requests.count

# After batch support (should be 90% lower)
```

### Check Database Connection Pool
```bash
curl http://localhost:8099/actuator/metrics/hikaricp.connections.active
```

### Check Batch Processing Time
```bash
# Tail logs and filter for batch processing
docker logs -f backend | grep "Batch processing complete"
```

---

## ✅ Final Checklist Before Marking Complete

- [ ] All code changes committed and pushed
- [ ] All tests passing (unit + integration + load)
- [ ] Documentation updated (API docs + deployment guide)
- [ ] Deployed to production successfully
- [ ] Monitoring shows expected 90% reduction in API calls
- [ ] No errors in logs for 1 hour post-deployment
- [ ] Scraper updated and using batched format
- [ ] Frontend still receiving data correctly
- [ ] Performance metrics recorded in dashboard

---

**Estimated Time to Complete:** 2.5 hours implementation + 1 hour testing = **3.5 hours total**

**Ready to start? Begin with Phase 1: Create DTO Classes!** 🚀
