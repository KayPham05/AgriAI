"""Check decorative hero leaves without interfering with map or auth actions."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

output = Path(__file__).resolve().parents[4] / '.cache' / 'intro-hero-background'
output.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1280, 'height': 1000}, reduced_motion='no-preference')
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.route('**/api/**', lambda route: route.fulfill(status=200, json=[]))
    page.goto('http://localhost:3000', wait_until='networkidle')
    hero = page.get_by_role('region', name='Giới thiệu AgriAI', exact=True)
    backdrop = hero.locator('[data-intro-leaves="hero"]')
    expect(backdrop).to_have_count(1)
    expect(backdrop).to_have_attribute('aria-hidden', 'true')
    assert backdrop.evaluate('el => getComputedStyle(el).pointerEvents') == 'none'
    assert backdrop.locator('button, a, [tabindex]').count() == 0
    motion = backdrop.locator('[data-intro-leaf-motion]').first
    page.wait_for_function("document.querySelector('[data-intro-leaves=hero] [data-intro-leaf-motion]').style.transform !== ''")
    frames = motion.evaluate('''async el => {
      const before = getComputedStyle(el).transform;
      await new Promise(resolve => setTimeout(resolve, 700));
      return [before, getComputedStyle(el).transform];
    }''')
    assert len(set(frames)) == 2, 'Hero leaves must sway'
    page.emulate_media(reduced_motion='reduce')
    page.wait_for_function("document.querySelector('[data-intro-leaves=hero] [data-intro-leaf-motion]').style.transform === ''")
    # Load each layout in reduced-motion mode independently of the map's media refresh.
    page.reload(wait_until='networkidle')
    for width in (1920, 1280, 768, 375, 320):
        page.set_viewport_size({'width': width, 'height': 1000})
        page.evaluate('window.scrollTo(0, 0)')
        expect(hero.get_by_role('heading', level=1)).to_be_visible()
        assert page.evaluate('document.documentElement.scrollWidth') <= width
        assert backdrop.locator('img:visible').count() >= 4
        for image in backdrop.locator('img:visible').all():
            expect(image).to_have_attribute('alt', '')
            expect(image).to_have_js_property('complete', True)
            assert image.evaluate('el => el.naturalWidth') > 0
        page.screenshot(path=str(output / f'hero-{width}.png'))
    page.set_viewport_size({'width': 1280, 'height': 1000})
    pin = hero.get_by_role('button', name='Xem Cà phê tại Đắk Lắk', exact=True)
    pin.click()
    expect(hero.get_by_role('region', name='Đắk Lắk', exact=True)).to_be_visible()
    page.keyboard.press('Escape')
    expect(pin).to_be_focused()
    expect(hero.get_by_role('heading', level=1)).to_be_visible()
    expect(page.get_by_role('region', name='Bản đồ cây trồng Việt Nam', exact=True)).to_have_count(1)
    hero.get_by_role('button', name='Tạo tài khoản', exact=True).click()
    expect(page.get_by_role('dialog').get_by_role('heading', name='Tạo tài khoản AgriAI', exact=True)).to_be_visible()
    assert not errors, errors
    browser.close()
    print('Intro hero background: motion/reduced motion, five widths, decoded decoration, map/focus and registration passed.')
