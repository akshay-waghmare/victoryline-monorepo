# Quickstart: Completed Matches Feature

**Feature**: 008-completed-matches  
**Date**: December 7, 2025  
**Purpose**: Quick reference for developers implementing or maintaining the completed matches feature

## Overview

This feature makes the existing "Completed" tab functional by adding a backend API endpoint that returns up to 20 most recently completed cricket matches. No database schema changes required - uses existing `LIVE_MATCH` table with `isDeleted=true` filter.

## Prerequisites

- Java 8/11+ (Spring Boot 2.x)
- Node.js + npm (Angular CLI 6.x/7.x)
- H2 Database Console access (http://localhost:8099/h2-console)
- Git branch: `008-completed-matches`

## Quick Setup

### 1. Backend Development

**Location**: `apps/backend/spring-security-jwt/`

```bash
# Navigate to backend
cd apps/backend/spring-security-jwt

# Run tests
mvn test

# Start backend server (port 8080)
mvn spring-boot:run
```

**Key Files**:
- `src/main/java/com/devglan/controller/MatchController.java` - Add `/completed` endpoint
- `src/main/java/com/devglan/service/MatchService.java` - Add `getCompletedMatches()` method
- `src/main/java/com/devglan/dao/LiveMatchRepository.java` - Add custom query method

### 2. Frontend Development

**Location**: `apps/frontend/`

```bash
# Navigate to frontend
cd apps/frontend

# Install dependencies (if needed)
npm install

# Start dev server (port 4200)
ng serve

# Run tests
ng test
```

**Key Files**:
- `src/app/features/matches/services/matches.service.ts` - Add `getCompletedMatches()` method
- `src/app/features/matches/pages/matches-list/matches-list.component.ts` - Wire API to Completed tab

### 3. Test the Feature

```bash
# 1. Start backend (terminal 1)
cd apps/backend/spring-security-jwt
mvn spring-boot:run

# 2. Start frontend (terminal 2)
cd apps/frontend
ng serve

# 3. Open browser
http://localhost:4200

# 4. Login with test credentials
# Navigate to Matches page
# Click "Completed" tab
# Should see up to 20 completed matches
```

## Implementation Checklist

### Backend Tasks
- [ ] Add `getCompletedMatches()` method to `MatchService`
  - Query: `WHERE isDeleted=true ORDER BY updatedAt DESC LIMIT 20`
- [ ] Add custom repository method to `LiveMatchRepository`
  - Use Spring Data JPA `Pageable` for LIMIT clause
- [ ] Add `/api/v1/matches/completed` endpoint to `MatchController`
  - Use `@GetMapping("/completed")`
  - Return constitution-standard response format
- [ ] Add unit tests for service layer
- [ ] Add integration tests for controller/endpoint
- [ ] Test with H2 console (verify query returns correct data)

### Frontend Tasks
- [ ] Add `getCompletedMatches()` method to `MatchesService`
  - HTTP GET to `/api/v1/matches/completed`
  - Return `Observable<Match[]>`
- [ ] Update `matches-list.component.ts`
  - Call `getCompletedMatches()` when Completed tab clicked
  - Handle loading state
  - Handle error state (show retry message)
  - Update tab count badge
- [ ] Add error message with retry button
  - "Unable to load completed matches. Tap to retry"
- [ ] Add unit tests for service
- [ ] Add component tests for Completed tab behavior

## Key Implementation Details

### Backend Query (JPA Repository)

```java
@Repository
public interface LiveMatchRepository extends JpaRepository<LiveMatch, Long> {
    
    @Query("SELECT m FROM LiveMatch m WHERE m.isDeleted = true ORDER BY m.updatedAt DESC")
    List<LiveMatch> findCompletedMatches(Pageable pageable);
}
```

### Backend Service

```java
@Service
public class MatchService {
    
    @Autowired
    private LiveMatchRepository liveMatchRepository;
    
    public List<LiveMatch> getCompletedMatches() {
        Pageable limit = PageRequest.of(0, 20);
        return liveMatchRepository.findCompletedMatches(limit);
    }
}
```

### Backend Controller

```java
@RestController
@RequestMapping("/api/v1/matches")
public class MatchController {
    
    @Autowired
    private MatchService matchService;
    
    @GetMapping("/completed")
    public ResponseEntity<ApiResponse> getCompletedMatches() {
        try {
            List<LiveMatch> matches = matchService.getCompletedMatches();
            return ResponseEntity.ok(new ApiResponse(true, matches, null, Instant.now()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(
                new ApiResponse(false, null, 
                    new ErrorDetail("INTERNAL_SERVER_ERROR", 
                        "Failed to retrieve completed matches", null),
                    Instant.now())
            );
        }
    }
}
```

### Frontend Service (TypeScript)

```typescript
@Injectable({ providedIn: 'root' })
export class MatchesService {
  private apiUrl = '/api/v1';

  constructor(private http: HttpClient) {}

  getCompletedMatches(): Observable<Match[]> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/matches/completed`).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error fetching completed matches:', error);
        return throwError(() => error);
      })
    );
  }
}
```

### Frontend Component (TypeScript)

```typescript
export class MatchesListComponent implements OnInit {
  completedMatches: Match[] = [];
  loading = false;
  error: string | null = null;

