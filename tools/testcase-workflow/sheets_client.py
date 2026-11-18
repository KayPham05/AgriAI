"""Small Google Sheets API client with Service Account first authentication."""

from __future__ import annotations

import json
import os
import time
from pathlib import Path
from urllib.parse import quote
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets"


class SheetsClient:
    def __init__(self, service_account_file: str | None = None, access_token: str | None = None) -> None:
        self.access_token = self._load_access_token(service_account_file, access_token)

    @staticmethod
    def _load_access_token(service_account_file: str | None, access_token: str | None) -> str:
        key_path = service_account_file or os.getenv("GOOGLE_SHEETS_SERVICE_ACCOUNT_FILE") or os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if key_path:
            path = Path(key_path)
            if not path.is_file():
                raise RuntimeError(f"Service Account file does not exist: {path}")
            try:
                from google.auth.transport.requests import Request as GoogleRequest
                from google.oauth2 import service_account
            except ImportError as error:
                raise RuntimeError("google-auth is required for Service Account Sheets access; install tools/testcase-workflow/requirements.txt") from error
            credentials = service_account.Credentials.from_service_account_file(str(path), scopes=[SHEETS_SCOPE])
            credentials.refresh(GoogleRequest())
            if not credentials.token:
                raise RuntimeError("Service Account token refresh returned no token")
            return credentials.token

        token = access_token or os.getenv("GOOGLE_SHEETS_ACCESS_TOKEN")
        if token:
            return token
        raise RuntimeError("Set GOOGLE_SHEETS_SERVICE_ACCOUNT_FILE (preferred) or GOOGLE_SHEETS_ACCESS_TOKEN for --sheets")

    def request(self, method: str, url: str, body: dict | None = None) -> dict:
        payload = None if body is None else json.dumps(body).encode("utf-8")
        request = Request(url, data=payload, method=method, headers={
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        })
        for attempt in range(4):
            try:
                with urlopen(request, timeout=30) as response:
                    raw = response.read().decode("utf-8")
                return json.loads(raw) if raw else {}
            except HTTPError as error:
                detail = error.read().decode("utf-8", errors="replace")[:1000]
                if error.code not in {429, 500, 502, 503, 504} or attempt == 3:
                    raise RuntimeError(f"Google Sheets API {error.code}: {detail}") from error
                time.sleep(2 ** attempt)
            except URLError as error:
                if attempt == 3:
                    raise RuntimeError(f"Google Sheets API network error: {error}") from error
                time.sleep(2 ** attempt)
        raise RuntimeError("Google Sheets API request exhausted retries")

    @staticmethod
    def _range(tab_name: str, a1: str) -> str:
        return quote(f"'{tab_name}'!{a1}", safe="")

    def values(self, spreadsheet_id: str, tab_name: str, a1: str = "A:Z") -> list[list[str]]:
        url = f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values/{self._range(tab_name, a1)}"
        return self.request("GET", url).get("values", [])

    def update(self, spreadsheet_id: str, tab_name: str, a1: str, values: list[list[str]]) -> dict:
        url = f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values/{self._range(tab_name, a1)}?valueInputOption=USER_ENTERED"
        return self.request("PUT", url, {"range": f"'{tab_name}'!{a1}", "majorDimension": "ROWS", "values": values})

    def batch_update(self, spreadsheet_id: str, updates: list[tuple[str, str, list[list[str]]]]) -> dict:
        """Update multiple ranges in one Google Sheets values:batchUpdate request."""
        data = [{"range": f"'{tab_name}'!{a1}", "majorDimension": "ROWS", "values": values} for tab_name, a1, values in updates]
        if not data:
            return {"totalUpdatedRanges": 0}
        url = f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values:batchUpdate"
        return self.request("POST", url, {"valueInputOption": "USER_ENTERED", "data": data})

    def clear(self, spreadsheet_id: str, tab_name: str, a1: str) -> dict:
        url = f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values/{self._range(tab_name, a1)}:clear"
        return self.request("POST", url, {})

    def append(self, spreadsheet_id: str, tab_name: str, row: list[str]) -> dict:
        encoded_range = self._range(tab_name, "A:Z")
        url = f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values/{encoded_range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS"
        return self.request("POST", url, {"values": [row]})

    def sheet_metadata(self, spreadsheet_id: str) -> list[dict]:
        url = f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}?fields=sheets.properties"
        return [sheet.get("properties", {}) for sheet in self.request("GET", url).get("sheets", [])]

    def conditional_formats(self, spreadsheet_id: str) -> dict[int, list[dict]]:
        url = f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}?fields=sheets(properties(sheetId,title),conditionalFormats)"
        result: dict[int, list[dict]] = {}
        for sheet in self.request("GET", url).get("sheets", []):
            props = sheet.get("properties", {})
            if "sheetId" in props:
                result[int(props["sheetId"])] = list(sheet.get("conditionalFormats", []))
        return result

    @staticmethod
    def delete_conditional_format_request(sheet_id: int, index: int) -> dict:
        return {"deleteConditionalFormatRule": {"sheetId": sheet_id, "index": index}}

    def ensure_sheet(self, spreadsheet_id: str, tab_name: str, template_tab: str | None = None) -> dict:
        sheets = self.sheet_metadata(spreadsheet_id)
        existing = next((sheet for sheet in sheets if sheet.get("title") == tab_name), None)
        if existing:
            existing["created"] = False
            return existing
        template = None
        if template_tab:
            template = next(
                (
                    sheet
                    for sheet in sheets
                    if sheet.get("title") == template_tab
                    or str(sheet.get("title", "")).strip() == str(template_tab).strip()
                ),
                None,
            )
        if template is None:
            template = next(
                (
                    sheet
                    for sheet in sheets
                    if str(sheet.get("title", "")).strip().startswith(("Template", "WEB-DIAG-01", "SR_001"))
                ),
                None,
            )
        operation = {"duplicateSheet": {"sourceSheetId": template["sheetId"], "newSheetName": tab_name}} if template else {"addSheet": {"properties": {"title": tab_name}}}
        response = self.request("POST", f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}:batchUpdate", {"requests": [operation]})
        reply = response.get("replies", [{}])[0]
        properties = reply.get("duplicateSheet", {}).get("properties") or reply.get("addSheet", {}).get("properties", {})
        properties["created"] = True
        return properties

    def insert_row(self, spreadsheet_id: str, sheet_id: int, row_number: int) -> dict:
        body = {"requests": [{"insertDimension": {"range": {"sheetId": sheet_id, "dimension": "ROWS", "startIndex": row_number - 1, "endIndex": row_number}, "inheritFromBefore": True}}]}
        return self.request("POST", f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}:batchUpdate", body)

    def batch_requests(self, spreadsheet_id: str, requests: list[dict]) -> dict:
        if not requests:
            return {}
        return self.request("POST", f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}:batchUpdate", {"requests": requests})

    @staticmethod
    def copy_row_style_requests(
        sheet_id: int,
        source_row: int,
        start_row: int,
        end_row: int,
        end_col: int,
        include_validation: bool = True,
    ) -> list[dict]:
        if end_row < start_row:
            return []
        source = {
            "sheetId": sheet_id,
            "startRowIndex": source_row - 1,
            "endRowIndex": source_row,
            "startColumnIndex": 0,
            "endColumnIndex": end_col,
        }
        destination = {
            "sheetId": sheet_id,
            "startRowIndex": start_row - 1,
            "endRowIndex": end_row,
            "startColumnIndex": 0,
            "endColumnIndex": end_col,
        }
        requests = [{"copyPaste": {"source": source, "destination": destination, "pasteType": "PASTE_FORMAT", "pasteOrientation": "NORMAL"}}]
        if include_validation:
            requests.append({"copyPaste": {"source": source, "destination": destination, "pasteType": "PASTE_DATA_VALIDATION", "pasteOrientation": "NORMAL"}})
        return requests

    @staticmethod
    def set_hyperlink_request(sheet_id: int, row_number: int, col_index: int, uri: str | None) -> dict:
        if uri:
            return {
                "updateCells": {
                    "range": {
                        "sheetId": sheet_id,
                        "startRowIndex": row_number - 1,
                        "endRowIndex": row_number,
                        "startColumnIndex": col_index,
                        "endColumnIndex": col_index + 1,
                    },
                    "rows": [{"values": [{"textFormatRuns": [{"startIndex": 0, "format": {"link": {"uri": uri}}}]}]}],
                    "fields": "textFormatRuns",
                }
            }
        return {
            "updateCells": {
                "range": {
                    "sheetId": sheet_id,
                    "startRowIndex": row_number - 1,
                    "endRowIndex": row_number,
                    "startColumnIndex": col_index,
                    "endColumnIndex": col_index + 1,
                },
                "rows": [
                    {
                        "values": [
                            {
                                "textFormatRuns": [],
                                "userEnteredFormat": {
                                    "textFormat": {
                                        "underline": False,
                                        "foregroundColor": {"red": 0, "green": 0, "blue": 0},
                                    }
                                },
                            }
                        ]
                    }
                ],
                "fields": "textFormatRuns,userEnteredFormat.textFormat(underline,foregroundColor,link)",
            }
        }

    @staticmethod
    def clear_validation_request(sheet_id: int, row_number: int, col_index: int) -> dict:
        return {
            "setDataValidation": {
                "range": {
                    "sheetId": sheet_id,
                    "startRowIndex": row_number - 1,
                    "endRowIndex": row_number,
                    "startColumnIndex": col_index,
                    "endColumnIndex": col_index + 1,
                },
                "rule": None,
            }
        }

    def first_column_with_rows(self, spreadsheet_id: str, tab_name: str) -> list[tuple[int, str]]:
        values = self.values(spreadsheet_id, tab_name, "A:A")
        return [(index, str(row[0]).strip()) for index, row in enumerate(values, start=1) if row and str(row[0]).strip()]

    def first_column(self, spreadsheet_id: str, tab_name: str) -> set[str]:
        return {value for _, value in self.first_column_with_rows(spreadsheet_id, tab_name)}
