import requests
import json

BASE_URL = "http://localhost:8099"

def get_token():
    url = f"{BASE_URL}/token/generate-token"
    payload = {
        "username": "tanmay",
        "password": "tanmay"
    }
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        return response.json()["token"]
    except Exception as e:
        print(f"Failed to get token: {e}")
        return None

def send_data(token):
    url = f"{BASE_URL}/cricket-data"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "url": "https://crex.com/scoreboard/test-match/live",
        "match_update": {
            "crr": "5.0",
            "final_result_text": "Test Match",
            "score": {
                "teamName": "IND",
                "score": "100-0",
                "over": "10.0"
            }
        },
        "overs_data": [
            {
                "overNumber": "Over 10",
                "balls": ["1", "4", "6", "0", "1", "W"],
                "totalRuns": "12"
            }
        ],
        "team_odds": {
            "backOdds": "1.5",
            "layOdds": "1.6"
        }
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Failed to send data: {e}")

if __name__ == "__main__":
    token = get_token()
    if token:
        print(f"Got token: {token[:10]}...")
        send_data(token)
