"""Browser UI tests for prediction history flows (mocked API)."""

from __future__ import annotations

import re
from playwright.sync_api import expect

from .support import (
    ApiStub,
    BrowserTestCase,
    inject_session,
    make_disease,
    make_history_item,
    make_plant,
    make_prediction_dto,
    make_user,
)


def case_meta(case_id: str, priority: str):
    def decorator(fn):
        fn.case_id = case_id
        fn.priority = priority
        return fn

    return decorator


class HistoryBrowserTests(BrowserTestCase):
    @case_meta("E2E-HIST-01", "P0")
    def test_history_list_loads_items_and_switches_list_and_card_views(self) -> None:
        """E2E-HIST-01 [UI/browser test]: /history fetches GET /api/predictions and renders items."""
        user = make_user()
        items = [
            make_history_item("hist-1", "Tomato", "Cà chua", "Early Blight", "Bệnh cháy lá sớm", 0.94),
            make_history_item("hist-2", "Rice", "Lúa nước", "Healthy", "Lá khỏe mạnh", 0.98),
        ]
        stub = ApiStub(user=user, history=items)
        context, page, _ = self.new_context()
        inject_session(context, user, token="hist-jwt")
        stub.mount(page)

        page.goto(f"{self.base_url}/history", wait_until="networkidle")
        expect(page.get_by_role("heading", name="Mẫu đã lưu", exact=True)).to_be_visible()
        expect(page.get_by_text("Hiện có 2 mẫu.", exact=False)).to_be_visible()
        expect(page.locator("article")).to_have_count(2)
        expect(page.get_by_role("heading", name="Bệnh cháy lá sớm", exact=True)).to_be_visible()
        expect(page.get_by_text("94%", exact=True)).to_be_visible()

        page.get_by_role("button", name="Dạng lưới", exact=True).click()
        expect(page.get_by_role("button", name="Dạng lưới", exact=True)).to_have_attribute("aria-pressed", "true")
        expect(page.locator("article")).to_have_count(2)

        hist_reqs = [r for r in stub.requests if r.method == "GET" and r.path == "/api/predictions"]
        self.assertGreaterEqual(len(hist_reqs), 1)
        self.assertEqual(hist_reqs[0].headers.get("authorization"), "Bearer hist-jwt")

    @case_meta("E2E-HIST-02", "P0")
    def test_history_detail_modal_fetches_snapshot_by_id(self) -> None:
        """E2E-HIST-02 [UI/browser test]: clicking Xem chi tiết loads GET /api/predictions/{id}."""
        user = make_user()
        plant = make_plant()
        disease = make_disease()
        item = make_history_item("hist-snap-1", confidence=0.91)
        detail = make_prediction_dto(
            prediction_id="hist-snap-1",
            confidence=0.91,
            plant=plant,
            disease=disease,
        )
        stub = ApiStub(
            user=user,
            plants=[plant],
            diseases=[disease],
            history=[item],
            prediction_details={"hist-snap-1": detail},
        )
        context, page, _ = self.new_context()
        inject_session(context, user, token="snap-jwt")
        stub.mount(page)

        page.goto(f"{self.base_url}/history", wait_until="networkidle")
        page.get_by_role("button", name="Xem chi tiết", exact=True).first.click()

        dialog = page.get_by_role("dialog")
        expect(dialog.get_by_role("heading", name="Chi tiết kết quả phân loại", exact=True)).to_be_visible()
        expect(dialog.get_by_role("heading", name="Bệnh cháy lá sớm", exact=True)).to_be_visible()
        expect(dialog.get_by_text("91%", exact=True)).to_be_visible()
        expect(dialog.get_by_role("button", name="In / lưu PDF", exact=True)).to_be_visible()

        detail_reqs = [r for r in stub.requests if r.method == "GET" and r.path == "/api/predictions/hist-snap-1"]
        self.assertEqual(len(detail_reqs), 1)
        self.assertEqual(detail_reqs[0].headers.get("authorization"), "Bearer snap-jwt")

    @case_meta("E2E-HIST-03", "P1")
    def test_delete_history_item_with_confirmation_persists_in_stub_across_reload(self) -> None:
        """E2E-HIST-03 [UI/browser test]: delete confirmation sends DELETE and removes item across reload."""
        user = make_user()
        items = [
            make_history_item("hist-del-1", disease_vi="Bệnh cháy lá sớm"),
            make_history_item("hist-keep-2", plant_name="Rice", plant_vi="Lúa nước", disease_name="Healthy", disease_vi="Lá khỏe mạnh"),
        ]
        stub = ApiStub(user=user, history=items)
        context, page, _ = self.new_context()
        inject_session(context, user, token="del-jwt")
        stub.mount(page)

        page.goto(f"{self.base_url}/history", wait_until="networkidle")
        expect(page.locator("article")).to_have_count(2)

        page.get_by_role("button", name="Xóa kết quả Bệnh cháy lá sớm", exact=True).click()
        dialog = page.get_by_role("alertdialog")
        expect(dialog.get_by_role("heading", name="Xác nhận xóa bản ghi chẩn đoán?", exact=True)).to_be_visible()
        dialog.get_by_role("button", name="Xác nhận xóa", exact=True).click()

        expect(page.locator("article")).to_have_count(1)
        expect(page.get_by_role("heading", name="Bệnh cháy lá sớm", exact=True)).to_have_count(0)

        del_reqs = [r for r in stub.requests if r.method == "DELETE" and r.path == "/api/predictions/hist-del-1"]
        self.assertEqual(len(del_reqs), 1)
        self.assertEqual(del_reqs[0].headers.get("authorization"), "Bearer del-jwt")

        page.reload(wait_until="networkidle")
        expect(page.locator("article")).to_have_count(1)
        expect(page.get_by_role("heading", name="Lá khỏe mạnh", exact=True)).to_be_visible()

    @case_meta("E2E-HIST-06", "P2")
    def test_history_handles_zero_one_and_multiple_records_empty_states(self) -> None:
        """E2E-HIST-06 [UI/browser test]: /history renders empty state (0), single item (1), and multi-item list cleanly."""
        user = make_user()
        stub = ApiStub(user=user, history=[])
        context, page, _ = self.new_context()
        inject_session(context, user)
        stub.mount(page)

        page.goto(f"{self.base_url}/history", wait_until="networkidle")
        expect(page.get_by_role("heading", name="Chưa có mẫu nào được lưu", exact=True)).to_be_visible()

        stub.history = [make_history_item("single-1")]
        page.reload(wait_until="networkidle")
        expect(page.locator("article")).to_have_count(1)
        expect(page.get_by_text("Hiện có 1 mẫu.", exact=False)).to_be_visible()

        stub.history = [make_history_item(f"multi-{i}") for i in range(1, 13)]
        page.reload(wait_until="networkidle")
        expect(page.locator("article")).to_have_count(12)
        expect(page.get_by_text("Hiện có 12 mẫu.", exact=False)).to_be_visible()
