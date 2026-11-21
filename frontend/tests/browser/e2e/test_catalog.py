"""Browser UI tests for public catalog routes (/plants, /diseases, /medicines, /knowledge) with mocked API."""

from __future__ import annotations

import re
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import expect

from .support import (
    ApiStub,
    BrowserTestCase,
    CREATED_AT,
    make_disease,
    make_pair,
    make_plant,
)


def case_meta(case_id: str, priority: str):
    def decorator(fn):
        fn.case_id = case_id
        fn.priority = priority
        return fn

    return decorator


def make_medicine(
    med_id: str,
    product_name: str,
    active_ingredient: str = "Azoxystrobin",
    plant_id: str = "",
    disease_id: str = "",
    uses: list[dict] | None = None,
) -> dict:
    return {
        "id": med_id,
        "productName": product_name,
        "activeIngredient": active_ingredient,
        "targetUse": "Phòng trừ bệnh nấm hại lá.",
        "sourceUrl": "https://example.test/medicine-label",
        "safetyWarning": "Mang đồ bảo hộ khi pha và phun.",
        "labelReference": "Nhãn sản phẩm mẫu theo quy chuẩn.",
        "plantDiseaseIds": [f"pair-{plant_id}-{disease_id}"] if plant_id and disease_id else [],
        "plantIds": [plant_id] if plant_id else [],
        "diseaseIds": [disease_id] if disease_id else [],
        "uses": uses if uses is not None else (
            [{"plantDiseaseId": f"pair-{plant_id}-{disease_id}", "labelDirections": "Pha 10 ml / 16 lít nước."}]
            if plant_id and disease_id
            else []
        ),
        "isActive": True,
        "isApproved": True,
        "isPublic": True,
        "createdAt": CREATED_AT,
        "updatedAt": CREATED_AT,
    }


def make_knowledge_doc(
    doc_id: str,
    title: str,
    content: str = "Hướng dẫn nhận biết sớm và phòng trừ tổng hợp.",
    plant_id: str = "",
    disease_id: str = "",
) -> dict:
    return {
        "id": doc_id,
        "title": title,
        "content": content,
        "sourceUrl": "https://example.test/knowledge-guide",
        "plantDiseaseIds": [f"pair-{plant_id}-{disease_id}"] if plant_id and disease_id else [],
        "plantIds": [plant_id] if plant_id else [],
        "diseaseIds": [disease_id] if disease_id else [],
        "isActive": True,
        "isApproved": True,
        "isPublic": True,
        "createdAt": CREATED_AT,
        "updatedAt": CREATED_AT,
    }


