"""Measure synchronized photo/foliage opacity through actual slideshow transitions."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

output = Path(__file__).resolve().parents[4] / '.cache' / 'banner-transition'
output.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1280, 'height': 900}, reduced_motion='no-preference')
    session = {'token': 'fixture', 'user': {'id': 'banner-review', 'role': 'User'}}
    page.add_init_script('localStorage.setItem("leafai_auth_session", ' + json.dumps(json.dumps(session)) + ')')
    user = {'id': 'banner-review', 'fullName': 'Review', 'email': 'review@example.test', 'role': 'User', 'createdAt': '2026-10-21T00:00:00Z'}
    page.route('**/api/**', lambda route: route.fulfill(status=200, json=user if '/auth/me' in route.request.url else ({'items': [], 'totalCount': 0, 'pageNumber': 1, 'pageSize': 100} if '/predictions' in route.request.url else [])))
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto('http://localhost:3000/home', wait_until='networkidle')
    for width in (1280, 375):
        page.set_viewport_size({'width': width, 'height': 900})
        records = page.evaluate('''async () => {
          const old = document.querySelector('[data-home-banner-scene=active]');
          const oldLeaf = old.querySelector('[data-home-leaf-motion]');
          const until = performance.now() + 15000;
          let next;
          while (performance.now() < until) {
            next = document.querySelector('[data-home-banner-scene=active]');
            if (next !== old) break;
            await new Promise(requestAnimationFrame);
          }
          if (next === old) throw Error('Banner did not advance');
          const opacity = el => {
            let value = 1;
            while (el && el.tagName !== 'FIGURE') {
              value *= Number(getComputedStyle(el).opacity);
              el = el.parentElement;
            }
            return value;
          };
          const frames = [];
          for (let i = 0; i < 24; i++) {
            const leaf = next.querySelector('[data-home-banner-leaves]');
            frames.push({photo: opacity(next.querySelector('img')),
              leaves: opacity(leaf), previousRetained: oldLeaf.isConnected,
              ready: [...next.querySelectorAll('img')].every(img => img.hidden || (img.complete && img.naturalWidth > 0)),
              previousPose: oldLeaf.isConnected ? getComputedStyle(oldLeaf).transform : null});
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          return frames;
        }''')
        assert records[0]['photo'] < .8, records[0]
        assert records[-1]['photo'] > .95, records[-1]
        assert all(abs(frame['photo'] - frame['leaves']) < .001 for frame in records)
        assert all(frame['ready'] for frame in records)
        assert all(frame['previousRetained'] for frame in records if frame['photo'] < .999)
        assert len({frame['previousPose'] for frame in records[1:] if frame['previousRetained']}) == 1
        assert all(a['photo'] <= b['photo'] + .01 for a, b in zip(records, records[1:]))
        page.wait_for_function("document.querySelector('[data-home-banner-scene=previous]') === null")
        (output / f'opacity-{width}.json').write_text(json.dumps(records, indent=2))
        page.screenshot(path=str(output / f'settled-{width}.png'))
    assert not errors, errors
    browser.close()
    print('Banner transition: desktop/mobile synchronized opacity, ready images, retained outgoing leaves and continuous fade passed.')
