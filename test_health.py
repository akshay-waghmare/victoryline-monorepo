#!/usr/bin/env python3
"""Quick script to test the scraper health endpoint."""

import requests
import json

print("Testing scraper health endpoint...")
print("=" * 60)

try:
    response = requests.get("http://localhost:5000/health", timeout=5)
    print(f"Status Code: {response.status_code}")
    print(f"\nResponse:")
    print(json.dumps(response.json(), indent=2))
    
    # Validate response structure
    data = response.json()
    assert "success" in data
    assert "data" in data
    assert "timestamp" in data
    
    health_data = data["data"]
    print(f"\n✅ Overall Status: {health_data['overall_status']}")
    print(f"✅ Active Scrapers: {health_data['active_scraper_count']}")
    print(f"✅ Uptime: {health_data['uptime_seconds']} seconds")
    print(f"✅ Shutdown Requested: {health_data['service_shutdown_requested']}")
    
    print("\n" + "=" * 60)
    print("✅ Health endpoint working correctly!")
    
except requests.exceptions.ConnectionError:
    print("❌ Error: Could not connect to http://localhost:5000")
    print("   Make sure the server is running!")
except Exception as e:
    print(f"❌ Error: {e}")
