#!/usr/bin/env python3
"""Query sanitized Google Search Console performance data for SEO investigations."""

import argparse
import json
from datetime import datetime, timezone

import google.auth.transport.requests
import requests
from google.oauth2 import service_account


SCOPE = "https://www.googleapis.com/auth/webmasters.readonly"
API_ROOT = "https://searchconsole.googleapis.com/webmasters/v3/sites"


def query(access_token, site_url, start_date, end_date, dimensions, row_limit):
    response = requests.post(
        f"{API_ROOT}/{requests.utils.quote(site_url, safe='')}/searchAnalytics/query",
        headers={"Authorization": f"Bearer {access_token}"},
        json={
            "startDate": start_date,
            "endDate": end_date,
            "dimensions": dimensions,
            "rowLimit": row_limit,
            "dataState": "all",
        },
        timeout=60,
    )
    response.raise_for_status()
    return response.json().get("rows", [])


def get_sitemaps(access_token, site_url):
    response = requests.get(
        f"{API_ROOT}/{requests.utils.quote(site_url, safe='')}/sitemaps",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=60,
    )
    response.raise_for_status()
    return response.json().get("sitemap", [])


def inspect_url(access_token, site_url, inspection_url):
    response = requests.post(
        "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"inspectionUrl": inspection_url, "siteUrl": site_url},
        timeout=60,
    )
    response.raise_for_status()
    return response.json().get("inspectionResult", {})


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--credentials", required=True)
    parser.add_argument("--site-url", default="https://www.crickzen.com/")
    parser.add_argument("--start-date", required=True)
    parser.add_argument("--end-date", required=True)
    parser.add_argument("--row-limit", type=int, default=25000)
    parser.add_argument("--inspect-url-file")
    args = parser.parse_args()

    credentials = service_account.Credentials.from_service_account_file(
        args.credentials, scopes=[SCOPE]
    )
    credentials.refresh(google.auth.transport.requests.Request())

    dimension_sets = {
        "date": ["date"],
        "page": ["page"],
        "query": ["query"],
        "device": ["device"],
        "country": ["country"],
        "date_page": ["date", "page"],
        "date_query": ["date", "query"],
    }
    result = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "siteUrl": args.site_url,
        "startDate": args.start_date,
        "endDate": args.end_date,
        "rows": {},
        "sitemaps": get_sitemaps(credentials.token, args.site_url),
    }
    for name, dimensions in dimension_sets.items():
        result["rows"][name] = query(
            credentials.token,
            args.site_url,
            args.start_date,
            args.end_date,
            dimensions,
            args.row_limit,
        )

    result["urlInspection"] = {}
    if args.inspect_url_file:
        with open(args.inspect_url_file, encoding="utf-8") as url_file:
            for inspection_url in (line.strip() for line in url_file):
                if inspection_url:
                    result["urlInspection"][inspection_url] = inspect_url(
                        credentials.token, args.site_url, inspection_url
                    )

    print(json.dumps(result, separators=(",", ":")))


if __name__ == "__main__":
    main()
