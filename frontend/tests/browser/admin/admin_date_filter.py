"""Overview calendar filters with fixed Vietnam dates and isolated admin authentication."""
import json
from datetime import datetime, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

output = Path(__file__).resolve().parents[4] / '.cache' / 'admin-date'
output.mkdir(parents=True, exist_ok=True)
session = {'token': 'admin-fixture', 'user': {'id': 'admin-fixture', 'fullName': 'System Admin', 'email': 'admin@example.test', 'role': 'Admin', 'createdAt': '2026-10-21T00:00:00Z'}}

with sync_playwright() as p:
    browser = p.chromium.launch()
    for width, height in ((1920,1080), (1280,900), (1366,768), (768,900), (375,812), (844,390)):
        page = browser.new_page(viewport={'width': width, 'height': height})
        page.clock.install(time=datetime(2026,10,21,5,tzinfo=timezone.utc))
        errors, requests = [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        def api(route):
            requests.append(route.request.url)
            route.fulfill(status=200, json=session['user'])
        page.route('**/api/**', api)
        page.add_init_script('localStorage.setItem("leafai_auth_session", '+json.dumps(json.dumps(session))+')')
        page.goto('http://localhost:3000/admin', wait_until='networkidle')
        expect(page.get_by_role('heading', name='Tổng quan vận hành', exact=True)).to_be_visible()
        if width == 1280:
            page.get_by_role('button', name='Mở rộng thanh điều hướng', exact=True).click()
        summary = page.locator('summary').filter(has_text='Lịch tháng')
        if not summary.evaluate('el=>el.parentElement.open'):
            summary.click()
        expect(page.get_by_role('button', name='Ngày 22/10/2026', exact=True)).to_be_disabled()
        for mode, choice, caption, bars in (
            ('day', 'Ngày 20/10/2026', '20/10/2026', 1),
            ('month', 'Tháng 10/2026', '10/2026', 31),
            ('year', 'Năm 2026', '2026', 12),
        ):
            if mode != 'day':
                page.get_by_role('button', name='Chọn tháng' if mode == 'month' else 'Chọn năm', exact=True).click()
            page.get_by_role('button', name=choice, exact=True).click()
            expect(page.get_by_role('status', name='Bộ lọc thời gian', exact=True)).to_contain_text(caption)
            if mode == 'day':
                expect(page.get_by_role('button', name=choice, exact=True)).to_have_attribute('aria-pressed', 'true')
            for chart in page.locator('.admin-chart-bars').all():
                expect(chart.locator('li')).to_have_count(bars)
                alignment = chart.evaluate('''el=>Array.from(el.querySelectorAll('li')).flatMap(column=>{
                    const label=column.querySelector('[data-chart-label]');
                    if(!label) return [];
                    const text=label.getBoundingClientRect(), bar=column.querySelector('.admin-chart-bar').getBoundingClientRect();
                    return [{delta:Math.abs(text.x+text.width/2-bar.x-bar.width/2),width:bar.width}];
                })''')
                assert all(item['delta'] < 1 and item['width'] <= 11 for item in alignment), alignment
                ticks = chart.locator('[data-chart-label]').evaluate_all('els=>els.map(el=>{const box=el.getBoundingClientRect();return {left:box.left,right:box.right}})')
                assert all(ticks[index]['right'] <= ticks[index+1]['left'] for index in range(len(ticks)-1)), ticks
            recent = page.get_by_role('region', name='Ảnh gần đây', exact=True)
            expect(recent.get_by_text('Trần Thị Bình', exact=True)).to_be_attached()
            expect(recent.get_by_text('Nguyễn Văn An', exact=True)).to_have_count(0 if mode == 'day' else 1)
            assert page.evaluate('document.documentElement.scrollWidth') <= width
            assert page.evaluate('document.documentElement.scrollHeight') <= height
            page.wait_for_timeout(250)
            page.screenshot(path=str(output / f'{width}-{bars}.png'))
            if width >= 1024 and height >= 900:
                assert page.locator('.admin-overview').evaluate('el=>el.scrollHeight<=el.clientHeight+1'), page.locator('.admin-overview').evaluate('el=>({viewport:[innerWidth,innerHeight],height:el.clientHeight,scroll:el.scrollHeight,calendar:document.querySelector(".admin-calendar")?.getBoundingClientRect().height})')
        page.get_by_role('button', name='Chọn năm', exact=True).click()
        expect(page.get_by_role('button', name='Năm 2027', exact=True)).to_be_disabled()
        page.get_by_role('button', name='Năm 2025', exact=True).click()
        expect(page.get_by_role('region', name='Ảnh gần đây', exact=True).get_by_text('Không có ảnh trong thời gian đã chọn.', exact=True)).to_be_attached()
        page.get_by_role('button', name='Bỏ lọc thời gian', exact=True).click()
        for chart in page.locator('.admin-chart-bars').all():
            expect(chart.locator('li')).to_have_count(7)
        expect(page.get_by_role('status', name='Bộ lọc thời gian', exact=True)).to_contain_text('Toàn bộ')
        assert len(requests) == 1 and requests[0].endswith('/api/auth/me'), requests
        assert not errors, errors
        page.close()
    browser.close()
print('Day/month/year filters passed at six viewports: selected/disabled states, charts, photos, empty periods, reset, no extra APIs and contained document.')
