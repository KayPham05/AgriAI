"""Check real decorative-leaf motion, visibility pause and reduced-motion behavior."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

output = Path(__file__).resolve().parents[4] / '.cache' / 'intro-leaves'
output.mkdir(parents=True, exist_ok=True)

def sample(page):
    return page.locator('[data-intro-leaves="section"] [data-intro-leaf-motion]').first.evaluate('''async el => {
      const before = getComputedStyle(el).transform;
      await new Promise(resolve => setTimeout(resolve, 300));
      return [before, getComputedStyle(el).transform];
    }''')

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1280, 'height': 900}, reduced_motion='no-preference')
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.route('**/api/**', lambda route: route.fulfill(status=200, json=[]))
    page.goto('http://localhost:3000', wait_until='networkidle')
    section = page.get_by_role('region', name='Sử dụng kết quả có trách nhiệm', exact=True)
    section.scroll_into_view_if_needed()
    assert section.locator('[data-intro-leaf]').count() >= 3
    page.wait_for_function("document.querySelector('[data-intro-leaves=section] [data-intro-leaf-motion]').style.transform !== ''")
    assert len(set(sample(page))) == 2, 'Visible leaves must move'
    travel = section.locator('[data-intro-leaf-motion]').first.evaluate('''async el => {
      const start = new DOMMatrixReadOnly(getComputedStyle(el).transform);
      await new Promise(resolve => setTimeout(resolve, 2500));
      const end = new DOMMatrixReadOnly(getComputedStyle(el).transform);
      return Math.hypot(end.m41 - start.m41, end.m42 - start.m42);
    }''')
    assert travel > 25, f'Leaf sway must be clearly visible, observed {travel:.1f}px'
    page.screenshot(path=str(output / 'desktop.png'))
    page.evaluate("Object.defineProperty(document, 'hidden', {configurable:true, value:true}); document.dispatchEvent(new Event('visibilitychange'))")
    assert len(set(sample(page))) == 1, 'Hidden document must pause leaves'
    page.evaluate("Object.defineProperty(document, 'hidden', {configurable:true, value:false}); document.dispatchEvent(new Event('visibilitychange'))")
    assert len(set(sample(page))) == 2, 'Visible document must resume leaves'
    page.evaluate('window.scrollTo(0, 0)')
    page.wait_for_function("document.querySelector('[data-intro-leaves=section]').getBoundingClientRect().top > innerHeight")
    page.evaluate('() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
    assert len(set(sample(page))) == 1, 'Offscreen leaves must pause'
    section.scroll_into_view_if_needed()
    page.emulate_media(reduced_motion='reduce')
    page.wait_for_function("document.querySelector('[data-intro-leaves=section] [data-intro-leaf-motion]').style.transform === ''")
    assert len(set(sample(page))) == 1, 'Reduced-motion leaves must stay static'
    for width in (768, 375, 320):
        page.set_viewport_size({'width': width, 'height': 900})
        section.scroll_into_view_if_needed()
        leaves = section.locator('[data-intro-leaf]:visible')
        assert leaves.count() >= 3
        assert page.evaluate('document.documentElement.scrollWidth') <= width
        page.screenshot(path=str(output / f'static-{width}.png'))
    expect(section.get_by_text('Kết quả chỉ hỗ trợ tham khảo, không thay thế chuyên gia.', exact=True)).to_be_visible()
    assert not errors, errors
    browser.close()
    print('Intro leaves: multiple leaves, real motion, hidden/offscreen pause, reduced motion and narrow layout passed.')
