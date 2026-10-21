"""Admin reload, brand, farewell and retained login welcome with isolated auth fixtures."""
import json
import re
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

output = Path(__file__).resolve().parents[4] / '.cache' / 'admin-auth'
output.mkdir(parents=True, exist_ok=True)
session = {'token': 'admin-fixture', 'user': {'id': 'admin-fixture', 'fullName': 'System Admin', 'email': 'admin@example.test', 'role': 'Admin', 'createdAt': '2026-10-21T00:00:00Z'}}

with sync_playwright() as p:
    browser = p.chromium.launch()
    for width, height, reduced in ((1280, 900, False), (768, 900, False), (375, 812, True)):
        page = browser.new_page(viewport={'width': width, 'height': height}, reduced_motion='reduce' if reduced else 'no-preference')
        errors, pending = [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.route('**/api/auth/me', lambda route: pending.append(route))
        page.add_init_script('localStorage.setItem("leafai_auth_session", '+json.dumps(json.dumps(session))+')')
        page.goto('http://localhost:3000/admin', wait_until='domcontentloaded')
        loading = page.get_by_role('status', name='Đang tải AgriAI', exact=True)
        expect(loading).to_be_visible()
        expect(loading.locator('[data-reload-block]')).to_have_count(4)
        expect(loading.get_by_role('heading')).to_have_count(0)
        expect(loading.get_by_role('progressbar')).to_have_count(0)
        block = loading.locator('[data-reload-block]').first
        transforms = block.evaluate('''async el=>{const before=getComputedStyle(el).transform;await new Promise(r=>setTimeout(r,250));return [before,getComputedStyle(el).transform]}''')
        assert len(set(transforms)) == (1 if reduced else 2), transforms
        page.screenshot(path=str(output / f'reload-{width}.png'))
        def release_auth():
            deadline = time.monotonic() + 5
            while not pending and time.monotonic() < deadline:
                page.wait_for_timeout(50)
            assert pending, 'Session verification did not start after hydration'
            pending.pop().fulfill(status=200, json=session['user'])
        release_auth()
        expect(page.get_by_role('heading', name='Tổng quan vận hành', exact=True)).to_be_visible()
        page.wait_for_load_state('networkidle')
        page.reload(wait_until='domcontentloaded')
        expect(page.get_by_role('status', name='Đang tải AgriAI', exact=True)).to_be_visible()
        expect(page.get_by_role('heading', name='Xin chào, System Admin.', exact=True)).to_have_count(0)
        release_auth()
        expect(page.get_by_role('heading', name='Tổng quan vận hành', exact=True)).to_be_visible()
        page.wait_for_load_state('networkidle')
        if width >= 1024:
            brand = page.get_by_role('link', name='AgriAI, về trang tổng quan')
            expect(brand.locator('img')).to_have_attribute('src', re.compile('agriai-leaf-mark'))
            assert brand.locator('img').evaluate('el=>el.complete && el.naturalWidth>0')
            page.get_by_role('button', name='Người dùng', exact=True).click()
            expect(page.get_by_role('heading', name='Người dùng', exact=True)).to_be_visible()
            expect(brand).to_have_attribute('href', '/admin')
            page.evaluate('''() => {
                window.logoLoadingSeen = false;
                window.logoObserver = new MutationObserver(() => {
                    if (document.querySelector('[role="status"][aria-label="Đang kết nối AgriAI"], [role="status"][aria-label="Đang tải AgriAI"]')) window.logoLoadingSeen = true;
                });
                window.logoObserver.observe(document.body, {childList:true, subtree:true});
            }''')
            brand.click()
            expect(page.get_by_role('heading', name='Tổng quan vận hành', exact=True)).to_be_visible()
            page.wait_for_load_state('networkidle')
            assert page.url == 'http://localhost:3000/admin'
            assert not pending, 'Logo restarted authentication'
            assert not page.evaluate('window.logoLoadingSeen'), 'Logo replayed loading or login welcome'
            page.evaluate('window.logoObserver.disconnect()')
        else:
            page.get_by_role('button', name='Mở menu quản trị', exact=True).click()
        start = time.monotonic()
        page.get_by_role('button', name='Đăng xuất', exact=True).last.click()
        farewell = page.get_by_role('status', name='Đã đăng xuất AgriAI', exact=True)
        expect(farewell.get_by_role('heading', name='Tạm biệt, System Admin.', exact=True)).to_be_visible()
        expect(farewell.get_by_text('HẸN GẶP LẠI', exact=True)).to_be_visible()
        expect(farewell.get_by_role('progressbar')).to_have_count(0)
        expect(farewell.locator('[data-admin-ripple]')).to_have_count(2)
        expect(farewell.get_by_role('img', name='AgriAI', exact=True)).to_have_js_property('complete', True)
        assert farewell.get_by_role('img', name='AgriAI', exact=True).evaluate('el=>el.naturalWidth>0')
        assert page.evaluate('localStorage.getItem("leafai_auth_session")') is None
        assert page.evaluate('sessionStorage.getItem("leafai_auth_session")') is None
        assert page.evaluate('document.documentElement.scrollWidth') <= width
        assert page.evaluate('document.documentElement.scrollHeight') <= height
        page.screenshot(path=str(output / f'farewell-{width}.png'))
        remaining = 3.6 - (time.monotonic() - start)
        if remaining > 0:
            page.wait_for_timeout(remaining * 1000)
        assert page.url == 'http://localhost:3000/admin'
        page.wait_for_url('http://localhost:3000/', timeout=8000)
        assert time.monotonic() - start >= 3.9
        assert not errors, errors
        page.close()
    browser.close()
print('Admin reload/brand/farewell passed at 1280, 768 and 375px, including reduced motion, mobile logout, immediate session removal and four-second redirect.')
