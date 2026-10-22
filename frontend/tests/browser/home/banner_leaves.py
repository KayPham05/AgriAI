"""Validate home banner foliage sizing, motion and accessibility against localhost."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

output = Path(__file__).resolve().parents[4] / '.cache' / 'home-banner-leaves'
output.mkdir(parents=True, exist_ok=True)

def overlaps(a, b):
    return a['x'] < b['x'] + b['width'] and a['x'] + a['width'] > b['x'] and a['y'] < b['y'] + b['height'] and a['y'] + a['height'] > b['y']

def sample(target):
    return target.evaluate('''async el => {
      const before = getComputedStyle(el).transform;
      await new Promise(resolve => setTimeout(resolve, 300));
      return [before, getComputedStyle(el).transform];
    }''')

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(reduced_motion='reduce')
    session = {'token': 'fixture', 'user': {'id': 'banner-review', 'role': 'User'}}
    page.add_init_script('localStorage.setItem("leafai_auth_session", ' + json.dumps(json.dumps(session)) + ')')
    user = {'id': 'banner-review', 'fullName': 'Review', 'email': 'review@example.test', 'role': 'User', 'createdAt': '2026-10-21T00:00:00Z'}
    page.route('**/api/**', lambda route: route.fulfill(status=200, json=user if '/auth/me' in route.request.url else ({'items': [], 'totalCount': 0, 'pageNumber': 1, 'pageSize': 100} if '/predictions' in route.request.url else [])))
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto('http://localhost:3000/home', wait_until='networkidle')
    hero = page.get_by_role('region', name='Khám phá AgriAI', exact=True)
    leaves = hero.locator('[data-home-banner-scene="active"] [data-home-banner-leaves]')
    expect(leaves).to_have_attribute('aria-hidden', 'true')
    assert leaves.evaluate('el => getComputedStyle(el).pointerEvents') == 'none'
    motion = leaves.locator('[data-home-leaf-motion]').first
    for width, height in ((1920, 1000), (1280, 900), (768, 900), (375, 812), (320, 568)):
        page.set_viewport_size({'width': width, 'height': height})
        page.evaluate('window.scrollTo(0, 0)')
        image = leaves.locator('img').first
        expect(image).to_have_js_property('complete', True)
        assert image.evaluate('el => el.naturalWidth') > 0
        box = motion.bounding_box()
        assert box['width'] <= width * .46 and box['width'] <= 448
        assert not overlaps(box, hero.get_by_role('heading', level=1).bounding_box())
        assert not overlaps(box, hero.locator('figcaption p').bounding_box())
        for button in hero.get_by_role('button').all():
            assert not overlaps(box, button.bounding_box())
            assert button.evaluate('el => {const r=el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}')
        assert page.evaluate('document.documentElement.scrollWidth') <= width
        assert len(set(sample(motion))) == 1
        page.screenshot(path=str(output / f'banner-{width}.png'))
    page.set_viewport_size({'width': 1280, 'height': 900})
    page.emulate_media(reduced_motion='no-preference')
    page.wait_for_function("document.querySelector('[data-home-banner-scene=active] [data-home-leaf-motion]').style.transform !== ''")
    assert len(set(sample(motion))) == 2
    page.evaluate("Object.defineProperty(document, 'hidden', {configurable:true, value:true}); document.dispatchEvent(new Event('visibilitychange'))")
    assert len(set(sample(motion))) == 1
    page.evaluate("Object.defineProperty(document, 'hidden', {configurable:true, value:false}); document.dispatchEvent(new Event('visibilitychange'))")
    assert len(set(sample(motion))) == 2
    expect(leaves).to_have_attribute('data-home-banner-leaves', 'rice', timeout=12000)
    expect(leaves.locator('img')).to_have_count(3)
    page.screenshot(path=str(output / 'rice.png'))
    page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
    page.wait_for_timeout(100)
    assert len(set(sample(motion))) == 1
    assert not errors, errors
    browser.close()
    print('Banner leaves: five sizes, clear text/actions, real sway, hidden/offscreen pause, reduced motion and crop sync passed.')
