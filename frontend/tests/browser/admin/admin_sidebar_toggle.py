"""Verify desktop sidebar pinning and the existing mobile menu with auth fixtures."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

output = Path(__file__).resolve().parents[4] / '.cache' / 'admin-sidebar'
output.mkdir(parents=True, exist_ok=True)
session = {'token': 'sidebar-fixture', 'user': {'id': 'sidebar-fixture', 'fullName': 'System Admin', 'email': 'admin@example.test', 'role': 'Admin', 'createdAt': '2026-10-21T00:00:00Z'}}
with sync_playwright() as p:
    browser = p.chromium.launch()
    for width, reduced in ((1280, False), (1280, True), (768, False), (375, False)):
        page = browser.new_page(viewport={'width': width, 'height': 900}, reduced_motion='reduce' if reduced else 'no-preference')
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.route('**/api/auth/me', lambda route: route.fulfill(status=200, json=session['user']))
        page.add_init_script('localStorage.setItem("leafai_auth_session", '+json.dumps(json.dumps(session))+')')
        page.goto('http://localhost:3000/admin', wait_until='networkidle')
        expect(page.get_by_role('heading', name='Tổng quan vận hành', exact=True)).to_be_visible()
        toggle = page.locator('button[aria-controls="admin-desktop-navigation"]')
        if width >= 1024:
            expect(toggle).to_be_visible()
            rail = page.get_by_role('complementary', name='Thanh điều hướng quản trị')
            collapsed = rail.bounding_box()['width']
            rail.hover()
            expect(toggle).to_have_attribute('aria-expanded', 'false')
            rail.get_by_role('button', name='Người dùng', exact=True).focus()
            expect(toggle).to_have_attribute('aria-expanded', 'false')
            assert rail.bounding_box()['width'] == collapsed
            toggle.click()
            expect(toggle).to_have_attribute('aria-expanded', 'true')
            rail.hover()
            toggle.hover()
            expect(toggle).to_have_attribute('aria-expanded', 'true')
            assert rail.bounding_box()['width'] > collapsed
            page.screenshot(path=str(output / f'expanded-{width}-{reduced}.png'))
            toggle.press('Enter')
            expect(toggle).to_have_attribute('aria-expanded', 'false')
            assert rail.bounding_box()['width'] == collapsed
            toggle.press('Space')
            expect(toggle).to_have_attribute('aria-expanded', 'true')
            rail.get_by_role('button', name='Người dùng', exact=True).click()
        else:
            expect(toggle).not_to_be_visible()
            page.get_by_role('button', name='Mở menu quản trị', exact=True).click()
            page.get_by_role('dialog').get_by_role('button', name='Người dùng', exact=True).click()
            expect(page.get_by_role('dialog')).not_to_be_visible()
        expect(page.get_by_role('heading', name='Người dùng', exact=True)).to_be_visible()
        assert page.evaluate('document.documentElement.scrollWidth') <= width
        assert not errors, errors
        page.close()
    browser.close()
print('Sidebar: no hover/focus expansion, button toggle, Enter/Space, reduced motion, mobile Sheet and navigation passed at 1280/768/375px.')
