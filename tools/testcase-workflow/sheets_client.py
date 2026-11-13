"""Minimal Google Sheets REST client using a user-provided OAuth access token."""

from __future__ import annotations

import json
import os
from urllib.parse import quote
from urllib.request import Request, urlopen


class SheetsClient:
    def __init__(self, access_token: str | None = None) -> None:
        self.access_token = access_token or os.getenv("GOOGLE_SHEETS_ACCESS_TOKEN")
        if not self.access_token:
            raise RuntimeError("GOOGLE_SHEETS_ACCESS_TOKEN is required for --sheets")

    def request(self, method: str, url: str, body: dict | None = None) -> dict:
        payload = None if body is None else json.dumps(body).encode("utf-8")
        request = Request(url, data=payload, method=method, headers={
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        })
        with urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))

    def append(self, spreadsheet_id: str, tab_name: str, row: list[str]) -> dict:
        encoded_range = quote(f"'{tab_name}'!A:Z", safe="")
        url = f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values/{encoded_range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS"
        return self.request("POST", url, {"values": [row]})

    def first_column(self, spreadsheet_id: str, tab_name: str) -> set[str]:
        encoded_range = quote(f"'{tab_name}'!A:A", safe="")
        url = f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values/{encoded_range}"
        values = self.request("GET", url).get("values", [])
        return {str(row[0]).strip() for row in values if row and str(row[0]).strip()}
