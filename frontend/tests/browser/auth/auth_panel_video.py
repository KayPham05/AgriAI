"""Verify public auth video delivery, motion preferences and responsive dialogs."""
from pathlib import Path
import json
import os
from playwright.sync_api import sync_playwright, expect

output = Path(__file__).resolve().parents[4] / '.cache' / 'auth-video'
output.mkdir(parents=True, exist_ok=True)
app_url = os.environ.get('AUTH_APP_URL', 'http://localhost:3000')
media_url = 'https://pub-5b7b85dc2aa84f1ca62aa18308983f37.r2.dev/auth/field-v1.mp4'

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1280, 'height': 900}, reduced_motion='no-preference')
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.route('**/api/**', lambda route: route.fulfill(status=200, json=[]))
    page.goto(app_url, wait_until='networkidle')
    page.get_by_role('banner').get_by_role('button', name='Đăng nhập', exact=True).click()
    dialog = page.get_by_role('dialog')
    video = dialog.locator('video')
    expect(video).to_have_count(1)
    expect(video).to_have_attribute('src', media_url)
    page.wait_for_function('document.querySelector("[data-auth-video]").currentTime > .1')
    info = video.evaluate('v=>({muted:v.muted,loop:v.loop,inline:v.playsInline,width:v.videoWidth,height:v.videoHeight,duration:v.duration})')
    assert info['muted'] and info['loop'] and info['inline'], info
    assert info['width'] == 1280 and info['height'] == 720 and 24 < info['duration'] < 25, info
    partial = page.request.get(media_url, headers={'Range': 'bytes=0-1023', 'User-Agent': 'Mozilla/5.0'})
    assert partial.status == 206 and len(partial.body()) == 1024
    quality = video.evaluate('''async v=>{
      const before=v.getVideoPlaybackQuality(), time=v.currentTime;
      await new Promise(r=>setTimeout(r,1000));
      const after=v.getVideoPlaybackQuality();
      return {secondsAdvanced:v.currentTime-time,frames:after.totalVideoFrames-before.totalVideoFrames,dropped:after.droppedVideoFrames-before.droppedVideoFrames};
    }''')
    assert quality['secondsAdvanced'] > .5, quality
    (output / 'public-playback.json').write_text(json.dumps(quality, indent=2))
    expect(dialog.get_by_role('button', name='Tạm dừng video nền', exact=True)).to_have_count(0)
    expect(dialog.get_by_role('button', name='Phát video nền', exact=True)).to_have_count(0)
    page.evaluate("Object.defineProperty(document, 'hidden', {configurable:true, value:true}); document.dispatchEvent(new Event('visibilitychange'))")
    frames = video.evaluate('''async v=>{const before=v.currentTime;await new Promise(r=>setTimeout(r,300));return [before,v.currentTime,v.paused]}''')
    assert frames[0] == frames[1] and frames[2]
    page.evaluate("Object.defineProperty(document, 'hidden', {configurable:true, value:false}); document.dispatchEvent(new Event('visibilitychange'))")
    page.wait_for_function('!document.querySelector("[data-auth-video]").paused')
    video.evaluate('v => v.dataset.sameNode = "yes"')
    dialog.get_by_role('tab', name='Đăng ký', exact=True).click()
    expect(video).to_have_attribute('data-same-node', 'yes')
    expect(dialog.get_by_role('textbox', name='Họ và tên', exact=True)).to_be_visible()
    for width in (1280, 768):
        page.set_viewport_size({'width': width, 'height': 900})
        expect(video).to_be_visible()
        expect(dialog).to_have_css('opacity', '1')
        assert page.evaluate('document.documentElement.scrollWidth') <= width
        page.screenshot(path=str(output / f'register-{width}.png'))
    page.keyboard.press('Escape')
    expect(page.locator('video')).to_have_count(0)
    for width, reduced in ((375, 'no-preference'), (320, 'no-preference'), (1280, 'reduce')):
        static = browser.new_page(viewport={'width': width, 'height': 900}, reduced_motion=reduced)
        media_requests = []
        static.on('request', lambda request: media_requests.append(request.url) if 'field-v1.mp4' in request.url else None)
        static.route('**/api/**', lambda route: route.fulfill(status=200, json=[]))
        static.goto(app_url, wait_until='networkidle')
        static.get_by_role('banner').get_by_role('button', name='Đăng nhập', exact=True).click()
        expect(static.get_by_role('dialog').locator('video')).to_have_count(0)
        expect(static.get_by_role('dialog')).to_have_css('opacity', '1')
        assert not media_requests, media_requests
        assert static.evaluate('document.documentElement.scrollWidth') <= width
        static.screenshot(path=str(output / f'login-{width}-{reduced}.png'))
        static.close()
    assert not errors, errors
    browser.close()
    print('Auth video: shared public 720p MP4 playback, muted/loop, pause/resume, shared auth modes, unmount and mobile/reduced no-video requests passed.')
