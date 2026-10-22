"""Verify real 404 responses, responsive recovery UI and navigation."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

output = Path(__file__).resolve().parents[3] / '.cache' / 'not-found'
output.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.route('**/api/**', lambda route: route.fulfill(status=200, json=[]))
    for width, height in ((1280, 900), (768, 900), (375, 812), (320, 568), (844, 390)):
        page.set_viewport_size({'width': width, 'height': height})
        response = page.goto('http://localhost:3000/duong-dan-khong-ton-tai', wait_until='networkidle')
        assert response.status == 404, response.status
        expect(page.get_by_role('heading', level=1, name='Không tìm thấy trang', exact=True)).to_be_visible()
        expect(page.get_by_role('link', name='Về trang chủ', exact=True)).to_have_attribute('href', '/')
        expect(page.get_by_role('button', name='Quay lại', exact=True)).to_be_visible()
        assert page.locator('meta[name=robots]').get_attribute('content') == 'noindex'
        assert page.evaluate('document.documentElement.scrollWidth') <= width
        for item in page.get_by_role('main').locator('a,button').all():
            assert item.bounding_box()['height'] >= 44
        page.screenshot(path=str(output / f'404-{width}.png'), full_page=True)
    for route in ('/abc/xyz', '/home/khong-co-trang-nay'):
        assert page.goto('http://localhost:3000' + route, wait_until='networkidle').status == 404
        expect(page.get_by_role('heading', level=1, name='Không tìm thấy trang', exact=True)).to_be_visible()
    page.get_by_role('link', name='Về trang chủ', exact=True).click()
    page.wait_for_url('http://localhost:3000/')
    page.goto('http://localhost:3000/khong-ton-tai', wait_until='networkidle')
    page.get_by_role('button', name='Quay lại', exact=True).click()
    page.wait_for_url('http://localhost:3000/')
    assert not errors, errors
    browser.close()
    print('404: HTTP404/noindex, three invalid routes, five viewport sizes, touch targets and home/back navigation passed.')
