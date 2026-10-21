"""Verify the redesigned introduction sections with isolated auth/API responses."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

output = Path(__file__).resolve().parents[4] / '.cache' / 'intro-lower'
output.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(reduced_motion='reduce')
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.route('**/api/**', lambda route: route.fulfill(status=200, json=[]))
    page.goto('http://localhost:3000', wait_until='networkidle')
    workflow = page.get_by_role('region', name='Cách AgriAI hoạt động', exact=True)
    principles = page.get_by_role('region', name='Sử dụng kết quả có trách nhiệm', exact=True)
    banner = page.get_by_role('region', name='Bắt đầu với AgriAI', exact=True)
    for width, height in ((1440, 1100), (1024, 900), (768, 900), (375, 812), (320, 568), (667, 375)):
        page.set_viewport_size({'width': width, 'height': height})
        workflow.scroll_into_view_if_needed()
        photo = workflow.get_by_role('img')
        expect(photo).to_be_visible()
        page.wait_for_function("document.querySelector('#how-it-works img').complete && document.querySelector('#how-it-works img').naturalWidth > 0")
        expect(workflow.get_by_role('article')).to_have_count(3)
        expect(workflow.get_by_text('ConvNeXt-Tiny', exact=True)).to_be_visible()
        expect(principles.get_by_role('listitem')).to_have_count(3)
        assert page.evaluate('document.documentElement.scrollWidth') <= width
        image_box = photo.bounding_box()
        step_box = workflow.get_by_role('article').first.bounding_box()
        if width >= 1024:
            assert step_box['x'] > image_box['x'] + image_box['width']
        else:
            assert step_box['y'] > image_box['y'] + image_box['height']
        workflow.screenshot(path=str(output / f'workflow-{width}.png'))
        principles.screenshot(path=str(output / f'principles-{width}.png'))
        banner.screenshot(path=str(output / f'banner-{width}.png'))
        for button in banner.get_by_role('button').all():
            box = button.bounding_box()
            assert box['width'] <= width and box['height'] >= 44
    page.set_viewport_size({'width': 1280, 'height': 1000})
    banner.get_by_role('button', name='Tạo tài khoản', exact=True).click()
    expect(page.get_by_role('dialog').get_by_role('heading', name='Tạo tài khoản AgriAI', exact=True)).to_be_visible()
    page.keyboard.press('Escape')
    banner.get_by_role('button', name='Thử nghiệm ngay', exact=True).click()
    expect(page.get_by_role('dialog').get_by_role('heading', name='Chào mừng bạn trở lại', exact=True)).to_be_visible()
    page.keyboard.press('Escape')
    expect(page.get_by_role('region', name='Bản đồ cây trồng Việt Nam')).to_have_count(1)
    assert not errors, errors
    browser.close()
    print('Intro lower sections: six viewports, image delivery, workflow/principles, registration/login actions and no page errors passed.')
