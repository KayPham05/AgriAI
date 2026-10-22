"""Check compact catalog headers against localhost:3000 with API fixtures."""

import json
from playwright.sync_api import sync_playwright, expect

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    user = {'id': 'catalog-ui', 'fullName': 'Review', 'email': 'review@example.test', 'role': 'User', 'createdAt': '2026-10-21T00:00:00Z'}
    page.add_init_script('localStorage.setItem("leafai_auth_session", ' + json.dumps(json.dumps({'token': 'fixture', 'user': user})) + ')')
    page.route('**/api/**', lambda route: route.fulfill(status=200, json=user if '/auth/me' in route.request.url else {'items': [], 'totalCount': 0, 'pageNumber': 1, 'pageSize': 100} if '/predictions' in route.request.url else []))
    for route, label in [('plants', 'Tìm tên cây hoặc tên khoa học'), ('diseases', 'Tìm tên bệnh hoặc cây trồng')]:
        page.goto(f'http://localhost:3000/{route}', wait_until='domcontentloaded')
        search = page.get_by_role('searchbox', name=label)
        expect(search).to_be_visible()
        for width in (1440, 768, 375, 320):
            page.set_viewport_size({'width': width, 'height': 900})
            title = page.get_by_role('heading', level=1)
            assert title.bounding_box()['height'] <= 1
            assert page.locator('main header').count() == 0
            assert page.evaluate('document.documentElement.scrollWidth') <= width
        search.fill('no-matching-crop-xyz')
        expect(page.get_by_role('button', name='Đặt lại bộ lọc')).to_be_visible()
        page.get_by_role('button', name='Đặt lại bộ lọc').click()
        expect(search).to_have_value('')
    browser.close()
    print('Both catalog pages: compact headers, search and four responsive sizes passed')
