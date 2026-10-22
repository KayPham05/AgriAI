"""Automatic admin search across all three lists, using isolated authentication."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

output = Path(__file__).resolve().parents[4] / '.cache' / 'admin-search'
output.mkdir(parents=True, exist_ok=True)
session = {'token': 'admin-fixture', 'user': {'id': 'admin-fixture', 'fullName': 'System Admin', 'email': 'admin@example.test', 'role': 'Admin', 'createdAt': '2026-10-21T00:00:00Z'}}

with sync_playwright() as p:
    browser = p.chromium.launch()
    for width, height in ((1280, 900), (768, 900), (375, 812)):
        page = browser.new_page(viewport={'width': width, 'height': height})
        errors, requests = [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        def api(route):
            requests.append(route.request.url)
            route.fulfill(status=200, json=session['user'])
        page.route('**/api/**', api)
        page.add_init_script('localStorage.setItem("leafai_auth_session", '+json.dumps(json.dumps(session))+')')
        page.goto('http://localhost:3000/admin', wait_until='networkidle')
        expect(page.get_by_role('heading', name='Tổng quan vận hành', exact=True)).to_be_visible()
        for label, region in (('Người dùng', 'Danh sách người dùng'), ('Phiên đăng nhập', 'Danh sách phiên đăng nhập'), ('Ảnh đã tải lên', 'Danh sách ảnh đã tải lên')):
            if width < 1024:
                page.get_by_role('button', name='Mở menu quản trị', exact=True).click()
                page.get_by_role('dialog').get_by_role('button', name=label, exact=True).click()
            else:
                page.get_by_role('button', name=label, exact=True).click()
            listing = page.get_by_role('region', name=region, exact=True)
            expect(listing).to_be_visible()
            listing.get_by_role('button', name='Trang sau', exact=True).click()
            search = listing.get_by_role('textbox')
            search.fill('  tran thi binh  ')
            expect(listing.get_by_role('listitem')).to_have_count(1)
            expect(listing.get_by_role('heading', name='Trần Thị Bình', exact=True)).to_be_visible()
            expect(listing.get_by_text('Trang 1 / 1', exact=True)).to_be_visible()
            search.fill('missing@example.test')
            expect(listing.get_by_role('status')).to_have_text('Không tìm thấy kết quả phù hợp.')
            search.fill('AN@EXAMPLE.TEST')
            expect(listing.get_by_role('heading', name='Nguyễn Văn An', exact=True)).to_be_visible()
            search.fill('')
            expect(listing.get_by_role('listitem')).to_have_count(2 if width >= 768 else 1)
            expect(listing.get_by_text('Trang 1 / 6' if label == 'Người dùng' and width >= 768 else 'Trang 1 / 12' if label == 'Người dùng' else 'Trang 1 / 2' if width >= 768 else 'Trang 1 / 3', exact=True)).to_be_visible()
            assert page.evaluate('document.documentElement.scrollWidth') <= width
            assert page.evaluate('document.documentElement.scrollHeight') <= height
            page.screenshot(path=str(output / f'{width}-{search.get_attribute("id")}.png'))
        assert len(requests) == 1 and requests[0].endswith('/api/auth/me'), requests
        assert not errors, errors
        page.close()
    browser.close()
print('Automatic search passed on users, sessions and images at 1280/768/375px: accent/case matching, page reset, empty results, clearing and no new API requests.')
