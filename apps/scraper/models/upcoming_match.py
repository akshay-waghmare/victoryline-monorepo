"""
Upcoming Match Data Model
Feature 005: Upcoming Matches Feed

Python dataclass for upcoming cricket fixtures with validation.
Represents normalized fixture data before upsert to backend.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from enum import Enum


class MatchStatus(str, Enum):
    """Match status enum matching backend entity"""
    SCHEDULED = "scheduled"
    POSTPONED = "postponed"
    CANCELLED = "cancelled"


@dataclass
class UpcomingMatch:
    """
    Dataclass for upcoming cricket fixture
    
    All fields match the backend UpcomingMatch entity schema
    per data-model.md specifications.
    """
    
    # Required fields
    source: str  # e.g., "crex"
    source_key: str  # Stable key/URL slug from source
    series_name: str
    match_title: str
    team_a_name: str
    team_b_name: str
    start_time_utc: datetime
    last_scraped_at: datetime
    
    # Optional fields
    team_a_code: Optional[str] = None  # e.g., "IND"
    team_b_code: Optional[str] = None  # e.g., "AUS"
    venue_name: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    status: MatchStatus = MatchStatus.SCHEDULED
    notes: Optional[str] = None
    
    # Auto-generated fields (set by backend)
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    def __post_init__(self):
        """Validate fields after initialization"""
        # Trim and validate required string fields
        self.source = self.source.strip() if self.source else ""
        self.source_key = self.source_key.strip() if self.source_key else ""
        self.series_name = self.series_name.strip() if self.series_name else ""
        self.match_title = self.match_title.strip() if self.match_title else ""
        self.team_a_name = self.team_a_name.strip() if self.team_a_name else ""
        self.team_b_name = self.team_b_name.strip() if self.team_b_name else ""
        
        # Validate required fields
        if not self.source:
            raise ValueError("source cannot be empty")
        if not self.source_key:
            raise ValueError("source_key cannot be empty")
        if not self.series_name:
            raise ValueError("series_name cannot be empty")
        if not self.match_title:
            raise ValueError("match_title cannot be empty")
        if not self.team_a_name:
            raise ValueError("team_a_name cannot be empty")
        if not self.team_b_name:
            raise ValueError("team_b_name cannot be empty")
        
        # Validate length constraints
        if len(self.source) > 32:
            raise ValueError(f"source too long: {len(self.source)} > 32")
        if len(self.source_key) > 128:
            raise ValueError(f"source_key too long: {len(self.source_key)} > 128")
        if len(self.series_name) > 255:
            self.series_name = self.series_name[:255]  # Truncate
        if len(self.match_title) > 255:
            self.match_title = self.match_title[:255]  # Truncate
        if len(self.team_a_name) > 128:
            self.team_a_name = self.team_a_name[:128]
        if len(self.team_b_name) > 128:
            self.team_b_name = self.team_b_name[:128]
        
        # Validate and normalize team codes
        if self.team_a_code:
            self.team_a_code = self.team_a_code.strip().upper()
            if len(self.team_a_code) > 16:
                self.team_a_code = self.team_a_code[:16]
        
        if self.team_b_code:
            self.team_b_code = self.team_b_code.strip().upper()
            if len(self.team_b_code) > 16:
                self.team_b_code = self.team_b_code[:16]
        
        # Validate optional string lengths
        if self.venue_name and len(self.venue_name) > 255:
            self.venue_name = self.venue_name[:255]
        if self.city and len(self.city) > 128:
            self.city = self.city[:128]
        if self.country and len(self.country) > 128:
            self.country = self.country[:128]
        if self.notes and len(self.notes) > 512:
            self.notes = self.notes[:512]
        
        # Ensure status is a MatchStatus enum
        if isinstance(self.status, str):
            self.status = MatchStatus(self.status.lower())

    def to_dict(self) -> dict:
        """Convert to dictionary for API payload"""
        return {
            "id": self.id,
            "source": self.source,
            "sourceKey": self.source_key,
            "seriesName": self.series_name,
            "matchTitle": self.match_title,
            "teamA": {
                "name": self.team_a_name,
                "code": self.team_a_code
            },
            "teamB": {
                "name": self.team_b_name,
                "code": self.team_b_code
            },
            "startTime": self.start_time_utc.timestamp() if self.start_time_utc else None,
            "venue": {
                "name": self.venue_name,
                "city": self.city,
                "country": self.country
            } if (self.venue_name or self.city or self.country) else None,
            "status": self.status.value,
            "notes": self.notes,
            "lastUpdated": self.last_scraped_at.timestamp() if self.last_scraped_at else None
        }

    @classmethod
    def from_dict(cls, data: dict) -> "UpcomingMatch":
        """Create from dictionary (e.g., API response)"""
        team_a = data.get("teamA", {})
        team_b = data.get("teamB", {})
        venue = data.get("venue", {})
        
        return cls(
            id=data.get("id"),
            source=data.get("source"),
            source_key=data.get("sourceKey"),
            series_name=data.get("seriesName"),
            match_title=data.get("matchTitle"),
            team_a_name=team_a.get("name"),
            team_b_name=team_b.get("name"),
            team_a_code=team_a.get("code"),
            team_b_code=team_b.get("code"),
            start_time_utc=datetime.fromisoformat(data["startTime"].replace("Z", "+00:00")) if data.get("startTime") else None,
            venue_name=venue.get("name") if venue else None,
            city=venue.get("city") if venue else None,
            country=venue.get("country") if venue else None,
            status=MatchStatus(data.get("status", "scheduled")),
            notes=data.get("notes"),
            last_scraped_at=datetime.fromisoformat(data["lastUpdated"].replace("Z", "+00:00")) if data.get("lastUpdated") else None,
            created_at=datetime.fromisoformat(data["createdAt"].replace("Z", "+00:00")) if data.get("createdAt") else None,
            updated_at=datetime.fromisoformat(data["updatedAt"].replace("Z", "+00:00")) if data.get("updatedAt") else None
        )
