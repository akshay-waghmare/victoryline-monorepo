"""
Backend API Client for Upcoming Matches
Feature 005: Upcoming Matches Feed

Handles communication with the backend REST API for upserting fixtures.
"""

import logging
import requests
from typing import List, Optional, Dict, Any
from datetime import datetime

from models.upcoming_match import UpcomingMatch

logger = logging.getLogger(__name__)


class UpcomingMatchApiClient:
    """
    Client for interacting with backend upcoming matches API
    
    Handles:
    - Single match upsert
    - Batch match upsert
    - Retry logic with exponential backoff
    - Error handling and logging
    """
    
    def __init__(self, base_url: str, timeout: int = 10):
        """
        Initialize API client
        
        Args:
            base_url: Backend API base URL (e.g., "http://localhost:8080")
            timeout: Request timeout in seconds
        """
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        
        # Retry configuration
        self.retry_initial_delay = 2.0
        self.retry_multiplier = 2.0
        self.retry_max_delay = 5.0
        self.max_retries = 3

    def upsert_match(self, match: UpcomingMatch) -> Optional[Dict[str, Any]]:
        """
        Upsert single upcoming match
        
        Args:
            match: UpcomingMatch dataclass instance
            
        Returns:
            Response data dict or None if failed
        """
        url = f"{self.base_url}/api/v1/matches/upcoming"
        payload = match.to_dict()
        
        logger.debug(f"Upserting match: {match.match_title} (source_key: {match.source_key})")
        
        delay = self.retry_initial_delay
        last_error = None
        
        for attempt in range(1, self.max_retries + 1):
            try:
                response = self.session.post(url, json=payload, timeout=self.timeout)
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('success'):
                        logger.info(f"Successfully upserted match: {match.match_title}")
                        return data.get('data')
                    else:
                        error = data.get('error', {})
                        logger.error(f"Backend returned error: {error.get('code')} - {error.get('message')}")
                        return None
                
                elif response.status_code == 400:
                    # Validation error - don't retry
                    logger.error(f"Validation error upserting match: {response.text}")
                    return None
                
                elif response.status_code in [500, 502, 503, 504]:
                    # Server error - retry with backoff
                    logger.warning(f"Server error (attempt {attempt}/{self.max_retries}): {response.status_code}")
                    last_error = f"HTTP {response.status_code}"
                    
                    if attempt < self.max_retries:
                        import time
                        logger.info(f"Retrying in {delay}s...")
                        time.sleep(delay)
                        delay = min(delay * self.retry_multiplier, self.retry_max_delay)
                        continue
                
                else:
                    logger.error(f"Unexpected status code: {response.status_code}")
                    return None
                    
            except requests.RequestException as e:
                logger.warning(f"Request error (attempt {attempt}/{self.max_retries}): {e}")
                last_error = str(e)
                
                if attempt < self.max_retries:
                    import time
                    time.sleep(delay)
                    delay = min(delay * self.retry_multiplier, self.retry_max_delay)
                else:
                    logger.error(f"Max retries reached for match: {match.match_title}")
        
        logger.error(f"Failed to upsert match after {self.max_retries} attempts: {last_error}")
        return None

    def upsert_matches_batch(self, matches: List[UpcomingMatch]) -> Optional[List[Dict[str, Any]]]:
        """
        Upsert multiple upcoming matches in a single request
        
        Args:
            matches: List of UpcomingMatch instances
            
        Returns:
            List of response data dicts or None if failed
        """
        if not matches:
            logger.warning("Empty batch provided for upsert")
            return []
        
        # Backend limits batch size to 100
        if len(matches) > 100:
            logger.warning(f"Batch size {len(matches)} exceeds limit of 100, splitting...")
            return self._upsert_in_chunks(matches, chunk_size=100)
        
        url = f"{self.base_url}/api/v1/matches/upcoming/batch"
        payload = [match.to_dict() for match in matches]
        
        logger.info(f"Upserting batch of {len(matches)} matches")
        
        delay = self.retry_initial_delay
        last_error = None
        
        for attempt in range(1, self.max_retries + 1):
            try:
                response = self.session.post(url, json=payload, timeout=self.timeout * 2)
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('success'):
                        result = data.get('data', [])
                        logger.info(f"Successfully upserted batch of {len(result)} matches")
                        return result
                    else:
                        error = data.get('error', {})
                        logger.error(f"Backend returned error: {error.get('code')} - {error.get('message')}")
                        return None
                
                elif response.status_code == 400:
                    logger.error(f"Validation error in batch upsert: {response.text}")
                    return None
                
                elif response.status_code in [500, 502, 503, 504]:
                    logger.warning(f"Server error (attempt {attempt}/{self.max_retries}): {response.status_code}")
                    last_error = f"HTTP {response.status_code}"
                    
                    if attempt < self.max_retries:
                        import time
                        logger.info(f"Retrying batch in {delay}s...")
                        time.sleep(delay)
                        delay = min(delay * self.retry_multiplier, self.retry_max_delay)
                        continue
                
                else:
                    logger.error(f"Unexpected status code: {response.status_code}")
                    return None
                    
            except requests.RequestException as e:
                logger.warning(f"Request error (attempt {attempt}/{self.max_retries}): {e}")
                last_error = str(e)
                
                if attempt < self.max_retries:
                    import time
                    time.sleep(delay)
                    delay = min(delay * self.retry_multiplier, self.retry_max_delay)
                else:
                    logger.error(f"Max retries reached for batch upsert")
        
        logger.error(f"Failed to upsert batch after {self.max_retries} attempts: {last_error}")
        return None

    def _upsert_in_chunks(self, matches: List[UpcomingMatch], chunk_size: int = 100) -> Optional[List[Dict[str, Any]]]:
        """
        Upsert large batch in smaller chunks
        
        Args:
            matches: List of all matches
            chunk_size: Size of each chunk
            
        Returns:
            Combined list of all responses or None if any chunk fails
        """
        all_results = []
        
        for i in range(0, len(matches), chunk_size):
            chunk = matches[i:i + chunk_size]
            logger.info(f"Processing chunk {i//chunk_size + 1}/{(len(matches) + chunk_size - 1)//chunk_size}")
            
            results = self.upsert_matches_batch(chunk)
            if results is None:
                logger.error(f"Chunk {i//chunk_size + 1} failed, aborting batch")
                return None
            
            all_results.extend(results)
        
        logger.info(f"Successfully upserted {len(all_results)} matches in {(len(matches) + chunk_size - 1)//chunk_size} chunks")
        return all_results

    def health_check(self) -> bool:
        """
        Check if backend API is accessible
        
        Returns:
            True if backend is healthy, False otherwise
        """
        try:
            url = f"{self.base_url}/api/v1/matches/upcoming?page=0&size=1"
            response = self.session.get(url, timeout=5)
            return response.status_code == 200
        except Exception as e:
            logger.warning(f"Backend health check failed: {e}")
            return False
