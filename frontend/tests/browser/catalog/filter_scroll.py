"""Check that crop filters stay anchored and scroll internally on localhost."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

output = Path(__file__).resolve().parents[4] / '.cache' / 'filter-scroll'
output.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(reduced_motion='reduce')
    user = {'id': 'filter-review', 'fullName': 'Review', 'email': 'review@example.test', 'role': 'User', 'createdAt': '2026-10-21T00:00:00Z'}
    page.add_init_script('localStorage.setItem("leafai_auth_session", ' + json.dumps(json.dumps({'token': 'fixture', 'user': user})) + ')')
    page.route('**/api/**', lambda route: route.fulfill(status=200, json=user if '/auth/me' in route.request.url else {'items': [], 'totalCount': 0, 'pageNumber': 1, 'pageSize': 100} if '/predictions' in route.request.url else []))
    page.goto('http://localhost:3000/diseases', wait_until='networkidle')
    for width in (1280, 768, 375, 320):
        page.set_viewport_size({'width': width, 'height': 1000})
        trigger = page.locator('#disease-plant')
        trigger.click()
        menu = page.get_by_role('listbox')
        expect(menu).to_be_visible()
        frame = menu.bounding_box()
        anchor = trigger.bounding_box()
        assert frame['y'] >= anchor['y'] + anchor['height'] - 1, (frame, anchor)
        assert frame['height'] <= 257, frame
        viewport = menu.locator('[data-radix-select-viewport]')
        # Start at the top, then wheel; page position must stay fixed.
        viewport.evaluate('(el) => el.scrollTop = 0')
        page_y = page.evaluate('window.scrollY')
        viewport.hover()
        page.mouse.wheel(0, 220)
        page.wait_for_function("document.querySelector('[data-radix-select-viewport]').scrollTop > 0")
        assert page.evaluate('window.scrollY') == page_y
        page.screenshot(path=str(output / f'crop-filter-{width}.png'))
        page.keyboard.press('End')
        expect(menu.get_by_role('option').last).to_be_focused()
        page.keyboard.press('Enter')
        expect(menu).to_have_count(0)
        selected = trigger.inner_text()
        assert selected.strip() != 'Tất cả'
        trigger.click()
        frame = menu.bounding_box()
        anchor = trigger.bounding_box()
        assert frame['y'] >= anchor['y'] + anchor['height'] - 1
        assert frame['height'] <= 257
        page.keyboard.press('Escape')
        expect(trigger).to_have_text(selected)
    browser.close()
    print('Crop filter: anchored menu, bounded height, wheel scroll and selection/reopen at four widths passed.')
