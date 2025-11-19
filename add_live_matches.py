import requests
import json

# Add test live matches
url = "http://localhost:8099/cricket-data/add-live-matches"
matches = [
    {
        "url": "https://crex.com/test-live-match-1",
        "lastKnownState": json.dumps({
            "battingTeam": "Australia",
            "score": "156/3",
            "overs": "28.2",
            "team1": "Australia",
            "team2": "England",
            "current_ball": "Live"
        })
    },
    {
        "url": "https://crex.com/test-live-match-2",
        "lastKnownState": json.dumps({
            "battingTeam": "South Africa",
            "score": "89/2",
            "overs": "15.4",
            "team1": "South Africa",
            "team2": "New Zealand",
            "current_ball": "Live"
        })
    }
]

for match in matches:
    response = requests.post(url, json=match)
    print(f"Added match: {match[\"url\"]} - Status: {response.status_code}")
