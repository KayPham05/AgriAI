"""Local catalog layout regression; requires frontend localhost:3000 and Playwright."""

import json
from playwright.sync_api import expect, sync_playwright


def mock_api(route):
    user = {
        "id": "catalog-review",
        "fullName": "Review",
        "email": "review@example.test",
        "role": "User",
        "createdAt": "2026-10-21T00:00:00Z",
    }
    body = user if "/auth/me" in route.request.url else (
        {"items": [], "totalCount": 0, "pageNumber": 1, "pageSize": 100}
        if "/predictions" in route.request.url else []
    )
    route.fulfill(status=200, json=body)


with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 1100})
    session = {"token": "fixture", "user": {"id": "catalog-review", "role": "User"}}
    page.add_init_script(
        'localStorage.setItem("leafai_auth_session", '
        + json.dumps(json.dumps(session)) + ')'
    )
    page.route("**/api/**", mock_api)
    page.goto("http://localhost:3000/home", wait_until="domcontentloaded")
    panel = page.get_by_role("tabpanel")
    cards = panel.locator('[data-slot="card"]')
    expect(cards).to_have_count(4)
    for card in cards.all():
        card.scroll_into_view_if_needed()
        card.hover()
        expect(card).to_have_css("translate", "0px -4px")
        assert card.evaluate("e=>getComputedStyle(e).boxShadow") != "none"
        page.mouse.move(0, 0)
        expect(card).to_have_css("translate", "none")
    cards.first.get_by_role("button").focus()
    expect(cards.first).to_have_css("translate", "0px -4px")
    cards.first.get_by_role("button").evaluate("e=>e.blur()")
    expect(cards.first).to_have_css("translate", "none")
    cards.first.hover()
    page.mouse.down()
    page.mouse.move(0, 0)
    expect(cards.first).to_have_css("translate", "0px -4px")
    page.mouse.up()
    expect(cards.first).to_have_css("translate", "none")
    for width in (1440, 768, 375, 320):
        page.set_viewport_size({"width": width, "height": 1100})
        for card in cards.all():
            photo = card.get_by_role("img")
            photo.scroll_into_view_if_needed()
            expect(photo).to_be_visible()
            box = card.bounding_box()
            image_box = photo.bounding_box()
            assert abs(image_box["width"] - box["width"]) < 2
            assert abs(image_box["y"] - box["y"]) < 2
            assert 1.7 < image_box["width"] / image_box["height"] < 1.9
            if width == 1440:
                assert image_box["height"] >= 150
                assert float(card.get_by_role("heading").evaluate("e=>getComputedStyle(e).fontSize").replace("px", "")) >= 20
        assert page.evaluate("document.documentElement.scrollWidth") <= width
    page.emulate_media(reduced_motion="reduce")
    cards.first.hover()
    expect(cards.first).to_have_css("translate", "none")
    browser.close()
    print("Four catalog cards: enlarged photos/type, hover/focus lift, reduced motion and four responsive sizes passed")
