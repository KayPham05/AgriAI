"""Check every admin page and overview panel inside the viewport with auth fixtures."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

output = Path(__file__).resolve().parents[4] / '.cache' / 'admin-polish-viewport'
output.mkdir(parents=True, exist_ok=True)
session = {'token': 'viewport-fixture', 'user': {'id': 'admin-fixture', 'fullName': 'System Admin', 'email': 'admin@example.test', 'role': 'Admin', 'createdAt': '2026-10-21T00:00:00Z'}}
results = []
with sync_playwright() as p:
    browser = p.chromium.launch()
    for width, height in ((1920,1080), (1440,900), (1280,900), (1440,899), (1366,768), (1280,720), (1024,768), (768,900), (375,812), (844,390)):
        page = browser.new_page(viewport={'width': width, 'height': height}, reduced_motion='reduce')
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.route('**/api/auth/me', lambda route: route.fulfill(status=200, json=session['user']))
        page.add_init_script('localStorage.setItem("leafai_auth_session", '+json.dumps(json.dumps(session))+')')
        page.goto('http://localhost:3000/admin', wait_until='networkidle')
        expect(page.get_by_role('heading', name='Tổng quan vận hành', exact=True)).to_be_visible()
        if width == 1366:
            page.locator('button[aria-controls="admin-desktop-navigation"]').click()
        def measure(label, selector):
            size = page.evaluate('({w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight,y:window.scrollY})')
            assert size['w'] <= width and size['h'] <= height and size['y'] == 0, (label,size)
            content = page.locator(selector)
            overflow = content.evaluate('(el)=>Math.max(0,el.scrollHeight-el.clientHeight)')
            if not label.startswith('overview'):
                nav = page.get_by_role('navigation', name='Phân trang dữ liệu')
                box = nav.bounding_box()
                assert box and box['y'] >= 0 and box['y'] + box['height'] <= height, (label,box)
            results.append({'viewport':[width,height], 'page':label, 'innerOverflow':overflow})
            (output / 'results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
            if height >= 600 and (width >= 1024 or not label.startswith('overview')):
                assert overflow <= 1, (label,width,height,overflow)
        for name in ('Người dùng', 'Ảnh đã tải lên', 'Phiên đăng nhập', 'Ảnh gần đây', 'Cần chú ý'):
            expect(page.locator('.admin-overview').get_by_role('region', name=name, exact=True)).to_be_attached()
        expect(page.get_by_role('navigation', name='Các mục tổng quan')).to_have_count(0)
        for name in ('Các mục quản trị', 'Tài khoản quản trị', 'Phiên gần đây'):
            expect(page.get_by_role('region', name=name, exact=True)).to_have_count(0)
        measure('overview', '.admin-overview')
        summary = page.locator('summary', has_text='Lịch tháng')
        calendar_details = summary.locator('..')
        expect(calendar_details).to_have_js_property('open', width >= 1024 and height >= 900)
        preview = page.locator('.admin-recent-image-preview').first.bounding_box()
        if width >= 1024 and height >= 900: assert preview['height'] > 64, preview
        page.screenshot(path=str(output / f'{width}-{height}-overview.png'), animations='disabled')
        for label in ('1 mới hôm nay', '1 tải lên hôm nay', '1 lượt hôm nay', '1 còn hiệu lực'):
            expect(page.locator('.admin-overview').get_by_text(label, exact=True)).to_be_attached()
        expect(page.get_by_role('button', name='7 ngày', exact=True)).to_have_count(0)
        expect(page.get_by_role('button', name='30 ngày', exact=True)).to_have_count(0)
        for chart in page.locator('.admin-chart-bars').all(): assert chart.locator('li').count() == 7
        page.get_by_role('button', name='Làm mới số liệu minh họa', exact=True).click()
        expect(page.get_by_role('status', name='Cập nhật số liệu')).to_have_text('Đã cập nhật từ dữ liệu minh họa hiện có.')
        if not calendar_details.evaluate('el=>el.open'): summary.click()
        calendar = page.get_by_role('region', name='Lịch tháng', exact=True)
        calendar.scroll_into_view_if_needed()
        expect(calendar.get_by_role('button', name='Tháng sau', exact=True)).to_be_in_viewport()
        summary.click()
        page.get_by_role('button', name='Làm mới số liệu minh họa', exact=True).click()
        expect(calendar_details).to_have_js_property('open', False)
        page.get_by_role('button', name='Xem ảnh', exact=True).click()
        expect(page.get_by_role('region', name='Danh sách ảnh đã tải lên', exact=True)).to_be_visible()
        for name, region, total in (('Người dùng','Danh sách người dùng',12), ('Ảnh đã tải lên','Danh sách ảnh đã tải lên',3), ('Phiên đăng nhập','Danh sách phiên đăng nhập',3)):
            if width >= 1024:
                page.get_by_role('complementary').get_by_role('button', name=name, exact=True).click()
            else:
                page.get_by_role('button', name='Mở menu quản trị', exact=True).click()
                page.get_by_role('dialog').get_by_role('button', name=name, exact=True).click()
            records = page.get_by_role('region', name=region, exact=True)
            seen = []
            index = 0
            while True:
                seen.extend(records.locator('.admin-records > li h2').all_text_contents())
                measure(f'{name}-{index}', '.admin-records')
                if index == 0: page.screenshot(path=str(output / f'{width}-{height}-{region}.png'))
                next_button = records.get_by_role('button', name='Trang sau', exact=True)
                if next_button.is_disabled(): break
                next_button.click()
                index += 1
                assert index < 20
            assert len(seen) == total and len(set(seen)) == total, (name,seen)
        assert not errors, errors
        page.close()
    browser.close()
(output / 'results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'checks':len(results),'overflow': [row for row in results if row['innerOverflow'] > 1]}, ensure_ascii=True))
