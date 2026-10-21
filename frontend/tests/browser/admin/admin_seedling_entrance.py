"""Local admin welcome regression using isolated authentication fixtures."""
import json
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

output = Path(__file__).resolve().parents[4] / '.cache' / 'admin-seedling'
output.mkdir(parents=True, exist_ok=True)
session = {'token': 'admin-fixture', 'user': {'id': 'admin-fixture', 'fullName': 'System Admin', 'email': 'admin@example.test', 'role': 'Admin', 'createdAt': '2026-10-21T00:00:00Z'}}
with sync_playwright() as p:
    browser = p.chromium.launch()
    for width, height, reduced, fresh in ((1280,900,False,True), (768,900,False,False), (375,812,False,False), (844,390,False,False), (320,568,True,False)):
        page = browser.new_page(viewport={'width':width,'height':height}, reduced_motion='reduce' if reduced else 'no-preference')
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        start = [None]
        def api(route):
            path = route.request.url
            if '/auth/login' in path:
                start[0] = time.monotonic()
                route.fulfill(status=200, json=session)
            elif '/auth/me' in path:
                if start[0] is None: start[0] = time.monotonic()
                route.fulfill(status=200, json=session['user'])
            else: route.fulfill(status=200, json=[])
        page.route('**/api/**', api)
        if not fresh:
            page.add_init_script('localStorage.setItem("leafai_auth_session", '+json.dumps(json.dumps(session))+')')
        page.goto('http://localhost:3000', wait_until='domcontentloaded')
        if fresh:
            page.get_by_role('button', name='Đăng nhập', exact=True).click()
            dialog = page.get_by_role('dialog')
            dialog.get_by_label('Email', exact=True).fill(session['user']['email'])
            dialog.get_by_label('Mật khẩu', exact=True).fill('fixture-password')
            code = dialog.get_by_role('group', name='Mã CAPTCHA:', exact=False).get_attribute('aria-label').replace('Mã CAPTCHA: ', '')
            dialog.get_by_label('Mã xác nhận', exact=True).fill(code)
            dialog.get_by_role('button', name='Đăng nhập', exact=True).click()
        if not fresh:
            page.wait_for_url('http://localhost:3000/admin', timeout=10000)
            assert page.locator('[data-admin-ripple]').count() == 0
            assert page.evaluate('document.documentElement.scrollWidth') <= width
            assert not errors, errors
            page.close()
            continue
        welcome = page.get_by_role('status', name='Đang kết nối AgriAI', exact=True)
        expect(welcome.get_by_role('heading', name='Xin chào, System Admin.', exact=True)).to_be_visible()
        expect(welcome.get_by_role('progressbar', name='Đang tải', exact=True)).to_be_visible()
        logo = welcome.get_by_role('img', name='AgriAI', exact=True)
        expect(logo).to_have_js_property('complete', True)
        assert logo.evaluate('el=>el.naturalWidth') > 0
        assert welcome.locator('[data-admin-ripple]').count() == 2
        assert page.evaluate('document.documentElement.scrollWidth') <= width
        assert page.evaluate('document.documentElement.scrollHeight') <= height
        ring = welcome.locator('[data-admin-ripple]').first
        frames = ring.evaluate('''async el=>{const before=getComputedStyle(el).transform;await new Promise(r=>setTimeout(r,200));return [before,getComputedStyle(el).transform]}''')
        assert len(set(frames)) == (1 if reduced else 2), frames
        if not reduced:
            page.evaluate("Object.defineProperty(document, 'hidden', {configurable:true, value:true}); document.dispatchEvent(new Event('visibilitychange'))")
            expect(welcome).to_have_attribute('data-paused','true')
            assert ring.evaluate('el=>getComputedStyle(el).animationPlayState') == 'paused'
            page.evaluate("Object.defineProperty(document, 'hidden', {configurable:true, value:false}); document.dispatchEvent(new Event('visibilitychange'))")
        page.screenshot(path=str(output / f'welcome-{width}.png'))
        remaining = 3.6 - (time.monotonic()-start[0])
        if remaining > 0: page.wait_for_timeout(remaining*1000)
        assert page.url == 'http://localhost:3000/', page.url
        page.wait_for_url('http://localhost:3000/admin', timeout=8000)
        elapsed = time.monotonic()-start[0]
        assert elapsed >= 3.9, elapsed
        expect(page.get_by_role('heading', name='Tổng quan vận hành', exact=True)).to_be_visible()
        assert not errors, errors
        page.close()
    browser.close()
    print('Admin entrance: fresh login four-second gate and restored sessions without repeated welcome, five viewports, sprout/ripples, hidden pause, reduced motion and dashboard route passed.')
