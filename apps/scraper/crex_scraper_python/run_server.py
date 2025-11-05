#!/usr/bin/env python
"""
Startup script for the Cricket Scraper Service with structured logging.
"""

import sys
import os
import threading
import time

# Add both current directory and parent directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)

sys.path.insert(0, current_dir)
sys.path.insert(0, parent_dir)

from src.crex_main_url import app, initialize_database, job

def auto_start_periodic_job():
    """
    Auto-starts the periodic scraping job after a short delay.
    This ensures:
    1. Backend can mark old matches for deletion if no live matches exist
    2. New matches are automatically detected and scraped
    3. System works correctly even after server restarts
    """
    time.sleep(5)  # Wait 5 seconds for server to fully start
    print("\n🚀 Auto-starting periodic scraping job...")
    print("   - Will check for live matches every 60 seconds")
    print("   - Backend will clean up old/finished matches")
    print("   - New matches will be automatically scraped\n")
    job()  # Start the infinite loop

if __name__ == "__main__":
    print("Starting Cricket Scraper Service...")
    print("Initializing database...")
    initialize_database()
    print("Database initialized successfully")
    
    # Start periodic job in background thread
    scraping_thread = threading.Thread(target=auto_start_periodic_job)
    scraping_thread.daemon = True
    scraping_thread.start()
    
    print("\nServer starting on http://0.0.0.0:5000")
    print("Periodic scraping will auto-start in 5 seconds...")
    print("Press CTRL+C to quit\n")
    
    app.run(host="0.0.0.0", port=5000, debug=False)
