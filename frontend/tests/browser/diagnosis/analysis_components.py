"""Local Chromium UI regression with controlled API data, not real model inference."""

import json
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import expect, sync_playwright

root = Path(__file__).resolve().parents[4]
out = root / '.cache' / 'diagnosis-components'
out.mkdir(parents=True, exist_ok=True)
user = {'id': 'diagnosis-ui', 'fullName': 'UI Review', 'email': 'review@example.test', 'role': 'User', 'createdAt': '2026-10-21T00:00:00Z'}
plant = {'id': 'tomato', 'name': 'Tomato', 'vietnameseName': 'Cà chua', 'scientificName': 'Solanum lycopersicum', 'description': None, 'isActive': True, 'createdAt': user['createdAt']}
disease = {'id': 'blight', 'name': 'Early Blight', 'vietnameseName': 'Bệnh cháy lá sớm', 'description': None, 'symptoms': 'Đốm lá trong dữ liệu thử nghiệm.', 'treatment': None, 'prevention': None, 'isActive': True, 'createdAt': user['createdAt']}
link = {'id': 'tomato-blight', 'plantId': 'tomato', 'diseaseId': 'blight', 'className': 'Tomato___Early_blight', 'classIndex': 1, 'isActive': True, 'plant': plant, 'disease': disease}
result = {'id': 'fixture-result', 'imagePath': '/fixture.jpg', 'imagePublicId': None, 'predictedPlantDisease': link, 'confidence': 0.94, 'predictionDetails': [
    {'classIndex': 1, 'className': 'Tomato___Early_blight', 'confidence': 0.94, 'plantDisease': link},
    {'classIndex': 2, 'className': 'Tomato___Healthy', 'confidence': 0.04, 'plantDisease': None},
    {'classIndex': 3, 'className': 'Tomato___Leaf_spot', 'confidence': 0.02, 'plantDisease': None},
], 'createdAt': user['createdAt']}

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1440, 'height': 1100})
    page.add_init_script('localStorage.setItem("leafai_auth_session", ' + json.dumps(json.dumps({'token': 'fixture', 'user': user})) + ')')
    requests = []
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))

    def api(route):
        path = urlparse(route.request.url).path
        if path == '/api/predictions' and route.request.method == 'POST':
            requests.append(route)
            return
        body = user if path == '/api/auth/me' else {'items': [], 'totalCount': 0, 'pageNumber': 1, 'pageSize': 100} if path == '/api/predictions' else []
        route.fulfill(status=200, json=body)

    page.route('**/api/**', api)
    page.goto('http://localhost:3000/diagnose', wait_until='domcontentloaded')
    expect(page.get_by_text('Kiểm tra ảnh lá cây', exact=True)).to_have_count(0)
    expect(page.get_by_text('Chọn một ảnh rõ nét. Bạn sẽ nhận được lớp dự đoán và độ tin cậy để đối chiếu.', exact=True)).to_have_count(0)
    stepper = page.get_by_role('list', name='Tiến trình phân tích')
    result_card = page.get_by_role('region', name='Kết quả phân tích')
    expect(stepper.locator('[aria-current="step"]')).to_contain_text('Chọn ảnh lá')
    expect(stepper.get_by_text('CHỌN ẢNH', exact=True)).to_be_visible()
    expect(stepper.get_by_text('ĐANG THỰC HIỆN', exact=True)).to_have_count(0)
    expect(result_card.get_by_role('heading', name='Kết quả chẩn đoán sẽ xuất hiện tại đây')).to_be_visible()
    layouts = []
    for width, height in [(1440, 1100), (1024, 900), (768, 900), (375, 812), (320, 568), (667, 375)]:
        page.set_viewport_size({'width': width, 'height': height})
        assert page.evaluate('document.documentElement.scrollWidth') <= width
        boxes = stepper.get_by_role('listitem').evaluate_all('(es)=>es.map(e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width}})')
        assert len(boxes) == 3
        if width >= 1024:
            assert max(b['y'] for b in boxes) - min(b['y'] for b in boxes) < 2
        stepper.screenshot(path=str(out / f'stepper-{width}.png'))
        result_card.screenshot(path=str(out / f'empty-{width}.png'))
        layouts.append({'width': width, 'no_overflow': True})
    page.set_viewport_size({'width': 1440, 'height': 1100})
    photo = next((root / 'frontend' / 'src' / 'assets').rglob('*.jpg'))
    page.get_by_label('Chọn ảnh lá cây', exact=True).set_input_files(photo)
    expect(stepper.locator('[aria-current="step"]')).to_contain_text('Chọn ảnh lá')
    expect(stepper.get_by_text('ĐANG THỰC HIỆN', exact=True)).to_be_visible()
    page.get_by_role('button', name='Phân tích ngay', exact=True).click()
    expect(result_card).to_have_attribute('aria-busy', 'true')
    expect(stepper.locator('[aria-current="step"]')).to_contain_text('Phân tích')
    expect(stepper.get_by_text('Phân tích AI', exact=True)).to_have_count(0)
    expect(stepper.get_by_label('Đã hoàn thành')).to_have_count(1)
    expect(result_card.get_by_role('status')).to_be_visible()
    page.wait_for_function('document.querySelector("[aria-busy=true]") !== null')
    assert len(requests) == 1
    requests.pop().fulfill(status=503, json={'message': 'API thử nghiệm tạm thời không khả dụng'})
    expect(result_card.get_by_role('alert')).to_contain_text('API thử nghiệm tạm thời không khả dụng')
    result_card.get_by_role('button', name='Phân tích lại ngay').click()
    expect(result_card).to_have_attribute('aria-busy', 'true')
    page.wait_for_function('document.querySelector("[aria-busy=true]") !== null')
    # Playwright pumps route events while waiting for the loading status.
    expect(result_card.get_by_role('status')).to_be_visible()
    assert len(requests) == 1
    requests.pop().fulfill(status=201, json=result)
    expect(result_card.get_by_role('heading', name='Bệnh cháy lá sớm')).to_be_visible()
    expect(stepper.locator('[aria-current="step"]')).to_contain_text('Kết quả & Đối chiếu')
    expect(stepper.get_by_label('Đã hoàn thành')).to_have_count(3)
    expect(stepper.get_by_text('ĐANG THỰC HIỆN', exact=True)).to_have_count(0)
    expect(stepper.get_by_text('ĐÃ HOÀN TẤT', exact=True)).to_be_visible()
    expect(result_card.get_by_role('list', name='Dự đoán Top-3').get_by_role('listitem')).to_have_count(3)
    expect(result_card.get_by_text('4.0%', exact=True)).to_be_visible()
    expect(result_card.get_by_text('Chưa có khuyến nghị xử lý trong cẩm nang.')).to_be_visible()
    page.emulate_media(reduced_motion='reduce')
    stepper.screenshot(path=str(out / 'stepper-complete.png'))
    result_card.screenshot(path=str(out / 'success-desktop.png'))
    page.set_viewport_size({'width': 320, 'height': 568})
    assert page.evaluate('document.documentElement.scrollWidth') <= 320
    page.get_by_role('button', name='Xóa ảnh', exact=True).click()
    expect(stepper.locator('[aria-current="step"]')).to_contain_text('Chọn ảnh lá')
    expect(result_card.get_by_role('heading', name='Kết quả chẩn đoán sẽ xuất hiện tại đây')).to_be_visible()
    expect(stepper.get_by_text('ĐÃ HOÀN TẤT', exact=True)).to_have_count(0)
    expect(stepper.get_by_text('CHỌN ẢNH', exact=True)).to_be_visible()
    expect(stepper.get_by_text('ĐANG THỰC HIỆN', exact=True)).to_have_count(0)
    assert not errors, errors
    (out / 'verification.json').write_text(json.dumps({'layouts': layouts, 'upload_error_retry_success_reset': True, 'pageerrors': errors}, indent=2))
    browser.close()
    print('Diagnosis stepper/card: six viewports, upload, error/retry, Top-3, reset and reduced-motion passed')
