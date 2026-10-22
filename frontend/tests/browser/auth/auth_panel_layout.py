"""Verify stable auth-dialog dimensions and a single stationary video surface."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

output = Path(__file__).resolve().parents[4] / '.cache' / 'auth-layout'
output.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(reduced_motion='no-preference')
    page.route('**/api/**', lambda route: route.fulfill(status=200, json=[]))
    page.goto('http://localhost:3000', wait_until='networkidle')
    for width, height in ((1280, 900), (768, 900), (375, 812), (320, 568), (900, 480)):
        page.set_viewport_size({'width': width, 'height': height})
        page.get_by_role('banner').get_by_role('button', name='Đăng nhập', exact=True).click()
        dialog = page.get_by_role('dialog')
        expect(dialog).to_have_css('opacity', '1')
        before = dialog.bounding_box()
        if width >= 768:
            assert dialog.locator('video').count() == 1
            assert dialog.locator('[data-auth-side-panel] video').count() == 0, 'Video must be a shared stationary background'
            dialog.locator('video').evaluate('v => v.dataset.continuous = "yes"')
        for target in ('Đăng ký', 'Đăng nhập', 'Đăng ký'):
            dialog.get_by_role('tab', name=target, exact=True).click()
            frames = dialog.evaluate('''async el=>{
              const video=el.querySelector('video');
              const result=[];
              for(let i=0;i<18;i++){
                const r=el.getBoundingClientRect(),v=video?.getBoundingClientRect();
                result.push({height:r.height,y:r.y,video:v?{x:v.x,y:v.y,width:v.width,height:v.height}:null});
                await new Promise(r=>setTimeout(r,30));
              }return result;
            }''')
            assert all(abs(frame['height']-before['height']) < 1 and abs(frame['y']-before['y']) < 1 for frame in frames), frames
            if width >= 768:
                assert len({tuple(frame['video'].values()) for frame in frames}) == 1
                expect(dialog.locator('video')).to_have_attribute('data-continuous', 'yes')
            assert page.evaluate('document.documentElement.scrollWidth') <= width
        # Long registration content scrolls inside the form, preserving the outer/video frame.
        dialog.locator('summary').click()
        dialog.get_by_role('button', name='Tạo tài khoản', exact=True).scroll_into_view_if_needed()
        after = dialog.bounding_box()
        assert abs(before['height']-after['height']) < 1 and after['height'] <= height
        close = dialog.locator('[data-slot=dialog-close]')
        assert close.evaluate('el => {const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}'), 'Close must stay above the form even when scrolled'
        page.screenshot(path=str(output / f'auth-{width}-{height}.png'))
        close.click()
        expect(dialog).to_have_count(0)
    browser.close()
    print('Auth layout: five viewports, stable height/position during transitions, one stationary video and internal form scrolling passed.')
