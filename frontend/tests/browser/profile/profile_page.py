"""Profile layout and local-edit regression on localhost with isolated API fixtures."""

import json
import re
from pathlib import Path
from playwright.sync_api import sync_playwright, expect


OUTPUT = Path(__file__).resolve().parents[4] / '.cache' / 'profile-redesign'
OUTPUT.mkdir(parents=True, exist_ok=True)
USER = {
    'id': 'profile-review', 'fullName': 'thong tran',
    'email': 'thong.tran@example.test', 'role': 'User',
    'createdAt': '2026-10-21T00:00:00Z',
}


def fixture(route):
    payload = USER if '/auth/me' in route.request.url else (
        {'items': [], 'totalCount': 0, 'pageNumber': 1, 'pageSize': 100}
        if '/predictions' in route.request.url else []
    )
    route.fulfill(status=200, json=payload)


with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(reduced_motion='reduce')
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.add_init_script('localStorage.setItem("leafai_auth_session", ' + json.dumps(
        json.dumps({'token': 'fixture', 'user': USER})) + ')')
    page.route('**/api/**', fixture)
    page.goto('http://localhost:3000/profile', wait_until='networkidle')
    expect(page.get_by_role('heading', name='Hồ sơ của tôi', exact=True)).to_be_visible()

    for width in (1440, 1280, 768, 375, 320):
        page.set_viewport_size({'width': width, 'height': 1000})
        expect(page.get_by_role('region', name='Thông tin cá nhân')).to_be_visible()
        assert page.evaluate('document.documentElement.scrollWidth') <= width
        page.get_by_role('button', name='Sửa thông tin', exact=True).click()
        name = page.get_by_role('textbox', name='Họ và tên', exact=True)
        name.fill('   ')
        expect(page.get_by_role('button', name='Lưu thay đổi')).to_be_disabled()
        name.fill('Tên chưa lưu')
        page.get_by_role('button', name='Hủy chỉnh sửa').click()
        page.get_by_role('button', name='Sửa thông tin', exact=True).click()
        expect(name).to_have_value(USER['fullName'])
        assert page.evaluate('document.documentElement.scrollWidth') <= width
        page.evaluate('window.scrollTo(0, 0)')
        page.screenshot(path=str(OUTPUT / f'editing-{width}.png'), full_page=True)
        page.get_by_role('button', name='Hủy chỉnh sửa').click()
        page.evaluate('window.scrollTo(0, 0)')
        page.screenshot(path=str(OUTPUT / f'profile-{width}.png'), full_page=True)

    page.get_by_role('button', name='Sửa thông tin', exact=True).click()
    page.get_by_role('textbox', name='Họ và tên', exact=True).fill('  Trần Thông  ')
    page.get_by_role('textbox', name='Khu vực canh tác / Trạm').fill('Đồng Tháp')
    page.get_by_role('button', name='Lưu thay đổi').click()
    expect(page.get_by_role('heading', name='Trần Thông', exact=True)).to_be_visible()
    expect(page.get_by_role('status').filter(has_text='Đã cập nhật thông tin trong phiên này.')).to_be_visible()
    expect(page.get_by_role('region', name='Thông tin cá nhân').get_by_text('Đồng Tháp', exact=True)).to_be_visible()
    page.set_viewport_size({'width': 1280, 'height': 1000})
    page.emulate_media(color_scheme='dark')
    page.screenshot(path=str(OUTPUT / 'profile-dark.png'), full_page=True)

    # Exercise real file reading/decoding and the shared profile state, without a server upload.
    avatar_file = Path(__file__).resolve().parents[3] / 'public' / 'images' / 'agriai-leaf-mark.png'
    with page.expect_file_chooser() as chooser:
        page.get_by_role('button', name='Đổi ảnh đại diện', exact=True).click()
    chooser.value.set_files(str(avatar_file))
    confirmation = page.get_by_role('dialog', name='Lưu ảnh đại diện mới?')
    expect(confirmation).to_be_visible()
    expect(page.locator('aside img')).to_have_count(0)
    for width in (1280, 375, 320):
        page.set_viewport_size({'width': width, 'height': 1000})
        box = confirmation.bounding_box()
        assert box['x'] >= 0 and box['x'] + box['width'] <= width
        page.screenshot(path=str(OUTPUT / f'avatar-confirm-{width}.png'))
    with page.expect_file_chooser() as replacement:
        page.get_by_role('button', name='Chọn ảnh khác', exact=True).click()
    replacement.value.set_files(str(avatar_file))
    expect(page.get_by_role('button', name='Lưu ảnh', exact=True)).to_be_enabled()
    page.get_by_role('button', name='Không lưu', exact=True).click()
    expect(confirmation).to_have_count(0)
    expect(page.locator('aside img')).to_have_count(0)
    page.get_by_label('Chọn ảnh đại diện').set_input_files(str(avatar_file))
    expect(confirmation).to_be_visible()
    page.get_by_role('button', name='Lưu ảnh', exact=True).click()
    avatar = page.get_by_role('img', name='Ảnh đại diện của Trần Thông', exact=True)
    expect(avatar).to_have_attribute('src', re.compile(r'^data:image/png;base64,'))
    assert avatar.evaluate('(image) => image.complete && image.naturalWidth > 0')
    saved_avatar = avatar.get_attribute('src')
    for width in (1280, 375, 320):
        page.set_viewport_size({'width': width, 'height': 1000})
        image_box = avatar.bounding_box()
        camera_box = page.get_by_role('button', name='Đổi ảnh đại diện', exact=True).bounding_box()
        camera_x = camera_box['x'] + camera_box['width'] / 2
        camera_y = camera_box['y'] + camera_box['height'] / 2
        assert camera_box['width'] <= 44 and camera_box['height'] <= 44
        assert image_box['x'] + image_box['width'] * .6 <= camera_x <= image_box['x'] + image_box['width']
        assert image_box['y'] + image_box['height'] * .6 <= camera_y <= image_box['y'] + image_box['height']
    page.set_viewport_size({'width': 1280, 'height': 1000})
    page.get_by_label('Chọn ảnh đại diện').set_input_files({'name': 'broken.png', 'mimeType': 'image/png', 'buffer': b'not an image'})
    expect(page.get_by_role('alert').filter(has_text='Không đọc được ảnh')).to_be_visible()
    expect(avatar).to_have_attribute('src', saved_avatar)
    page.get_by_label('Chọn ảnh đại diện').set_input_files(str(avatar_file))
    expect(page.get_by_role('alert').filter(has_text='Không đọc được ảnh')).to_have_count(0)
    expect(confirmation).to_be_visible()
    page.get_by_role('button', name='Lưu ảnh', exact=True).click()
    page.get_by_role('link', name='Mẫu đã lưu', exact=True).click()
    expect(page).to_have_url('http://localhost:3000/history')
    page.go_back()
    expect(page).to_have_url('http://localhost:3000/profile')
    expect(avatar).to_have_attribute('src', saved_avatar)
    page.get_by_role('button', name='Sửa thông tin', exact=True).click()
    page.get_by_role('textbox', name='Khu vực canh tác / Trạm').fill('Cần Thơ')
    page.get_by_role('button', name='Lưu thay đổi').click()
    expect(avatar).to_have_attribute('src', saved_avatar)
    for width in (375, 320):
        page.set_viewport_size({'width': width, 'height': 1000})
        assert page.evaluate('document.documentElement.scrollWidth') <= width
        page.evaluate('window.scrollTo(0, 0)')
        page.screenshot(path=str(OUTPUT / f'avatar-{width}.png'), full_page=True)

    guest = browser.new_page(viewport={'width': 375, 'height': 900}, reduced_motion='reduce')
    guest.route('**/api/**', fixture)
    guest.goto('http://localhost:3000/profile', wait_until='networkidle')
    # The existing application guard redirects a fresh unauthenticated session to Intro.
    expect(guest.get_by_role('heading', name='Nhìn kỹ chiếc lá. Hiểu thêm về cây.')).to_be_visible()
    expect(guest.get_by_role('button', name='Đăng xuất')).to_have_count(0)
    guest.get_by_role('button', name='Đăng nhập', exact=True).click()
    expect(guest.get_by_role('dialog')).to_be_visible()
    assert not errors, errors
    browser.close()
    print('Profile: five widths, edit/cancel/save, real avatar upload/decode/retry/navigation, existing guest guard/login and no page errors passed.')
