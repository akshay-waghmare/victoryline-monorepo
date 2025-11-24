"""
Crex Source Adapter.
"""

import logging
import asyncio
import json
from typing import Dict, Any
from urllib.parse import urlparse, parse_qs
from playwright.async_api import BrowserContext, Page, Response
from bs4 import BeautifulSoup

from .base import SourceAdapter
from ..dom_match_extract import extract_match_dom_fields
from ..parsers.crex_parser import extract_match_stats_by_innings, parse_runs_and_balls, parse_batsman_stats

logger = logging.getLogger(__name__)

class CrexAdapter(SourceAdapter):
    """
    Adapter for scraping Crex.
    """

    @property
    def domain(self) -> str:
        return "crex"

    def get_canonical_id(self, raw_id: str) -> str:
        return f"crex:{raw_id}"

    async def fetch_match(self, context: BrowserContext, url: str) -> Dict[str, Any]:
        """
        Fetch match data from Crex.
        """
        page = await context.new_page()
        data_store: Dict[str, Any] = {
            "sC4_stats": None,
            "api_data": {},
            "local_storage": {}
        }

        try:
            # Setup network interception
            await self._setup_network_interception(page, data_store)

            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            
            # Wait for key element to ensure dynamic content loaded
            try:
                await page.wait_for_selector(".match-header", timeout=5000)
            except Exception:
                pass # Proceed anyway, parser handles missing data

            # Wait for sV3 response (which triggers sC4)
            try:
                # Wait up to 5 seconds for the API call
                await page.wait_for_response(lambda res: "sV3.php" in res.url, timeout=5000)
                # Give a little more time for sC4 to complete if it was triggered
                await asyncio.sleep(2) 
            except Exception:
                logger.warning(f"Timeout waiting for sV3.php response on {url}")

            # Extract localStorage
            data_store["local_storage"] = await self._extract_local_storage(page)

            content = await page.content()
            dom_data = extract_match_dom_fields(content)
            
            # Merge data
            final_data = {**dom_data}
            final_data["source_url"] = url
            final_data["adapter"] = self.domain
            
            # Add rich data
            if data_store["sC4_stats"]:
                final_data["match_stats"] = data_store["sC4_stats"]
            
            if data_store["api_data"]:
                final_data["live_data"] = data_store["api_data"]

            # Add player/team maps from localStorage
            if data_store["local_storage"]:
                final_data["player_map"] = {k: v for k, v in data_store["local_storage"].items() if k.startswith('p_')}
                final_data["team_map"] = {k: v for k, v in data_store["local_storage"].items() if k.startswith('t_')}

            # Enrich with sC4 data if DOM extraction failed
            if (not final_data.get("batsman_data") or not final_data.get("bowler_data")) and data_store["sC4_stats"]:
                self._enrich_from_sc4(final_data, data_store["sC4_stats"], data_store["local_storage"])

            return final_data
        finally:
            await page.close()

    def _enrich_from_sc4(self, final_data: Dict[str, Any], sc4_stats: Dict[str, Any], local_storage: Dict[str, str]):
        """
        Enrich final_data with stats from sC4 if available.
        """
        try:
            innings = sc4_stats.get("innings", {})
            if not innings:
                return

            # Determine current inning (last one)
            # Keys are like "1st_inning", "2nd_inning"
            # Sort by numeric prefix
            sorted_keys = sorted(innings.keys(), key=lambda k: int(k.split('_')[0][:-2]) if k[0].isdigit() else 0)
            if not sorted_keys:
                return
            
            current_inning_key = sorted_keys[-1]
            current_inning = innings[current_inning_key]
            
            # Map Batsman Data
            if not final_data.get("batsman_data"):
                batsman_list = []
                for code, stats in current_inning.get("batsman_stats", {}).items():
                    # Resolve name
                    name = local_storage.get(f"p_{code}_name", code)
                    
                    # Calculate SR
                    runs = int(stats.get("runs", 0))
                    balls = int(stats.get("balls_faced", 0))
                    sr = "{:.2f}".format((runs / balls) * 100) if balls > 0 else "0.00"
                    
                    batsman_list.append({
                        "name": name,
                        "score": str(runs),
                        "runs": str(runs), # Legacy support
                        "ballsFaced": str(balls),
                        "balls_faced": str(balls), # Legacy support
                        "fours": str(stats.get("fours", 0)),
                        "sixes": str(stats.get("sixes", 0)),
                        "strikeRate": sr,
                        "onStrike": stats.get("status") == "currently_batting",
                        "on_strike": stats.get("status") == "currently_batting" # Legacy support
                    })
                final_data["batsman_data"] = batsman_list
                logger.info(f"Enriched {len(batsman_list)} batsmen from sC4")

            # Map Bowler Data
            if not final_data.get("bowler_data"):
                bowler_list = []
                for code, stats in current_inning.get("bowlers_stats", {}).items():
                    # Resolve name
                    name = local_storage.get(f"p_{code}_name", code)
                    
                    # Calculate Economy
                    runs = int(stats.get("runs", 0))
                    overs = float(stats.get("overs", 0))
                    # Convert overs to balls for accurate econ
                    # 1.3 overs = 1*6 + 3 = 9 balls
                    o_int = int(overs)
                    o_dec = int(round((overs - o_int) * 10))
                    total_balls = o_int * 6 + o_dec
                    
                    econ = "{:.2f}".format((runs / total_balls) * 6) if total_balls > 0 else "0.00"
                    
                    bowler_list.append({
                        "name": name,
                        "score": str(runs),
                        "runs_conceded": str(runs), # Legacy support
                        "ballsBowled": total_balls,
                        "balls_bowled": total_balls, # Legacy support
                        "wicketsTaken": str(stats.get("wickets", 0)),
                        "wickets_taken": str(stats.get("wickets", 0)), # Legacy support
                        "economyRate": econ,
                        "dotBalls": "0",
                        "dot_balls": "0" # Legacy support
                    })
                final_data["bowler_data"] = bowler_list
                logger.info(f"Enriched {len(bowler_list)} bowlers from sC4")

        except Exception as e:
            logger.error(f"Error enriching from sC4: {e}")

    async def _extract_local_storage(self, page: Page) -> Dict[str, str]:
        try:
            return await page.evaluate("() => Object.fromEntries(Object.entries(localStorage).map(([k, v]) => [k, v]))")
        except Exception as e:
            logger.error(f"Error extracting localStorage: {e}")
            return {}

    async def _setup_network_interception(self, page: Page, data_store: Dict[str, Any]):
        async def handle_response(response: Response):
            if "sV3.php" in response.url:
                try:
                    await self._handle_api_response(response, data_store, page)
                except Exception as e:
                    logger.error(f"Error handling API response: {e}")

        page.on("response", handle_response)

    async def _handle_api_response(self, response: Response, data_store: Dict[str, Any], page: Page):
        try:
            api_data = await response.json()
            data_store["api_data"] = api_data
            
            # Extract key for sC4 call
            parsed_url = urlparse(response.url)
            query_params = parse_qs(parsed_url.query)
            key = query_params.get('key', [None])[0]
            
            if key:
                sc4_url = f"https://api-v1.com/v10/sC4.php?key={key}"
                headers = await response.all_headers() # Use headers from original request
                await self._trigger_sc4_call(sc4_url, headers, data_store, page)
        except Exception as e:
            logger.error(f"Error processing sV3 response: {e}")

    async def _trigger_sc4_call(self, url: str, headers: Dict[str, str], data_store: Dict[str, Any], page: Page):
        try:
            # Use page.request to make the call with browser context (cookies, etc)
            response = await page.request.get(url, headers=headers)
            if response.status == 200:
                sc4_data = await response.json()
                stats = extract_match_stats_by_innings(sc4_data)
                data_store["sC4_stats"] = stats
                logger.info(f"Successfully fetched sC4 stats for {url}")
            else:
                logger.warning(f"Failed to fetch sC4 stats: {response.status}")
        except Exception as e:
            logger.error(f"Error triggering sC4 call: {e}")

    async def discover_matches(self, context: BrowserContext) -> Dict[str, str]:
        """
        Discover matches from Crex listing page.
        """
        # Placeholder for discovery logic
        # In a real implementation, this would visit the fixtures/live page
        return {}

    async def fetch_match_info(self, context: BrowserContext, url: str) -> Dict[str, Any]:
        """
        Fetch match info (static data) from Crex info page.
        """
        page = await context.new_page()
        try:
            logger.info(f"Navigating to info URL: {url}")
            try:
                await page.goto(url, wait_until="networkidle", timeout=30000)
            except Exception:
                logger.warning(f"Networkidle timeout on {url}, proceeding with domcontentloaded")

            # Wait for key elements
            try:
                await page.wait_for_selector(".match-date, .toss-wrap, .match-header", timeout=10000)
            except Exception:
                logger.warning(f"Timeout waiting for selectors on {url}")

            # Debug info
            title = await page.title()
            logger.info(f"Info Page Title: {title}")
            
            # Use BS4 for simple fields
            content = await page.content()
            soup = BeautifulSoup(content, "html.parser")

            toss_elem = soup.select_one('.toss-wrap p')
            toss_info = toss_elem.get_text(strip=True) if toss_elem else 'No toss information'

            date_elem = soup.select_one('.match-date')
            match_date = date_elem.get_text(strip=True) if date_elem else 'No match date'

            venue_elem = soup.select_one('.match-venue')
            venue = venue_elem.get_text(strip=True) if venue_elem else 'No venue info'

            name_elem = soup.select_one('.s-name')
            match_name = name_elem.get_text(strip=True) if name_elem else 'No match name'

            # Scrape team form
            try:
                team_form = await page.evaluate('''() => {
                    const teamsData = {};
                    const teamSections = document.querySelectorAll('.format-match-exp');
                    teamSections.forEach(section => {
                        const teamId = section.id || 'Unknown Team';
                        const last_matches = [];
                        const match_cards = section.querySelectorAll('.format-card-wrap');
                        match_cards.forEach((card) => {
                            const teams = [];
                            const team_details = card.querySelectorAll('.form-team-detail');
                            team_details.forEach((teamDetail) => {
                                const teamName = teamDetail.querySelector('.team-name')?.innerText.trim() || 'Unknown';
                                const innings_scores = teamDetail.querySelectorAll('.team-score');
                                const innings_overs = teamDetail.querySelectorAll('.team-over');
                                const inningsScoresArray = Array.from(innings_scores).filter(el => el.innerText.trim() !== '&');
                                const inningsOversArray = Array.from(innings_overs).filter(el => el.innerText.trim() !== '&');
                                const scores = [];
                                inningsScoresArray.forEach((scoreElement, idx) => {
                                    scores.push({
                                        "team_score": scoreElement.innerText.trim(),
                                        "team_over": inningsOversArray[idx]?.innerText.trim() || 'N/A'
                                    });
                                });
                                teams.push({ "team_name": teamName, "innings": scores });
                            });
                            const match_info = card.querySelector('.form-match-no');
                            const match_name = match_info.querySelector('.match-name')?.innerText.trim() || 'Unknown Match';
                            const series_name = match_info.querySelector('.series-name')?.innerText.trim() || 'Unknown Series';
                            const resultElement = card.querySelector('.win.match, .loss.match, .draw.match');
                            const result = resultElement?.innerText.trim() || 'Unknown Result';
                            last_matches.push({ "match_name": match_name, "series_name": series_name, "teams": teams, "result": result });
                        });
                        teamsData[teamId] = last_matches;
                    });
                    return teamsData;
                }''')
            except Exception as e:
                logger.warning(f"Error extracting team_form: {e}")
                team_form = {}

            # Scrape team comparison
            try:
                team_comparison = await page.evaluate('''() => {
                    const team_comparison = {};
                    const team1_element = document.querySelector('.team1 .team-name');
                    const team2_element = document.querySelector('.team2 .team-name');
                    const team1_name = team1_element ? team1_element.innerText.trim() : 'Team 1';
                    const team2_name = team2_element ? team2_element.innerText.trim() : 'Team 2';
                    team_comparison[team1_name] = {};
                    team_comparison[team2_name] = {};
                    const rows = document.querySelectorAll('#table tbody tr');
                    rows.forEach(row => {
                        const cells = row.querySelectorAll('td');
                        if (cells.length >= 3) {
                            const stat_name = cells[1].innerText.trim();
                            const team1_stat = cells[0].innerText.trim();
                            const team2_stat = cells[2].innerText.trim();
                            team_comparison[team1_name][stat_name.toLowerCase().replace(' ', '_')] = team1_stat;
                            team_comparison[team2_name][stat_name.toLowerCase().replace(' ', '_')] = team2_stat;
                        }
                    });
                    return team_comparison;
                }''')
            except Exception as e:
                logger.warning(f"Error extracting team_comparison: {e}")
                team_comparison = {}

            # Scrape venue stats
            try:
                venue_stats = await page.evaluate('''() => {
                    const stats = {};
                    stats.matches = document.querySelector('.match-count')?.innerText.trim() || 'No data';
                    stats.win_bat_first = document.querySelector('.win-bat-first .match-win-per')?.innerText.trim() || 'No data';
                    stats.win_bowl_first = document.querySelector('.win-bowl-first .match-win-per')?.innerText.trim() || 'No data';
                    stats.avg_1st_inns = document.querySelector('.venue-avg-sec-inn .venue-avg-val')?.innerText.trim() || 'No data';
                    stats.avg_2nd_inns = document.querySelector('.venue-avg-wrap .venue-avg-val')?.innerText.trim() || 'No data';
                    return stats;
                }''')
            except Exception as e:
                logger.warning(f"Error extracting venue_stats: {e}")
                venue_stats = {}

            # Scrape playing XI
            playing_xi = {}
            try:
                buttons = await page.query_selector_all('.playingxi-button')
                for button in buttons:
                    team_name = await button.inner_text()
                    team_name = team_name.strip()
                    await button.click()
                    await asyncio.sleep(0.5) 
                    players = await page.evaluate('''() => {
                        const playersList = [];
                        document.querySelectorAll('.playingxi-card-row').forEach(player => {
                            const playerName = player.querySelector('.player-name')?.innerText.trim() || 'Unknown Player';
                            const playerRole = player.querySelector('.bat-ball-type')?.innerText.trim() || 'Unknown Role';
                            playersList.push({ playerName, playerRole });
                        });
                        return playersList;
                    }''')
                    playing_xi[team_name] = players
            except Exception as e:
                logger.warning(f"Error scraping playing XI: {e}")

            return {
                "match_date": match_date,
                "venue": venue,
                "match_name": match_name,
                "team_form": team_form,
                "team_comparison": team_comparison,
                "venue_stats": venue_stats,
                "playing_xi": playing_xi,
                "toss_info": toss_info
            }
        except Exception as e:
            logger.error(f"Error fetching match info: {e}")
            return {}
        finally:
            await page.close()