  constructor(private matchesService: MatchesService) {}

  onTabChange(tabId: string) {
    if (tabId === 'COMPLETED') {
      this.loadCompletedMatches();
    }
  }

  loadCompletedMatches() {
    this.loading = true;
    this.error = null;

    this.matchesService.getCompletedMatches().subscribe({
      next: (matches) => {
        this.completedMatches = matches;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Unable to load completed matches. Tap to retry';
        this.loading = false;
      }
    });
  }

  retryLoadCompletedMatches() {
    this.loadCompletedMatches();
  }
}
```

## Testing Guide

### Backend Testing

```java
@SpringBootTest
@AutoConfigureMockMvc
public class MatchControllerTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @Test
    @WithMockUser
    public void testGetCompletedMatches_ReturnsSuccess() throws Exception {
        mockMvc.perform(get("/api/v1/matches/completed"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data").isArray());
    }
    
    @Test
    public void testGetCompletedMatches_RequiresAuth() throws Exception {
        mockMvc.perform(get("/api/v1/matches/completed"))
            .andExpect(status().isUnauthorized());
    }
}
```

### Frontend Testing

```typescript
describe('MatchesService', () => {
  let service: MatchesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [MatchesService]
    });
    service = TestBed.inject(MatchesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should fetch completed matches', () => {
    const mockResponse = {
      success: true,
      data: [{ id: 1, url: 'test', isDeleted: true }],
      error: null
    };

    service.getCompletedMatches().subscribe(matches => {
      expect(matches.length).toBe(1);
      expect(matches[0].id).toBe(1);
    });

    const req = httpMock.expectOne('/api/v1/matches/completed');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });
});
```

## Database Verification

### H2 Console Query

```sql
-- Access H2 Console: http://localhost:8099/h2-console
-- JDBC URL: jdbc:h2:file:./testdb
-- Username: sa
-- Password: (empty)

-- View completed matches (same as API query)
SELECT * FROM LIVE_MATCH 
WHERE isDeleted = true 
ORDER BY updatedAt DESC 
LIMIT 20;

-- Count total completed matches
SELECT COUNT(*) FROM LIVE_MATCH WHERE isDeleted = true;

-- Check if index exists
SELECT * FROM INFORMATION_SCHEMA.INDEXES 
WHERE TABLE_NAME = 'LIVE_MATCH' AND INDEX_NAME = 'idx_is_deleted';
```

## Troubleshooting

### Backend Issues

**Problem**: No matches returned  
**Solution**: Check if any matches have `isDeleted=true` in database using H2 console

**Problem**: 401 Unauthorized  
**Solution**: Ensure JWT token is included in Authorization header

**Problem**: 500 Internal Server Error  
**Solution**: Check backend logs for stack trace, verify database connection

### Frontend Issues

**Problem**: Completed tab shows empty state  
**Solution**: Open browser DevTools Network tab, verify API call succeeds and returns data

**Problem**: Error message persists  
**Solution**: Check backend is running on port 8080, verify CORS configuration

**Problem**: Tab count badge shows 0  
**Solution**: Verify `completedMatchesCount` getter returns `completedMatches.length`

## Configuration

### Backend (application.properties)

```properties
# Database (H2 embedded)
spring.datasource.url=jdbc:h2:file:./testdb
spring.datasource.username=sa
spring.datasource.password=
spring.h2.console.enabled=true

# JPA/Hibernate
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true

# Server
server.port=8080
```

### Frontend (environment.ts)

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api/v1'
};
```

## Performance Targets

- Backend API response: <200ms
- Frontend load time: <2 seconds
- Database query: <50ms (with index)
- Max matches returned: 20 (enforced by LIMIT clause)

## Next Steps After Implementation

1. Merge feature branch to `develop`
2. Deploy to staging environment
3. Perform manual QA testing
4. Monitor performance metrics
5. Deploy to production
6. Update API documentation

## Related Documentation

- [Feature Specification](./spec.md)
- [Data Model](./data-model.md)
- [Research](./research.md)
- [API Contract](./contracts/completed-matches-api.yaml)
- [Constitution](./.specify/memory/constitution.md)

## Support

For questions or issues:
- Check [troubleshooting section](#troubleshooting) above
- Review [data-model.md](./data-model.md) for database details
- Consult [research.md](./research.md) for implementation decisions
