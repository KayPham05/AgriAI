import json
from playwright.sync_api import sync_playwright, expect

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 1100})
    user = {"id": "tips", "fullName": "Review", "email": "review@example.test", "role": "User", "createdAt": "2026-10-21T00:00:00Z"}
    page.add_init_script('localStorage.setItem("leafai_auth_session", ' + json.dumps(json.dumps({"token": "fixture", "user": user})) + ')')
    page.route('**/api/**', lambda route: route.fulfill(status=200,json=user if '/auth/me' in route.request.url else {"items": [], "totalCount": 0, "pageNumber": 1, "pageSize": 100} if '/predictions' in route.request.url else []))
    page.goto('http://localhost:3000/home', wait_until='domcontentloaded')
    cards = page.locator('ol > li')
    expect(cards).to_have_count(3)
    for card in cards.all():
        card.scroll_into_view_if_needed()
        page.mouse.move(0, 0)
        expect(card).to_have_css('transform', 'none')
        card.hover()
        expect(card).to_have_css('translate', '0px -4px')
        assert card.evaluate('(e)=>getComputedStyle(e).boxShadow') != 'none'
        page.mouse.move(0, 0)
        expect(card).to_have_css('translate', 'none')
    card = cards.first
    card.hover()
    page.mouse.down()
    expect(card).to_have_css('translate', '0px -4px')
    page.mouse.up()
    page.emulate_media(reduced_motion='reduce')
    card.hover()
    expect(card).to_have_css('translate', 'none')
    page.mouse.down()
    expect(card).to_have_css('translate', 'none')
    page.mouse.up()
    browser.close()
    print('Three card hover/lift/shadow/return, press and reduced-motion passed')
