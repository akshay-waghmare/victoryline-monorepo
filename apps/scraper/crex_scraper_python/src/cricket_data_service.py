import requests
import os
from .loggers.adapters import get_logger
from .core.circuit_breaker import CircuitBreaker, CircuitBreakerOpenError

logger = get_logger(component="cricket_data_service")

# Circuit breakers for external dependencies
_auth_breaker = CircuitBreaker.from_settings("backend_auth")
_api_breaker = CircuitBreaker.from_settings("backend_api")

class CricketDataService:
    BASE_URL = os.getenv('BACKEND_URL', 'http://127.0.0.1:8099')
    TOKEN_URL = os.getenv('TOKEN_URL', 'http://127.0.0.1:8099/token/generate-token')

    @staticmethod
    def get_bearer_token():
        """Fetches the bearer token for authentication from local backend."""
        logger.info("auth.token.start")
        
        credentials = {
            "username": os.getenv('BACKEND_USERNAME', 'tanmay'),
            "password": os.getenv('BACKEND_PASSWORD', 'tanmay')
        }
        
        def _fetch_token():
            response = requests.post(CricketDataService.TOKEN_URL, json=credentials, timeout=2)
            response.raise_for_status()
            return response.json().get("token")
        
        try:
            token = _auth_breaker.call(_fetch_token)
            logger.info("auth.token.success")
            return token
        except CircuitBreakerOpenError:
            logger.warning("auth.token.circuit_open", metadata={"breaker": "backend_auth"})
            return None
        except Exception as e:
            logger.error("auth.token.error", metadata={"error": str(e)})
            return None  # Don't raise, just return None so scraping can continue

    @staticmethod
    def add_live_matches(urls, token):
        """Adds live match URLs to the local backend service."""
        # NOTE: /cricket-data/add-live-matches endpoint is public (permitAll in WebSecurityConfig)
        # No token required, but we still accept it for backwards compatibility
        logger.info("matches.add.start", metadata={"url_count": len(urls)})
        
        add_matches_url = os.getenv('ADD_LIVE_MATCHES_URL', 'http://127.0.0.1:8099/cricket-data/add-live-matches')
        
        def _post_matches():
            headers = {"Content-Type": "application/json"}
            if token:
                headers["Authorization"] = f"Bearer {token}"
            response = requests.post(add_matches_url, json=urls, headers=headers, timeout=2)
            response.raise_for_status()
            return response
        
        try:
            _api_breaker.call(_post_matches)
            logger.info("matches.add.success", metadata={"url_count": len(urls)})
        except CircuitBreakerOpenError:
            logger.warning("matches.add.circuit_open", metadata={"breaker": "backend_api"})
        except Exception as e:
            logger.error("matches.add.error", metadata={"error": str(e), "url": add_matches_url})
            # Don't raise - allow scraping to continue even if backend sync fails

    @staticmethod
    def fetch_match_data(match_id, token):
        """Fetches data for a specific match."""
        logger.info("matches.fetch.start", metadata={"match_id": match_id})
        try:
            headers = {"Authorization": f"Bearer {token}"}
            response = requests.get(f"{CricketDataService.BASE_URL}/matches/{match_id}", headers=headers)
            response.raise_for_status()
            match_data = response.json()
            logger.info("matches.fetch.success", metadata={"match_id": match_id})
            return match_data
        except Exception as e:
            logger.error("matches.fetch.error", metadata={"error": str(e), "match_id": match_id})
            raise

    @staticmethod
    def push_match_data(data, token, source_url):
        """Pushes match data to the backend service."""
        logger.info("matches.push.start", metadata={"url": source_url})
        
        service_url = os.getenv('SERVICE_URL', 'http://127.0.0.1:8099/cricket-data')
        
        def _push():
            headers = {"Content-Type": "application/json"}
            if token:
                headers["Authorization"] = f"Bearer {token}"
            
            # Transform data to match backend DTO structure
            try:
                payload = {
                    "url": source_url,
                    "match_update": {
                        "crr": data.get("run_rate"),
                        "final_result_text": data.get("result") if isinstance(data.get("result"), str) else (data.get("result")[0] if data.get("result") else None)
                    },
                    "overs_data": []
                }

                # Map Overs
                if data.get("overs_data"):
                    payload["overs_data"] = []
                    for o in data["overs_data"]:
                        if isinstance(o, dict):
                            payload["overs_data"].append({
                                "overNumber": o.get("overNumber"),
                                "balls": o.get("balls"),
                                "totalRuns": o.get("totalRuns", "").replace("= ", "") if o.get("totalRuns") else "0"
                            })
                        else:
                            logger.warning(f"Skipping invalid over data: {type(o)} {o}")
                elif data.get("overs"): # Fallback for legacy format
                    payload["overs_data"] = []
                    for o in data["overs"]:
                        if isinstance(o, dict):
                            payload["overs_data"].append({
                                "overNumber": o.get("over"),
                                "balls": o.get("balls"),
                                "totalRuns": o.get("total", "").replace("= ", "") if o.get("total") else "0"
                            })
                        else:
                            logger.warning(f"Skipping invalid over data: {type(o)} {o}")

                # Map Score (Batting Team)
                teams = data.get("teams", [])
                if teams:
                    # Use the first team as the primary batting team
                    batting_team = teams[0]
                    
                    if not isinstance(batting_team, dict):
                        logger.error(f"Invalid batting_team data: {type(batting_team)} {batting_team}")
                        batting_team = {} # Fallback

                    # Clean over string for nested score object
                    raw_over = batting_team.get("overs", "")
                    clean_over_str = raw_over
                    if raw_over:
                        # Remove parentheses if present e.g. (113.3) -> 113.3
                        clean_over_str = raw_over.replace("(", "").replace(")", "").strip()

                    payload["match_update"]["score"] = {
                        "teamName": batting_team.get("name"),
                        "score": batting_team.get("runs"),
                        "over": clean_over_str
                    }
                    
                    # Set root level fields for backward compatibility
                    payload["score"] = batting_team.get("runs")
                    payload["batting_team"] = batting_team.get("name")
                    
                    # Clean and set over
                    if clean_over_str:
                        try:
                            # Extract numeric part if mixed with text
                            import re
                            match = re.search(r"(\d+(\.\d+)?)", clean_over_str)
                            if match:
                                payload["over"] = float(match.group(1))
                        except (ValueError, TypeError):
                            pass

                # Map Odds (from DOM)
                odds = data.get("odds", [])
                if odds:
                    payload["firstTeamData"] = []
                    for odd in odds:
                        vals = odd.get("values", [])
                        if len(vals) >= 2:
                            payload["firstTeamData"].append({
                                "teamName": odd.get("team"),
                                "backOdds": vals[0],
                                "layOdds": vals[1]
                            })
                
                # Map Live API Data (Odds, Session, Runs on Ball)
                if data.get("team_odds"):
                    payload["team_odds"] = data["team_odds"]
                    if "favTeam" in data["team_odds"]:
                        payload["fav_team"] = data["team_odds"]["favTeam"]
                
                if data.get("session_odds"):
                    payload["session_odds"] = data["session_odds"]
                
                if data.get("runs_on_ball") is not None:
                    payload["runs_on_ball"] = data["runs_on_ball"]
                
                if data.get("current_ball"):
                    # Backend expects 'score_update' for current_ball field
                    payload["score_update"] = data["current_ball"]

                # Map Batsman Data
                if data.get("batsman_data"):
                    payload["batsman_data"] = data["batsman_data"]

                # Map Bowler Data
                if data.get("bowler_data"):
                    payload["bowler_data"] = data["bowler_data"]
                
                # Include raw data for debugging or other fields
                # payload["raw_data"] = data

                logger.info("matches.push.payload", metadata={"payload": payload})

                response = requests.post(service_url, json=payload, headers=headers)
                response.raise_for_status()
                return response
            except Exception as e:
                logger.error("matches.push.mapping_error", metadata={"error": str(e), "data_keys": list(data.keys())})
                raise e

        try:
            _api_breaker.call(_push)
            logger.info("matches.push.success", metadata={"url": source_url})
            return True
        except CircuitBreakerOpenError:
            logger.warning("matches.push.circuit_open", metadata={"breaker": "backend_api"})
            return False
        except Exception as e:
            logger.error("matches.push.error", metadata={"error": str(e), "url": service_url})
            return False

    @staticmethod
    def push_match_info(data, token, source_url):
        """Pushes match info (static data) to the backend service."""
        logger.info("matches.push_info.start", metadata={"url": source_url})
        
        service_url = os.getenv('API_ENDPOINT', 'http://127.0.0.1:8099/cricket-data/match-info/save')
        
        def _push():
            headers = {"Content-Type": "application/json"}
            if token:
                headers["Authorization"] = f"Bearer {token}"
            
            # The legacy code copies data and adds url
            payload = data.copy()
            payload["url"] = source_url
            
            logger.info("matches.push_info.payload", metadata={"payload": payload})

            response = requests.post(service_url, json=payload, headers=headers)
            response.raise_for_status()
            return response

        try:
            _api_breaker.call(_push)
            logger.info("matches.push_info.success", metadata={"url": source_url})
            return True
        except CircuitBreakerOpenError:
            logger.warning("matches.push_info.circuit_open", metadata={"breaker": "backend_api"})
            return False
        except Exception as e:
            logger.error("matches.push_info.error", metadata={"error": str(e), "url": service_url})
            return False

    @staticmethod
    def get_live_matches(token):
        """Fetches list of live matches from backend."""
        logger.info("matches.list.start")
        url = f"{CricketDataService.BASE_URL}/cricket-data/live-matches"
        
        def _fetch():
            headers = {}
            if token:
                headers["Authorization"] = f"Bearer {token}"
            response = requests.get(url, headers=headers, timeout=5)
            response.raise_for_status()
            return response.json()

        try:
            matches = _api_breaker.call(_fetch)
            logger.info("matches.list.success", metadata={"count": len(matches)})
            return matches
        except Exception as e:
            logger.error("matches.list.error", metadata={"error": str(e)})
            return []