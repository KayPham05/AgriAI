"""Eleven diagnosis UI states with explicit API fixtures, not model acceptance."""

import json
import struct
import zlib
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import expect, sync_playwright

root = Path(__file__).resolve().parents[4]
out = root / '.cache' / 'diagnosis-errors'
out.mkdir(parents=True, exist_ok=True)


def png(width, height):
    def chunk(kind, data):
        return struct.pack('!I', len(data)) + kind + data + struct.pack('!I', zlib.crc32(kind + data))
    rows = (b'\x00' + b'\x30\x80\x30\xff' * width) * height
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!2I5B', width, height, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(rows)) + chunk(b'IEND', b'')


user = {'id': 'errors-ui', 'fullName': 'Review', 'email': 'review@example.test', 'role': 'User', 'createdAt': '2026-10-21T00:00:00Z'}
plant = {'id': 'tomato', 'name': 'Tomato', 'vietnameseName': 'Cà chua', 'scientificName': 'Solanum lycopersicum', 'description': None, 'isActive': True, 'createdAt': user['createdAt']}
disease = {'id': 'leaf-spot', 'name': 'Leaf spot', 'vietnameseName': 'Lớp thử nghiệm', 'description': None, 'symptoms': None, 'treatment': None, 'prevention': None, 'isActive': True, 'createdAt': user['createdAt']}
link = {'id': 'link', 'plantId': 'tomato', 'diseaseId': 'leaf-spot', 'className': 'Tomato___Leaf_spot', 'classIndex': 1, 'isActive': True, 'plant': plant, 'disease': disease}
low_result = {'id': 'low-result', 'imagePath': '/fixture.jpg', 'imagePublicId': None, 'predictedPlantDisease': link, 'confidence': 0.4, 'predictionDetails': [{'classIndex': i, 'className': f'Fixture_{i}', 'confidence': score, 'plantDisease': None} for i, score in enumerate([0.4, 0.35, 0.25])], 'createdAt': user['createdAt']}
cases = [
    ('NO_LEAF_DETECTED', 'Không tìm thấy lá cây trong ảnh'),
    ('MULTIPLE_LEAVES_CLUTTERED', 'Không xác định được lá chính'),
    ('BLURRY_SURFACE', 'Bề mặt lá bị mờ'),
    ('POOR_LIGHTING', 'Điều kiện ánh sáng không đảm bảo'),
    ('OBSTRUCTED_LEAF', 'Bề mặt lá bị che khuất'),
    ('UNSUPPORTED_SPECIES', 'Giống cây chưa được hỗ trợ'),
    ('LOW_CONFIDENCE_SOFTMAX', 'Độ tin cậy chẩn đoán thấp'),
    ('SERVER_TIMEOUT_OR_ERROR', 'Gián đoạn quá trình phân tích'),
]

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1440, 'height': 1100}, reduced_motion='reduce')
    page.add_init_script('localStorage.setItem("leafai_auth_session", ' + json.dumps(json.dumps({'token': 'fixture', 'user': user})) + ')')
    mode = {'code': 'SERVER_TIMEOUT_OR_ERROR', 'posts': 0}
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))

    def api(route):
        path = urlparse(route.request.url).path
        if path == '/api/predictions' and route.request.method == 'POST':
            mode['posts'] += 1
            if mode['code'] == 'LOW_CONFIDENCE_SOFTMAX':
                route.fulfill(status=201, json=low_result)
            else:
                route.fulfill(status=503 if mode['code'] == 'SERVER_TIMEOUT_OR_ERROR' else 422, json={'code': mode['code'], 'message': 'Phản hồi có cấu trúc từ API thử nghiệm.'})
            return
        body = user if path == '/api/auth/me' else [plant] if path == '/api/plants' else {'items': [], 'totalCount': 0, 'pageNumber': 1, 'pageSize': 100} if path == '/api/predictions' else []
        route.fulfill(status=200, json=body)

    page.route('**/api/**', api)

    def capture(code):
        for width in (1440, 375, 320):
            page.set_viewport_size({'width': width, 'height': 1000})
            assert page.evaluate('document.documentElement.scrollWidth') <= width
            notice = page.get_by_role('alert').filter(has=page.locator('h3'))
            notice.screenshot(path=str(out / f'{code}-{width}.png'))
            assert notice.evaluate('(e)=>{const b=e.getBoundingClientRect();return [...e.querySelectorAll("button")].every(x=>{const r=x.getBoundingClientRect();return r.right<=b.right+1 && r.left>=b.left-1 && x.scrollWidth<=x.clientWidth+1})}'), (code, width)

    input_cases = [
        ('INVALID_FORMAT', 'wrong.pdf', 'application/pdf', b'%PDF', 'Định dạng không hỗ trợ'),
        ('FILE_TOO_LARGE', 'large.png', 'image/png', bytes(15 * 1024 * 1024 + 1), 'Ảnh vượt quá 15 MB'),
        ('CORRUPTED_OR_LOW_RES', 'small.png', 'image/png', png(223, 224), 'Ảnh lỗi hoặc độ phân giải quá thấp'),
    ]
    for code, name, mime, data, title in input_cases:
        page.goto('http://localhost:3000/diagnose', wait_until='domcontentloaded')
        page.get_by_label('Chọn ảnh lá cây', exact=True).set_input_files({'name': name, 'mimeType': mime, 'buffer': data})
        expect(page.get_by_role('region', name='Tải ảnh lên').get_by_role('heading', name=title, exact=True)).to_be_visible()
        assert mode['posts'] == 0
        capture(code)

    for code, title in cases:
        mode['code'] = code
        page.goto('http://localhost:3000/diagnose', wait_until='domcontentloaded')
        page.get_by_label('Chọn ảnh lá cây', exact=True).set_input_files({'name': 'fixture-leaf.png', 'mimeType': 'image/png', 'buffer': png(224, 224)})
        page.get_by_role('button', name='Phân tích ngay', exact=True).click()
        panel = page.get_by_role('region', name='Kết quả phân tích')
        expect(panel.get_by_role('heading', name=title, exact=True)).to_be_visible()
        expect(page.get_by_role('img', name='Ảnh xem trước: fixture-leaf.png')).to_be_visible()
        expect(page.get_by_text('ĐÃ HOÀN TẤT', exact=True)).to_have_count(0)
        capture(code)
        if code == 'UNSUPPORTED_SPECIES':
            panel.get_by_role('button', name='Xem danh sách cây hỗ trợ').click()
            expect(page.get_by_role('dialog').get_by_text('Cà chua', exact=True)).to_be_visible()
            page.keyboard.press('Escape')
        if code == 'NO_LEAF_DETECTED':
            before = mode['posts']
            panel.get_by_role('button', name='Chọn mẫu thử').click()
            expect(page.get_by_role('img', name='Ảnh xem trước: anh-la-mau.jpg')).to_be_visible()
            assert mode['posts'] == before
        if code == 'LOW_CONFIDENCE_SOFTMAX':
            expect(panel.get_by_role('list', name='Dự đoán Top-3')).to_have_count(0)
            panel.get_by_role('button', name='Xem tạm bảng đối chiếu Top-3').click()
            expect(panel.get_by_role('list', name='Dự đoán Top-3')).to_contain_text('40.0%')
            expect(panel.get_by_role('heading', name='Lớp thử nghiệm')).to_have_count(0)
        if code == 'SERVER_TIMEOUT_OR_ERROR':
            before = mode['posts']
            panel.get_by_role('button', name='Phân tích lại ngay').click()
            expect(panel.get_by_role('heading', name=title, exact=True)).to_be_visible()
            assert mode['posts'] == before + 1
    assert not errors, errors
    (out / 'verification.json').write_text(json.dumps({'input_states': 3, 'api_or_confidence_states': 8, 'widths': [1440, 375, 320], 'sample_and_supported_dialog': True, 'pageerrors': errors}, indent=2))
    browser.close()
    print('Eleven diagnosis states, three widths, sample selection, supported list, Top-3 gating and retry passed')
