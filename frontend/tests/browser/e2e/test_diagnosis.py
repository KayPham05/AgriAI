"""Browser UI tests for plant diagnosis flows (mocked API)."""

from __future__ import annotations

from playwright.sync_api import expect

from .support import (
    ApiStub,
    BrowserTestCase,
    inject_session,
    make_disease,
    make_plant,
    make_prediction_dto,
    make_user,
    png_bytes,
)


def case_meta(case_id: str, priority: str):
    def decorator(fn):
        fn.case_id = case_id
        fn.priority = priority
        return fn

    return decorator


class DiagnosisBrowserTests(BrowserTestCase):
    @case_meta("E2E-DIAG-01", "P0")
    def test_guest_diagnosis_completes_without_saving_account_history(self) -> None:
        """E2E-DIAG-01 [UI/browser test]: guest analyzes image anonymously without auto-saving history."""
        stub = ApiStub(user=None)
        _, page, _ = self.new_context()
        stub.mount(page)
        page.goto(f"{self.base_url}/diagnose", wait_until="networkidle")

        expect(page.get_by_text("Bạn đang kiểm tra lá với tư cách khách.", exact=False)).to_be_visible()
        page.get_by_label("Chọn ảnh lá cây", exact=True).set_input_files(
            {"name": "guest-leaf.png", "mimeType": "image/png", "buffer": png_bytes(224, 224)}
        )
        page.get_by_role("button", name="Phân tích ngay", exact=True).click()

        panel = page.get_by_role("region", name="Kết quả phân tích")
        expect(panel.get_by_role("heading", name="Bệnh cháy lá sớm", exact=True)).to_be_visible()
        expect(panel.get_by_text("94.0%", exact=True).first).to_be_visible()
        expect(page.get_by_role("button", name="Lưu kết quả vào tài khoản", exact=True)).to_be_visible()

        post_reqs = [r for r in stub.requests if r.method == "POST" and r.path == "/api/predictions"]
        self.assertEqual(len(post_reqs), 1)
        self.assertNotIn("authorization", post_reqs[0].headers)
        self.assertEqual([r for r in stub.requests if r.path == "/api/predictions/guest/save"], [])

    @case_meta("E2E-DIAG-02", "P0")
    def test_authenticated_diagnosis_saves_prediction_to_history(self) -> None:
        """E2E-DIAG-02 [UI/browser test]: authenticated diagnosis posts with Bearer token and records history."""
        user = make_user()
        stub = ApiStub(user=user)
        context, page, _ = self.new_context()
        inject_session(context, user, token="auth-diag-jwt")
        stub.mount(page)

        page.goto(f"{self.base_url}/diagnose", wait_until="networkidle")
        page.get_by_label("Chọn ảnh lá cây", exact=True).set_input_files(
            {"name": "auth-leaf.png", "mimeType": "image/png", "buffer": png_bytes(224, 224)}
        )
        page.get_by_role("button", name="Phân tích ngay", exact=True).click()

        panel = page.get_by_role("region", name="Kết quả phân tích")
        expect(panel.get_by_role("heading", name="Bệnh cháy lá sớm", exact=True)).to_be_visible()
        post_reqs = [r for r in stub.requests if r.method == "POST" and r.path == "/api/predictions"]
        self.assertEqual(len(post_reqs), 1)
        self.assertEqual(post_reqs[0].headers.get("authorization"), "Bearer auth-diag-jwt")
        self.assertEqual(len(stub.history), 1)

    @case_meta("E2E-DIAG-03", "P0")
    def test_high_confidence_disease_shows_details_top3_and_treatment(self) -> None:
        """E2E-DIAG-03 [UI/browser test]: confidence > 80% shows disease name, Top-3, symptoms, treatment."""
        user = make_user()
        stub = ApiStub(user=user)
        context, page, _ = self.new_context()
        inject_session(context, user)
        stub.mount(page)

        page.goto(f"{self.base_url}/diagnose", wait_until="networkidle")
        page.get_by_label("Chọn ảnh lá cây", exact=True).set_input_files(
            {"name": "blight-leaf.png", "mimeType": "image/png", "buffer": png_bytes(240, 240)}
        )
        page.get_by_role("button", name="Phân tích ngay", exact=True).click()

        panel = page.get_by_role("region", name="Kết quả phân tích")
        expect(panel.get_by_role("heading", name="Bệnh cháy lá sớm", exact=True)).to_be_visible()
        expect(panel.get_by_text("94.0%", exact=True).first).to_be_visible()
        expect(panel.get_by_role("list", name="Dự đoán Top-3").get_by_role("listitem")).to_have_count(3)
        expect(panel.get_by_text("Đốm nâu có vòng đồng tâm trên lá già.", exact=True)).to_be_visible()
        expect(panel.get_by_text("Loại bỏ lá bệnh và phun thuốc theo khuyến cáo.", exact=True)).to_be_visible()

    @case_meta("E2E-DIAG-05", "P1")
    def test_healthy_leaf_shows_care_fallback_without_medication(self) -> None:
        """E2E-DIAG-05 [UI/browser test]: healthy prediction shows no treatment recommendation."""
        plant = make_plant()
        healthy = make_disease(
            disease_id="22222222-2222-4222-8222-222222222202",
            name="Healthy",
            vietnamese_name="Lá khỏe mạnh",
            symptoms="Lá xanh đều, không thấy đốm bệnh.",
            treatment=None,
            prevention="Duy trì tưới tiêu và dinh dưỡng cân đối.",
            condition_type="Healthy",
        )
        healthy_dto = make_prediction_dto(
            prediction_id="pred-healthy",
            confidence=0.97,
            plant=plant,
            disease=healthy,
            guest_token="guest-healthy",
        )
        stub = ApiStub(user=None, plants=[plant], diseases=[healthy])
        stub.on("POST", "/api/predictions", lambda route, _rec: route.fulfill(status=200, json=healthy_dto))

        _, page, _ = self.new_context()
        stub.mount(page)
        page.goto(f"{self.base_url}/diagnose", wait_until="networkidle")
        page.get_by_label("Chọn ảnh lá cây", exact=True).set_input_files(
            {"name": "healthy.png", "mimeType": "image/png", "buffer": png_bytes(224, 224)}
        )
        page.get_by_role("button", name="Phân tích ngay", exact=True).click()

        panel = page.get_by_role("region", name="Kết quả phân tích")
        expect(panel.get_by_role("heading", name="Lá khỏe mạnh", exact=True)).to_be_visible()
        expect(panel.get_by_text("97.0%", exact=True).first).to_be_visible()
        expect(panel.get_by_text("Chưa có khuyến nghị xử lý trong cẩm nang.", exact=True)).to_be_visible()

    @case_meta("E2E-DIAG-07", "P2")
    def test_client_validation_rejects_invalid_empty_oversize_and_small_files(self) -> None:
        """E2E-DIAG-07 [UI/browser test]: invalid MIME, 0-byte, >15 MB, <224px rejected without API POST."""
        stub = ApiStub(user=None)
        _, page, _ = self.new_context()
        stub.mount(page)

        cases = [
            ("wrong.pdf", "application/pdf", b"%PDF-1.4", "Định dạng không hỗ trợ"),
            ("empty.png", "image/png", b"", "Ảnh lỗi hoặc độ phân giải quá thấp"),
            ("huge.png", "image/png", bytes(15 * 1024 * 1024 + 1), "Ảnh vượt quá 15 MB"),
            ("tiny.png", "image/png", png_bytes(223, 224), "Ảnh lỗi hoặc độ phân giải quá thấp"),
        ]
        for filename, mime, data, expected_title in cases:
            page.goto(f"{self.base_url}/diagnose", wait_until="networkidle")
            page.get_by_label("Chọn ảnh lá cây", exact=True).set_input_files(
                {"name": filename, "mimeType": mime, "buffer": data}
            )
            upload_region = page.get_by_role("region", name="Tải ảnh lên")
            expect(upload_region.get_by_role("heading", name=expected_title, exact=True)).to_be_visible()

        self.assertEqual([r for r in stub.requests if r.method == "POST" and r.path == "/api/predictions"], [])
