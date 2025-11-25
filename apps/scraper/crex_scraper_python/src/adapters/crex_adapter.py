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
        data_store: Dict[str, Any] = {
            "sC4_stats": None,
            "api_data": {},
            "local_storage": {}
        }

        # Pre-fetch localStorage from Scorecard and Info pages (Legacy Behavior)
        # This ensures we have all player/team mappings before scraping live data
        if "/live" in url:
            # 1. Scorecard
            scorecard_url = url.replace("/live", "/scorecard")
            try:
                logger.info(f"Pre-fetching localStorage from {scorecard_url}")
                scorecard_page = await context.new_page()
                try:
                    await scorecard_page.goto(scorecard_url, wait_until="domcontentloaded", timeout=30000)
                    await scorecard_page.wait_for_timeout(5000)
                    pre_ls = await self._extract_local_storage(scorecard_page)
                    data_store["local_storage"].update(pre_ls)
                    logger.info(f"Pre-fetched {len(pre_ls)} items from Scorecard localStorage")
                finally:
                    await scorecard_page.close()
            except Exception as e:
                logger.warning(f"Failed to pre-fetch Scorecard LS: {e}")

            # 2. Info
            info_url = url.replace("/live", "/info")
            try:
                logger.info(f"Pre-fetching localStorage from {info_url}")
                info_page = await context.new_page()
                try:
                    await info_page.goto(info_url, wait_until="domcontentloaded", timeout=30000)
                    await info_page.wait_for_timeout(5000)
                    pre_ls_info = await self._extract_local_storage(info_page)
                    data_store["local_storage"].update(pre_ls_info)
                    logger.info(f"Pre-fetched {len(pre_ls_info)} items from Info localStorage")
                finally:
                    await info_page.close()
            except Exception as e:
                logger.warning(f"Failed to pre-fetch Info LS: {e}")

        page = await context.new_page()

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
                await page.wait_for_response(lambda res: "sV3" in res.url, timeout=5000)
                # Give a little more time for sC4 to complete if it was triggered
                await asyncio.sleep(2) 
            except Exception:
                logger.warning(f"Timeout waiting for sV3 response on {url}")

            # Extract localStorage
            current_ls = await self._extract_local_storage(page)
            data_store["local_storage"].update(current_ls)

            content = await page.content()
            dom_data = extract_match_dom_fields(content)
            
            # Merge data
            final_data = {**dom_data}
            final_data["source_url"] = url
            final_data["adapter"] = self.domain
            
            # Add rich data
            if data_store["sC4_stats"]:
                logger.info(f"sC4 stats present. LocalStorage items: {len(data_store['local_storage'])}")
                # Decode player names using localStorage if available
                if data_store["local_storage"]:
                     self._decode_sc4_stats(data_store["sC4_stats"], data_store["local_storage"])
                final_data["match_stats"] = data_store["sC4_stats"]
            else:
                logger.info("sC4 stats NOT present in data_store")
            
            if data_store["api_data"]:
                final_data["live_data"] = data_store["api_data"]
                self._process_live_data(final_data, data_store["api_data"], data_store["local_storage"])

            # Fallback/Override: If result_box is present and indicates match end, use it
            # Or if current_ball is missing, use result_box
            # Also check 'result' field (from .final-result) as fallback
            result_text = final_data.get("result_box") or final_data.get("result", "")
            
            if result_text:
                # Check for common match end phrases
                is_match_end = any(x in result_text.lower() for x in ["won by", "won the", "draw", "tie", "abandoned", "no result"])
                
                if is_match_end:
                     final_data["current_ball"] = result_text
                     logger.info(f"Match end detected. Setting current_ball to: {result_text}")
                elif not final_data.get("current_ball"):
                     final_data["current_ball"] = result_text
                     logger.info(f"current_ball missing. Fallback to result text: {result_text}")

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

    def _decode_sc4_stats(self, sc4_stats: Dict[str, Any], local_storage: Dict[str, str]):
        """
        Decodes player names in sC4 stats using localStorage mapping.
        Replaces player codes with names in the keys.
        """
        try:
            innings = sc4_stats.get("innings", {})
            logger.info(f"Decoding sC4 stats. LocalStorage has {len(local_storage)} items.")
            
            for inning_key, inning_data in innings.items():
                # Decode Team Name
                team_code = inning_data.get("team_code")
                if team_code:
                    team_name = local_storage.get(f"t_{team_code}_name")
                    if team_name:
                        inning_data["team_name"] = team_name
                        inning_data["teamName"] = team_name
                        inning_data["team_code"] = team_name  # Overwrite code with name for frontend compatibility
                        logger.info(f"Decoded team {team_code} -> {team_name}")
                    else:
                        logger.warning(f"Could not find name for team code: {team_code}")
                        inning_data["team_name"] = team_code

                # Decode Batsmen
                batsman_stats = inning_data.get("batsman_stats", {})
                decoded_batsmen = {}
                for code, stats in batsman_stats.items():
                    name = local_storage.get(f"p_{code}_name", code)
                    stats["player_name"] = name
                    decoded_batsmen[name] = stats
                inning_data["batsman_stats"] = decoded_batsmen
                
                # Decode Bowlers
                bowlers_stats = inning_data.get("bowlers_stats", {})
                decoded_bowlers = {}
                for code, stats in bowlers_stats.items():
                    name = local_storage.get(f"p_{code}_name", code)
                    stats["player_name"] = name
                    decoded_bowlers[name] = stats
                inning_data["bowlers_stats"] = decoded_bowlers
                
        except Exception as e:
            logger.error(f"Error decoding sC4 stats: {e}")

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
            if "sV3" in response.url:
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

    def _process_live_data(self, final_data: Dict[str, Any], api_data: Dict[str, Any], local_storage: Dict[str, str] = None):
        """
        Process raw API data (sV3) into structured fields for the backend.
        """
        try:
            # 1. Current Ball Info (Field B)
            if "B" in api_data:
                raw_b = str(api_data["B"])
                
                # Clean up the value
                # Remove '^' which seems to be a prefix for runs (e.g. "^4" -> "4")
                clean_b_str = raw_b.replace('^', '')
                
                # Handle specific codes
                # 'o' = Over completion
                # 'b' = Ball start
                # 'wd' = Wide
                lower_b = clean_b_str.lower()
                if lower_b == 'o':
                    final_data["current_ball"] = "Over"
                elif lower_b == 'wd':
                    final_data["current_ball"] = "Wide"
                elif lower_b == 'b':
                    # 'b' usually means ball start, might not want to show anything yet
                    # or show a placeholder. For now, keeping it as is or maybe empty?
                    # User said "means it is a Ball start". 
                    # Let's pass it through cleaned, or maybe ignore?
                    # If we pass "b", frontend shows "b". 
                    final_data["current_ball"] = clean_b_str
                else:
                    final_data["current_ball"] = clean_b_str
                
                # Clean runs_on_ball (Integer expected)
                try:
                    # If it's a number (e.g. "1", "4"), convert to int
                    final_data["runs_on_ball"] = int(clean_b_str)
                except ValueError:
                    # If it's not a number (e.g. "W", "Nb"), maybe send 0 or skip?
                    if clean_b_str.isdigit():
                         final_data["runs_on_ball"] = int(clean_b_str)
                    else:
                        # Fallback: don't send runs_on_ball if we can't determine runs
                        pass

            # 2. Team Odds (Field R)
            # Format: "back+diff" e.g. "90+2" -> Back 90, Lay 92
            if "R" in api_data:
                r_val = str(api_data["R"])
                
                # Resolve Favorite Team Name
                fav_team_code = api_data.get("F", "").replace("^", "")
                fav_team_name = fav_team_code
                if local_storage:
                    # Try t_{code}_name
                    fav_team_name = local_storage.get(f"t_{fav_team_code}_name", fav_team_code)

                if "+" in r_val:
                    parts = r_val.split("+")
                    back = parts[0]
                    diff = parts[1]
                    try:
                        lay = str(int(back) + int(diff))
                        final_data["team_odds"] = {
                            "backOdds": back,
                            "layOdds": lay,
                            "favTeam": fav_team_name
                        }
                    except ValueError:
                        logger.warning(f"Failed to parse team odds: {r_val}")
                else:
                     final_data["team_odds"] = {
                            "backOdds": r_val,
                            "layOdds": r_val, # Fallback
                            "favTeam": fav_team_name
                        }

            # 3. Session Odds (Fields D and Z)
            # D: "6,10,15" (Overs)
            # Z: "45+1,78+2,110+3" (Odds)
            if "D" in api_data and "Z" in api_data:
                d_val = str(api_data["D"])
                z_val = str(api_data["Z"])
                
                overs = d_val.split(",") if d_val else []
                odds = z_val.split(",") if z_val else []
                
                session_list = []
                for i, over in enumerate(overs):
                    if i < len(odds):
                        odd_str = odds[i]
                        back = "0"
                        lay = "0"
                        if "+" in odd_str:
                            parts = odd_str.split("+")
                            back = parts[0]
                            try:
                                lay = str(int(back) + int(parts[1]))
                            except ValueError:
                                lay = back
                        else:
                            back = odd_str
                            lay = odd_str
                            
                        session_list.append({
                            "sessionOver": over,
                            "sessionBackOdds": back,
                            "sessionLayOdds": lay
                        })
                
                if session_list:
                    final_data["session_odds"] = session_list

            # 4. Overs Data (Fields A, l, n, m)
            # A: Current over (e.g. "4.0.2" -> 4th over, 0 runs, 2 balls?) - Actually user says A is current over
            # l: Last over (e.g. "43:0.0.0.1.0.0")
            # n: 2nd last over
            # m: 3rd last over
            
            # Debug logging for overs extraction
            logger.info(f"Checking overs data. Existing: {len(final_data.get('overs_data', []))}. API Keys: {list(api_data.keys())}")
            
            # Always try to extract from API as it is more reliable than DOM
            api_overs = []
            try:
                overs_list = []
                
                # Helper to parse over string "OverNum:b1.b2.b3..."
                def parse_over_str(over_str):
                    if not over_str or ":" not in over_str: return None
                    parts = over_str.split(":")
                    over_num = parts[0]
                    balls_str = parts[1]
                    balls = balls_str.split(".")
                    
                    total_runs = 0
                    for b in balls:
                        if b.isdigit():
                            total_runs += int(b)
                        # Handle other cases like 'W', 'Nb' if needed
                    
                    return {
                        "overNumber": over_num,
                        "balls": balls,
                        "totalRuns": str(total_runs)
                    }

                # Parse m (3rd last), n (2nd last), l (last)
                for field in ["m", "n", "l"]:
                    if field in api_data:
                        over_data = parse_over_str(str(api_data[field]))
                        if over_data:
                            overs_list.append(over_data)
                
                rb_overs = []
                if "rb" in api_data and isinstance(api_data["rb"], list):
                    # rb contains detailed over info
                    # We can use this instead of l, m, n if available as it's richer
                    
                    # Let's rebuild overs_list from rb if available, as it seems to cover everything
                    for over_obj in api_data["rb"]:
                        o_num = str(over_obj.get("o", ""))
                        balls_data = over_obj.get("b", [])
                        balls = []
                        total_runs = 0
                        for b_obj in balls_data:
                            u_val = str(b_obj.get("u", "0")) # Runs? Ensure string
                            balls.append(u_val)
                            if u_val.isdigit():
                                total_runs += int(u_val)
                        
                        rb_overs.append({
                            "overNumber": o_num,
                            "balls": balls,
                            "totalRuns": str(total_runs)
                        })
                    
                if rb_overs:
                    api_overs = rb_overs
                    logger.info(f"Extracted {len(rb_overs)} overs from rb field")
                elif overs_list:
                    api_overs = overs_list
                    logger.info(f"Extracted {len(overs_list)} overs from l,n,m fields")

            except Exception as e:
                logger.warning(f"Failed to parse overs data: {e}")

            # Use API overs if available, otherwise keep DOM overs (if any)
            if api_overs:
                final_data["overs_data"] = api_overs
            elif not final_data.get("overs_data"):
                logger.info("No API overs found and no DOM overs available.")

            # Log extraction results
            logger.info(f"Extracted live data: runs_on_ball={final_data.get('runs_on_ball')}, team_odds={final_data.get('team_odds')}, session_odds_count={len(final_data.get('session_odds', []))}")

        except Exception as e:
            logger.error(f"Error processing live data: {e}")

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
