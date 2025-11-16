"""Simple test to check if Flask is responding at all."""
import requests
import sys

def test_simple():
    try:
        print("Testing root endpoint...")
        response = requests.get("http://127.0.0.1:5000/", timeout=2)
        print(f"✅ Root endpoint responded: {response.status_code}")
        print(f"Content: {response.text[:200]}")
    except requests.exceptions.Timeout:
        print("❌ Root endpoint timed out")
    except requests.exceptions.ConnectionError as e:
        print(f"❌ Connection error: {e}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_simple()
