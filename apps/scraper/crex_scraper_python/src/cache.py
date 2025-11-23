"""
Redis Cache Wrapper for Scraper.
Handles snapshots, freshness tracking, and deduplication.
"""

import json
import logging
import time
from typing import Optional, Any, Dict, List

import redis.asyncio as redis
from .config import get_settings

logger = logging.getLogger(__name__)

class ScrapeCache:
    """
    Async Redis cache wrapper for scraper state.
    """

    def __init__(self):
        self.settings = get_settings()
        self._redis: Optional[redis.Redis] = None

    async def connect(self):
        """Initialize Redis connection."""
        if self._redis:
            return
        
        logger.info(f"Connecting to Redis at {self.settings.redis_url}")
        self._redis = redis.from_url(
            self.settings.redis_url, 
            decode_responses=True,
            socket_connect_timeout=5.0
        )
        try:
            await self._redis.ping()
            logger.info("Redis connected successfully.")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise

    async def close(self):
        """Close Redis connection."""
        if self._redis:
            await self._redis.close()
            self._redis = None

    def _key_snapshot(self, match_id: str) -> str:
        return f"match:{match_id}:snapshot"

    def _key_history(self, match_id: str) -> str:
        return f"match:{match_id}:history"

    def _key_freshness(self, match_id: str) -> str:
        return f"match:{match_id}:freshness"

    def _key_negative(self, match_id: str) -> str:
        return f"match:{match_id}:missing"

    async def set_snapshot(self, match_id: str, data: Dict[str, Any], ttl: int = 300):
        """
        Cache the latest match snapshot.
        """
        if not self._redis:
            return

        key = self._key_snapshot(match_id)
        serialized = json.dumps(data)
        await self._redis.set(key, serialized, ex=ttl)

    async def get_snapshot(self, match_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve the latest match snapshot.
        """
        if not self._redis:
            return None

        key = self._key_snapshot(match_id)
        data = await self._redis.get(key)
        if data:
            return json.loads(data)
        return None

    async def push_history(self, match_id: str, data: Dict[str, Any], max_entries: int = 10):
        """
        Push snapshot to rolling history buffer (LPUSH + LTRIM).
        """
        if not self._redis:
            return

        key = self._key_history(match_id)
        serialized = json.dumps(data)
        
        async with self._redis.pipeline() as pipe:
            pipe.lpush(key, serialized)
            pipe.ltrim(key, 0, max_entries - 1)
            pipe.expire(key, 3600) # 1 hour retention for history
            await pipe.execute()

    async def update_freshness(self, match_id: str, timestamp: float):
        """
        Update the last successful scrape timestamp.
        """
        if not self._redis:
            return

        key = self._key_freshness(match_id)
        await self._redis.set(key, str(timestamp), ex=3600)

    async def get_freshness(self, match_id: str) -> Optional[float]:
        """
        Get the last successful scrape timestamp.
        """
        if not self._redis:
            return None

        key = self._key_freshness(match_id)
        val = await self._redis.get(key)
        if val:
            return float(val)
        return None

    async def set_negative_cache(self, match_id: str, ttl: int = 60):
        """
        Mark a match ID as missing/invalid for a short period.
        """
        if not self._redis:
            return

        key = self._key_negative(match_id)
        await self._redis.set(key, "1", ex=ttl)

    async def is_negative_cached(self, match_id: str) -> bool:
        """
        Check if a match ID is in negative cache.
        """
        if not self._redis:
            return False

        key = self._key_negative(match_id)
        return await self._redis.exists(key) > 0

    async def archive_match(self, match_id: str):
        """
        Archive a completed match.
        Removes live snapshot and freshness keys.
        History is kept (it has its own TTL).
        """
        if not self._redis:
            return

        keys = [
            self._key_snapshot(match_id),
            self._key_freshness(match_id)
        ]
        await self._redis.delete(*keys)

    @staticmethod
    def compute_delta(old_data: Dict[str, Any], new_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Compute fields that changed between old and new snapshots.
        Returns a dictionary of changed fields.
        """
        delta = {}
        for key, value in new_data.items():
            if key not in old_data or old_data[key] != value:
                delta[key] = value
        return delta