class CatalogBrowserTests(BrowserTestCase):
    @case_meta("E2E-CAT-01", "P0")
    def test_plants_catalog_search_and_detail_navigation(self) -> None:
        """E2E-CAT-01 [UI/browser test]: /plants lists, searches, and opens /plants/[id] detail."""
        tomato = make_plant("11111111-1111-4111-8111-111111111101", "Tomato", "Cà chua", "Solanum lycopersicum")
        rice = make_plant("11111111-1111-4111-8111-111111111102", "Rice", "Lúa nước", "Oryza sativa", "Cây lương thực")
        blight = make_disease()
        stub = ApiStub(plants=[tomato, rice], diseases=[blight], pairs=[make_pair(tomato, blight)])

        _, page, _ = self.new_context()
        stub.mount(page)
        page.goto(f"{self.base_url}/plants", wait_until="networkidle")

        expect(page.get_by_role("heading", name="Cây trồng", exact=True)).to_be_visible()
        expect(page.get_by_role("heading", name="Cà chua", exact=True)).to_be_visible()
        expect(page.get_by_role("heading", name="Lúa nước", exact=True)).to_be_visible()

        page.get_by_label("Tìm kiếm danh mục", exact=True).fill("Cà chua")
        page.get_by_role("button", name="Tìm kiếm", exact=True).click()
        expect(page.get_by_role("heading", name="Cà chua", exact=True)).to_be_visible()
        expect(page.get_by_role("heading", name="Lúa nước", exact=True)).to_have_count(0)

        page.get_by_role("link", name="Xem chi tiết", exact=True).first.click()
        expect(page).to_have_url(re.compile(rf"/plants/{tomato['id']}$"))
        expect(page.get_by_role("heading", level=1, name="Cà chua", exact=True)).to_be_visible()
        expect(page.get_by_text("Solanum lycopersicum", exact=True)).to_be_visible()
        expect(page.get_by_role("heading", name="Bệnh cháy lá sớm", exact=True)).to_be_visible()

    @case_meta("E2E-CAT-02", "P1")
    def test_diseases_catalog_search_and_detail_navigation(self) -> None:
        """E2E-CAT-02 [UI/browser test]: /diseases searches and opens /diseases/[id] detail."""
        tomato = make_plant()
        blight = make_disease("22222222-2222-4222-8222-222222222201", "Early Blight", "Bệnh cháy lá sớm")
        blast = make_disease("22222222-2222-4222-8222-222222222202", "Leaf Blast", "Bệnh đạo ôn lá")
        stub = ApiStub(plants=[tomato], diseases=[blight, blast], pairs=[make_pair(tomato, blight)])

        _, page, _ = self.new_context()
        stub.mount(page)
        page.goto(f"{self.base_url}/diseases", wait_until="networkidle")

        expect(page.get_by_role("heading", name="Bệnh cây", exact=True)).to_be_visible()
        page.get_by_label("Tìm kiếm danh mục", exact=True).fill("cháy lá")
        page.get_by_role("button", name="Tìm kiếm", exact=True).click()
        expect(page.get_by_role("heading", name="Bệnh cháy lá sớm", exact=True)).to_be_visible()
        expect(page.get_by_role("heading", name="Bệnh đạo ôn lá", exact=True)).to_have_count(0)

        page.get_by_role("link", name="Xem chi tiết", exact=True).first.click()
        expect(page).to_have_url(re.compile(rf"/diseases/{blight['id']}$"))
        expect(page.get_by_role("heading", level=1, name="Bệnh cháy lá sớm", exact=True)).to_be_visible()
        expect(page.get_by_text("Đốm nâu có vòng đồng tâm trên lá già.", exact=True)).to_be_visible()
        expect(page.get_by_text("Loại bỏ lá bệnh và phun thuốc theo khuyến cáo.", exact=True)).to_be_visible()

    @case_meta("E2E-CAT-03", "P1")
    def test_medicines_catalog_filter_pagination_and_detail(self) -> None:
        """E2E-CAT-03 [UI/browser test]: /medicines filters by plant/disease, paginates, opens /medicines/[id]."""
        tomato = make_plant()
        blight = make_disease()
        meds = [
            make_medicine(f"33333333-3333-4333-8333-{i:012d}", f"Thuốc Mẫu {i:02d}", "Mancozeb", tomato["id"], blight["id"])
            for i in range(1, 25)
        ]
        stub = ApiStub(plants=[tomato], diseases=[blight], medicines=meds, pairs=[make_pair(tomato, blight)])

        _, page, _ = self.new_context()
        stub.mount(page)
        page.goto(f"{self.base_url}/medicines", wait_until="networkidle")

        expect(page.get_by_text("24 kết quả · Trang 1/2", exact=True)).to_be_visible()
        expect(page.get_by_role("heading", name="Thuốc Mẫu 01", exact=True)).to_be_visible()

        page.get_by_role("button", name="Trang sau", exact=True).click()
        expect(page).to_have_url(re.compile(r"[?&]pageNumber=2(?:&|$)"))
        expect(page.get_by_text("24 kết quả · Trang 2/2", exact=True)).to_be_visible()
        expect(page.get_by_role("heading", name="Thuốc Mẫu 21", exact=True)).to_be_visible()

        page.get_by_role("button", name="Trang trước", exact=True).click()
        expect(page).to_have_url(re.compile(r"[?&]pageNumber=1(?:&|$)"))
        expect(page.get_by_text("24 kết quả · Trang 1/2", exact=True)).to_be_visible()

        crop_filter = page.get_by_label("Lọc theo cây", exact=True)
        crop_filter.click()
        page.get_by_role("option", name="Cà chua", exact=True).click()
        expect(page).to_have_url(re.compile(rf"[?&]plantId={re.escape(tomato['id'])}(?:&|$)"))
        expect(crop_filter).to_have_text("Cà chua")
        page.get_by_label("Tìm kiếm danh mục", exact=True).fill("Thuốc Mẫu 01")
        page.get_by_role("button", name="Tìm kiếm", exact=True).click()
        page.wait_for_url(lambda url: parse_qs(urlparse(url).query).get("search") == ["Thuốc Mẫu 01"])
        expect(page.get_by_text("1 kết quả · Trang 1/1", exact=True)).to_be_visible()
        self.assertTrue(any(
            request.path == "/api/medicines"
            and request.query.get("plantId") == [tomato["id"]]
            and request.query.get("search") == ["Thuốc Mẫu 01"]
            for request in stub.requests
        ), "The medicine search must retain the selected crop filter")

        medicine_card = page.get_by_role("listitem").filter(
            has=page.get_by_role("heading", name="Thuốc Mẫu 01", exact=True),
        )
        medicine_card.get_by_role("link", name="Xem chi tiết", exact=True).click()
        expect(page).to_have_url(re.compile(r"/medicines/33333333-3333-4333-8333-000000000001$"))
        expect(page.get_by_role("heading", level=1, name="Thuốc Mẫu 01", exact=True)).to_be_visible()
        expect(page.get_by_text("Mang đồ bảo hộ khi pha và phun.", exact=True)).to_be_visible()
        expect(page.get_by_text("Pha 10 ml / 16 lít nước.", exact=True)).to_be_visible()

    @case_meta("E2E-CAT-04", "P1")
    def test_knowledge_catalog_search_and_article_detail(self) -> None:
        """E2E-CAT-04 [UI/browser test]: /knowledge searches documents and renders /knowledge/[id] detail."""
        tomato = make_plant()
        blight = make_disease()
        doc1 = make_knowledge_doc(
            "44444444-4444-4444-8444-444444444401",
            "Phòng trừ bệnh cháy lá sớm trên cà chua",
            "Cắt tỉa lá gốc và phun phòng định kỳ sau mưa.",
            tomato["id"],
            blight["id"],
        )
        doc2 = make_knowledge_doc(
            "44444444-4444-4444-8444-444444444402",
            "Kỹ thuật bón phân cân đối cho lúa",
            "Bón thúc đúng giai đoạn đẻ nhánh.",
        )
        stub = ApiStub(
            plants=[tomato],
            diseases=[blight],
            knowledge_documents=[doc1, doc2],
            pairs=[make_pair(tomato, blight)],
        )

        _, page, _ = self.new_context()
        stub.mount(page)
        page.goto(f"{self.base_url}/knowledge", wait_until="networkidle")

        page.get_by_label("Tìm kiếm danh mục", exact=True).fill("cháy lá sớm")
        page.get_by_role("button", name="Tìm kiếm", exact=True).click()
        expect(page.get_by_role("heading", name="Phòng trừ bệnh cháy lá sớm trên cà chua", exact=True)).to_be_visible()
        expect(page.get_by_role("heading", name="Kỹ thuật bón phân cân đối cho lúa", exact=True)).to_have_count(0)

        page.get_by_role("link", name="Xem chi tiết", exact=True).first.click()
        expect(page).to_have_url(re.compile(rf"/knowledge/{doc1['id']}$"))
        expect(page.get_by_role("heading", level=1, name="Phòng trừ bệnh cháy lá sớm trên cà chua", exact=True)).to_be_visible()
        expect(page.get_by_text("Cắt tỉa lá gốc và phun phòng định kỳ sau mưa.", exact=True)).to_be_visible()
        expect(page.get_by_role("link", name="Xem nguồn tham khảo", exact=True)).to_be_visible()

