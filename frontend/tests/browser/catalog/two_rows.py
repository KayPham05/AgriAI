"""Verify two-row catalog pagination against localhost using API fixtures."""
import json
from playwright.sync_api import sync_playwright, expect

plants = [{'id': name, 'name': name, 'vietnameseName': label, 'scientificName': None,
           'description': None, 'isActive': True, 'createdAt': '2026-10-21T00:00:00Z'}
          for name, label in [('CaPhe', 'Cà phê'), ('CaChua', 'Cà chua'), ('Lua', 'Lúa nước'),
                              ('Ngo', 'Bắp (Ngô)'), ('Ot', 'Ớt'), ('Cam', 'Cam'),
                              ('Xoai', 'Xoài'), ('Che', 'Chè (Trà)'), ('Nho', 'Nho'), ('SauRieng', 'Sầu riêng')]]

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(reduced_motion='reduce')
    user = {'id': 'pagination-review', 'fullName': 'Review', 'email': 'review@example.test', 'role': 'User', 'createdAt': '2026-10-21T00:00:00Z'}
    page.add_init_script('localStorage.setItem("leafai_auth_session", ' + json.dumps(json.dumps({'token': 'fixture', 'user': user})) + ')')
    page.route('**/api/**', lambda route: route.fulfill(status=200, json=user if '/auth/me' in route.request.url else plants if '/plants' in route.request.url else {'items': [], 'totalCount': 0, 'pageNumber': 1, 'pageSize': 100} if '/predictions' in route.request.url else []))
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    for route in ('plants', 'diseases'):
        for width, count in ((1280, 6), (1024, 6), (768, 4), (767, 2), (375, 2), (320, 2)):
            page.set_viewport_size({'width': width, 'height': 1000})
            page.goto(f'http://localhost:3000/{route}', wait_until='networkidle')
            cards = page.locator('main article')
            expect(cards).to_have_count(count)
            tops = cards.evaluate_all('(items) => items.map(el => Math.round(el.getBoundingClientRect().top))')
            assert len(set(tops)) == 2, (route, width, tops)
            first = cards.locator('h2').all_text_contents()
            page.get_by_role('button', name='Trang sau', exact=True).click()
            expect(cards).to_have_count(count)
            expect(page.get_by_role('button', name='Trang 2', exact=True)).to_have_attribute('aria-current', 'page')
            second = cards.locator('h2').all_text_contents()
            assert not set(first).intersection(second), (first, second)
            tops = cards.evaluate_all('(items) => items.map(el => Math.round(el.getBoundingClientRect().top))')
            assert len(set(tops)) == 2, (route, width, tops)
            assert page.evaluate('document.documentElement.scrollWidth') <= width
            page.get_by_role('button', name='Trang trước', exact=True).click()
            assert cards.locator('h2').all_text_contents() == first
    assert not errors, errors
    browser.close()
    print('Both catalogs: exactly two rows at six widths, next/previous without duplicate items and no page errors passed.')
