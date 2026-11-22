# Đặc tả 40 ca kiểm thử giao diện tự động — AGRI-145

Chromium chạy từng phương thức dưới đây trên Next.js production. Mỗi ca dùng ApiStub và có assertion riêng. Cột bằng chứng trong JSON là `test`, chứa tên phương thức thực thi. Các ca thủ công nằm trong [đặc tả manual](manual_e2e_test_cases.md).

## Hợp đồng theo registry

### ADMIN

| Mã | Ưu tiên | Tiền điều kiện | Bước kiểm | Assertion trong mã |
|---|---|---|---|---|
| `E2E-ADM-01` | **P0** | Có 3 trạng thái phiên: Guest (chưa đăng nhập), User thường và Admin hợp lệ | 1. Truy cập /admin khi chưa đăng nhập (Guest) và kiểm tra thông báo yêu cầu tài khoản Admin.<br>2. Đăng nhập User thường, truy cập /admin và xác nhận bị chặn quyền.<br>3. Đăng nhập Admin, truy cập /admin và kiểm tra tiêu đề "Tổng quan vận hành". | [`test_admin_portal_blocks_guest_and_normal_user_and_allows_admin`](../../../frontend/tests/browser/e2e/test_admin.py) |
| `E2E-ADM-02` | **P0** | Đã đăng nhập tài khoản Admin tại /admin (dữ liệu tổng quan AdminMockProvider) | 1. Mở trang /admin mục Tổng quan và mở khối "Lịch tháng".<br>2. Lọc lần lượt theo Ngày, Tháng, Năm và kiểm tra số cột biểu đồ/trạng thái bộ lọc.<br>3. Bấm "Bỏ lọc thời gian" và kiểm tra quay về trạng thái "Toàn bộ". | [`test_admin_overview_charts_and_calendar_date_filters_using_mock_provider`](../../../frontend/tests/browser/e2e/test_admin.py) |
| `E2E-ADM-03` | **P1** | Đã đăng nhập tài khoản Admin tại /admin trên viewport desktop (1280px) và mobile/tablet (768px, 375px) | 1. Trên desktop 1280px, bấm nút thu gọn/mở rộng rail và chuyển qua Người dùng, Ảnh đã tải lên, Phiên đăng nhập, Cây trồng, Tổng quan.<br>2. Trên mobile/tablet (768px, 375px), bấm "Mở menu quản trị", chọn Người dùng và kiểm tra scrollWidth <= viewport. | [`test_admin_responsive_rail_and_mobile_navigation_across_views`](../../../frontend/tests/browser/e2e/test_admin.py) |
| `E2E-ADM-04` | **P1** | Đã đăng nhập Admin tại /admin; danh sách Users có 12 bản ghi (2 trang) | 1. Mở view Người dùng, chuyển Trang sau/trước và tìm kiếm theo email.<br>2. Thực hiện Khóa tài khoản (kèm lý do), Khôi phục tài khoản, Gửi cảnh báo và Cưỡng chế đăng xuất.<br>3. Xác nhận phiên Admin vẫn hoạt động và các request PUT/POST tương ứng được gửi. | [`test_admin_users_search_pagination_and_moderation_actions`](../../../frontend/tests/browser/e2e/test_admin.py) |
| `E2E-ADM-06` | **P1** | Đã đăng nhập Admin tại /admin; hệ thống có các phiên Active, Expired, Ended | 1. Chọn mục "Phiên đăng nhập" trên điều hướng quản trị.<br>2. Kiểm tra 3 trạng thái badge hiển thị đầy đủ.<br>3. Nhập email người dùng vào ô tìm kiếm và bấm "Tìm kiếm". | [`test_admin_sessions_search_and_status_badges`](../../../frontend/tests/browser/e2e/test_admin.py) |
| `E2E-ADM-07` | **P1** | Đã đăng nhập Admin tại /admin mục Cây trồng | 1. Chọn mục "Cây trồng", bấm "Thêm mới", điền tên danh mục, tên tiếng Việt, mô tả, tên khoa học rồi bấm "Lưu nội dung".<br>2. Reload trang, quay lại mục Cây trồng, tìm bản ghi vừa tạo và mở chi tiết để đối chiếu giá trị. | [`test_admin_catalog_plant_crud_and_publication`](../../../frontend/tests/browser/e2e/test_admin.py) |

### AUTH

| Mã | Ưu tiên | Tiền điều kiện | Bước kiểm | Assertion trong mã |
|---|---|---|---|---|
| `E2E-AUTH-01` | **P0** | Trình duyệt ở trang chủ / ở trạng thái Guest chưa đăng nhập | 1. Bấm "Tạo tài khoản" trên header để mở modal đăng ký.<br>2. Nhập họ tên, email, mật khẩu, tích checkbox điều khoản và bấm "Tạo tài khoản".<br>3. Kiểm tra URL chuyển sang /home, navbar hiển thị liên kết hồ sơ và localStorage lưu token. | [`test_register_account_submits_payload_and_enters_home`](../../../frontend/tests/browser/e2e/test_auth.py) |
| `E2E-AUTH-02` | **P0** | Trình duyệt ở trang chủ /; tài khoản hợp lệ đã tồn tại | 1. Bấm "Đăng nhập" trên header để mở LoginModal.<br>2. Nhập email, mật khẩu và mã xác nhận đọc từ khung CAPTCHA.<br>3. Bấm "Đăng nhập" và xác nhận điều hướng vào /home cùng tên người dùng trên navbar. | [`test_login_with_valid_credentials_and_captcha_enters_home`](../../../frontend/tests/browser/e2e/test_auth.py) |
| `E2E-AUTH-03` | **P0** | Người dùng đang đăng nhập hợp lệ với token trong localStorage | 1. Từ /home bấm mở trang /profile.<br>2. Bấm nút "Đăng xuất".<br>3. Kiểm tra URL quay về /, localStorage/sessionStorage trống và POST /api/auth/logout đã gửi kèm Bearer token. | [`test_logout_revokes_session_clears_storage_and_returns_intro`](../../../frontend/tests/browser/e2e/test_auth.py) |
| `E2E-AUTH-04` | **P1** | Trình duyệt ở trang chủ / và đã mở modal Đăng nhập | 1. Nhập email, mật khẩu và mã CAPTCHA sai (00000) rồi bấm "Đăng nhập"; xác nhận thông báo lỗi CAPTCHA và không gọi API.<br>2. Nhập đúng CAPTCHA nhưng sai mật khẩu (401); kiểm tra alert lỗi xác thực và email vẫn giữ nguyên. | [`test_login_rejects_wrong_captcha_and_invalid_credentials`](../../../frontend/tests/browser/e2e/test_auth.py) |
| `E2E-AUTH-05` | **P1** | Trình duyệt ở modal Đăng nhập tại trang / | 1. Mở modal Đăng nhập và bấm "Quên mật khẩu?".<br>2. Nhập email tài khoản và bấm "Gửi mã".<br>3. Kiểm tra ô nhập "Mã trong email" hiển thị và request POST /api/auth/forgot-password khớp payload. | [`test_forgot_password_requests_recovery_code`](../../../frontend/tests/browser/e2e/test_auth.py) |
| `E2E-AUTH-06` | **P2** | Người dùng đang ở trạng thái Guest (chưa đăng nhập) | 1. Truy cập lần lượt /history, /profile và /agricultural-profiles khi chưa đăng nhập.<br>2. Xác nhận URL chuyển hướng về / và header hiển thị nút "Đăng nhập". | [`test_guest_is_redirected_from_protected_routes`](../../../frontend/tests/browser/e2e/test_auth.py) |
| `E2E-AUTH-07` | **P1** | Tài khoản đã yêu cầu quên mật khẩu và nhận được mã xác nhận hợp lệ | 1. Gửi email quên mật khẩu, nhập mã xác nhận và bấm "Tiếp theo".<br>2. Nhập mật khẩu mới, xác nhận mật khẩu mới và bấm "Đổi mật khẩu".<br>3. Bấm "Quay lại đăng nhập", đăng nhập với mật khẩu mới và xác nhận vào /home. | [`test_password_recovery_completes_reset_and_logs_in`](../../../frontend/tests/browser/e2e/test_auth.py) |

### CATALOG

| Mã | Ưu tiên | Tiền điều kiện | Bước kiểm | Assertion trong mã |
|---|---|---|---|---|
| `E2E-CAT-01` | **P0** | Truy cập trang công khai /plants (không cần đăng nhập) có dữ liệu cây trồng | 1. Mở /plants và kiểm tra danh sách cây trồng hiển thị.<br>2. Nhập từ khóa "Cà chua" vào ô tìm kiếm danh mục và bấm "Tìm kiếm".<br>3. Bấm "Xem chi tiết" và kiểm tra URL /plants/[id], tên khoa học và bệnh liên quan. | [`test_plants_catalog_search_and_detail_navigation`](../../../frontend/tests/browser/e2e/test_catalog.py) |
| `E2E-CAT-02` | **P1** | Truy cập trang công khai /diseases có dữ liệu bệnh hại và cặp cây-bệnh | 1. Mở /diseases, nhập từ khóa "cháy lá" và bấm "Tìm kiếm".<br>2. Xác nhận danh sách lọc đúng bệnh khớp từ khóa.<br>3. Bấm "Xem chi tiết" mở /diseases/[id] và kiểm tra nội dung triệu chứng, điều trị. | [`test_diseases_catalog_search_and_detail_navigation`](../../../frontend/tests/browser/e2e/test_catalog.py) |
| `E2E-CAT-03` | **P1** | Truy cập /medicines với dữ liệu thuốc BVTV có nhiều hơn 1 trang kết quả | 1. Mở /medicines, kiểm tra tổng số kết quả và bấm "Trang sau" / "Trang trước".<br>2. Chọn bộ lọc "Lọc theo cây", nhập tên thuốc và bấm "Tìm kiếm".<br>3. Mở /medicines/[id] và kiểm tra cảnh báo an toàn, hướng dẫn sử dụng. | [`test_medicines_catalog_filter_pagination_and_detail`](../../../frontend/tests/browser/e2e/test_catalog.py) |
| `E2E-CAT-04` | **P1** | Truy cập trang công khai /knowledge có bài viết hướng dẫn kỹ thuật | 1. Mở /knowledge, nhập từ khóa "cháy lá sớm" và bấm "Tìm kiếm".<br>2. Kiểm tra chỉ hiển thị bài viết khớp từ khóa.<br>3. Bấm "Xem chi tiết" mở /knowledge/[id] và kiểm tra nội dung bài viết, liên kết nguồn tham khảo. | [`test_knowledge_catalog_search_and_article_detail`](../../../frontend/tests/browser/e2e/test_catalog.py) |

### DIAGNOSIS

| Mã | Ưu tiên | Tiền điều kiện | Bước kiểm | Assertion trong mã |
|---|---|---|---|---|
| `E2E-DIAG-01` | **P0** | Trình duyệt ở /diagnose ở trạng thái Guest chưa đăng nhập | 1. Mở /diagnose ở trạng thái khách, tải lên ảnh PNG hợp lệ (>=224px).<br>2. Bấm "Phân tích ngay".<br>3. Kiểm tra vùng kết quả hiển thị tên bệnh, độ tin cậy, nút "Lưu kết quả vào tài khoản" và không tự gọi /api/predictions/guest/save. | [`test_guest_diagnosis_completes_without_saving_account_history`](../../../frontend/tests/browser/e2e/test_diagnosis.py) |
| `E2E-DIAG-02` | **P0** | Người dùng đã đăng nhập với JWT hợp lệ và đang ở trang /diagnose | 1. Mở /diagnose với phiên đã đăng nhập.<br>2. Chọn ảnh lá hợp lệ và bấm "Phân tích ngay".<br>3. Kiểm tra kết quả hiển thị, request có Bearer token và lịch sử có bản ghi mới. | [`test_authenticated_diagnosis_saves_prediction_to_history`](../../../frontend/tests/browser/e2e/test_diagnosis.py) |
| `E2E-DIAG-03` | **P0** | Ở trang /diagnose; API trả về dự đoán bệnh có độ tin cậy 94% kèm Top-3 và triệu chứng/điều trị | 1. Tải lên ảnh lá hợp lệ tại /diagnose và bấm "Phân tích ngay".<br>2. Kiểm tra vùng "Kết quả phân tích" hiển thị tên bệnh, 94.0%, danh sách Top-3 (3 phần tử), triệu chứng và điều trị. | [`test_high_confidence_disease_shows_details_top3_and_treatment`](../../../frontend/tests/browser/e2e/test_diagnosis.py) |
| `E2E-DIAG-05` | **P1** | Ở trang /diagnose; dự đoán trả về conditionType=Healthy và treatment=null | 1. Tải lên ảnh lá khỏe mạnh tại /diagnose và bấm "Phân tích ngay".<br>2. Kiểm tra tiêu đề "Lá khỏe mạnh", độ tin cậy 97.0% và thông điệp "Chưa có khuyến nghị xử lý trong cẩm nang.". | [`test_healthy_leaf_shows_care_fallback_without_medication`](../../../frontend/tests/browser/e2e/test_diagnosis.py) |
| `E2E-DIAG-07` | **P2** | Trình duyệt đang ở trang /diagnose tại vùng "Tải ảnh lên" | 1. Lần lượt chọn file wrong.pdf, empty.png (0 byte), huge.png (>15 MB) và tiny.png (223x224px).<br>2. Kiểm tra thông báo lỗi tương ứng hiển thị và không có request POST /api/predictions nào được gửi. | [`test_client_validation_rejects_invalid_empty_oversize_and_small_files`](../../../frontend/tests/browser/e2e/test_diagnosis.py) |

### HISTORY

| Mã | Ưu tiên | Tiền điều kiện | Bước kiểm | Assertion trong mã |
|---|---|---|---|---|
| `E2E-HIST-01` | **P0** | Đã đăng nhập với tài khoản có sẵn các bản ghi lịch sử chẩn đoán | 1. Mở /history khi đã đăng nhập và kiểm tra danh sách 2 bản ghi hiển thị.<br>2. Bấm nút "Dạng lưới" và xác nhận aria-pressed=true cùng số thẻ giữ nguyên.<br>3. Kiểm tra request GET /api/predictions gửi kèm Bearer token. | [`test_history_list_loads_items_and_switches_list_and_card_views`](../../../frontend/tests/browser/e2e/test_history.py) |
| `E2E-HIST-02` | **P0** | Đã đăng nhập tại /history có bản ghi chẩn đoán kèm snapshot chi tiết | 1. Mở /history và bấm "Xem chi tiết" ở bản ghi đầu tiên.<br>2. Kiểm tra dialog "Chi tiết kết quả phân loại" hiển thị tên bệnh, độ tin cậy, nút "In / lưu PDF" và request GET /api/predictions/{id}. | [`test_history_detail_modal_fetches_snapshot_by_id`](../../../frontend/tests/browser/e2e/test_history.py) |
| `E2E-HIST-03` | **P1** | Đã đăng nhập tại /history có 2 bản ghi lịch sử | 1. Bấm nút xóa trên bản ghi "Bệnh cháy lá sớm" và xác nhận trong alertdialog.<br>2. Kiểm tra bản ghi biến mất và request DELETE được gửi.<br>3. Reload trang /history và xác nhận chỉ còn bản ghi còn lại. | [`test_delete_history_item_with_confirmation_persists_in_stub_across_reload`](../../../frontend/tests/browser/e2e/test_history.py) |
| `E2E-HIST-06` | **P2** | Đã đăng nhập tài khoản hợp lệ truy cập /history với 0, 1 và 12 bản ghi | 1. Mở /history khi lịch sử rỗng (0) và kiểm tra tiêu đề "Chưa có mẫu nào được lưu".<br>2. Cập nhật 1 bản ghi rồi reload và kiểm tra hiển thị 1 mẫu.<br>3. Cập nhật 12 bản ghi rồi reload và kiểm tra hiển thị 12 mẫu. | [`test_history_handles_zero_one_and_multiple_records_empty_states`](../../../frontend/tests/browser/e2e/test_history.py) |

### HOME

| Mã | Ưu tiên | Tiền điều kiện | Bước kiểm | Assertion trong mã |
|---|---|---|---|---|
| `E2E-HOME-01` | **P1** | Người dùng đã đăng nhập và đang ở trang /home | 1. Mở /home và bấm nút "Kiểm tra lá" trong vùng Hero; xác nhận URL chuyển sang /diagnose.<br>2. Quay lại /home, bấm nút "Tra cứu bệnh" và xác nhận URL chuyển sang /diseases. | [`test_home_hero_cta_buttons_navigate_to_diagnose_and_diseases`](../../../frontend/tests/browser/e2e/test_home_system.py) |
| `E2E-HOME-02` | **P1** | Người dùng đã đăng nhập và đang ở trang /home có dữ liệu cây trồng | 1. Mở /home và kiểm tra danh sách "Lưu ý chụp ảnh" có đúng 3 mục.<br>2. Tại mục "Tìm hiểu cây bạn đang trồng", bấm nút "Tìm hiểu cây Cà chua".<br>3. Xác nhận điều hướng đến URL /plants/[id]. | [`test_home_photo_tips_and_plant_guide_selection_navigates_to_plant_detail`](../../../frontend/tests/browser/e2e/test_home_system.py) |
| `E2E-HOME-03` | **P2** | Người dùng đã đăng nhập; mở /home lần lượt ở viewport 1280x900, 768x900 và 375x812 | 1. Mở /home lần lượt ở viewport 1280x900, 768x900 và 375x812.<br>2. Kiểm tra tiêu đề chính tồn tại và documentElement.scrollWidth <= viewport width ở cả 3 kích thước. | [`test_home_responsive_viewports_have_no_horizontal_overflow`](../../../frontend/tests/browser/e2e/test_home_system.py) |
| `E2E-HOME-04` | **P2** | Người dùng đã đăng nhập; trình duyệt bật reduced_motion='reduce' | 1. Khởi tạo browser context với reduced_motion='reduce' và mở /home.<br>2. Kiểm tra vùng Hero "Khám phá AgriAI" và mục "Trước khi chụp ảnh: 3 lưu ý vàng" hiển thị rõ ràng. | [`test_home_renders_cleanly_under_reduced_motion`](../../../frontend/tests/browser/e2e/test_home_system.py) |

### PROFILE

| Mã | Ưu tiên | Tiền điều kiện | Bước kiểm | Assertion trong mã |
|---|---|---|---|---|
| `E2E-PROF-01` | **P0** | Người dùng đã đăng nhập và truy cập trang /profile | 1. Mở /profile, sửa ô "Họ và tên" sang giá trị mới và bấm "Lưu thay đổi".<br>2. Kiểm tra thông báo thành công và payload PUT /api/users/profile.<br>3. Reload trang /profile và xác nhận ô "Họ và tên" giữ nguyên tên mới. | [`test_update_user_full_name_and_reload_from_api_stub`](../../../frontend/tests/browser/e2e/test_profile.py) |
| `E2E-PROF-02` | **P1** | Người dùng đã đăng nhập và đang ở trang /profile | 1. Mở /profile và chọn tệp avatar.png qua input "Chọn ảnh đại diện".<br>2. Xác nhận dialog "Lưu ảnh đại diện mới?" mở ra rồi bấm "Lưu ảnh".<br>3. Kiểm tra thông báo thành công và request POST /api/users/avatar. | [`test_upload_avatar_via_editor_modal`](../../../frontend/tests/browser/e2e/test_profile.py) |
| `E2E-PROF-03` | **P1** | Người dùng đã đăng nhập và đang ở trang /profile | 1. Mở /profile, bấm "Đổi mật khẩu" và nhập mật khẩu hiện tại, mật khẩu mới, xác nhận mật khẩu mới.<br>2. Bấm "Gửi mã xác nhận", nhập mã xác nhận email và bấm "Cập nhật mật khẩu".<br>3. Xác nhận request POST /api/users/change-password được gửi. | [`test_change_password_from_profile_security_settings`](../../../frontend/tests/browser/e2e/test_profile.py) |
| `E2E-PROF-04` | **P2** | Người dùng đã đăng nhập và đang ở mục Bảo mật trên /profile | 1. Mở /profile và bật switch "Xác thực hai lớp qua email".<br>2. Nhập mã xác minh vào ô "Mã xác minh" và bấm "Xác minh mã".<br>3. Kiểm tra công tắc chuyển sang checked và request POST /api/auth/two-factor/setup/verify được gửi. | [`test_enable_email_two_factor_in_profile`](../../../frontend/tests/browser/e2e/test_profile.py) |

### AGRI-PROFILE

| Mã | Ưu tiên | Tiền điều kiện | Bước kiểm | Assertion trong mã |
|---|---|---|---|---|
| `E2E-PROF-AGRI-01` | **P0** | Đã đăng nhập và truy cập /agricultural-profiles (chưa có hồ sơ) | 1. Mở /agricultural-profiles và bấm "Tạo hồ sơ đầu tiên".<br>2. Điền tên hồ sơ và mô tả canh tác rồi bấm "Tạo hồ sơ".<br>3. Kiểm tra thông báo thành công, tên/mô tả hiển thị và payload POST /api/agricultural-profiles. | [`test_create_agricultural_profile_submits_and_opens_detail`](../../../frontend/tests/browser/e2e/test_profile.py) |
| `E2E-PROF-AGRI-02` | **P1** | Đã đăng nhập tại /agricultural-profiles và có sẵn ít nhất 1 hồ sơ | 1. Mở /agricultural-profiles, bấm "Xem chi tiết" trên hồ sơ và bấm "Chỉnh sửa".<br>2. Cập nhật tên hồ sơ, mô tả canh tác và bấm "Lưu thay đổi".<br>3. Kiểm tra thông báo cập nhật và request PUT /api/agricultural-profiles/{id}. | [`test_edit_agricultural_profile_updates_ui_via_put`](../../../frontend/tests/browser/e2e/test_profile.py) |
| `E2E-PROF-AGRI-03` | **P1** | Đã đăng nhập và có sẵn hồ sơ nông nghiệp; đang ở trang /diagnose | 1. Mở /diagnose, tải ảnh lá hợp lệ và bấm "Phân tích ngay".<br>2. Trong dialog "Chọn hồ sơ để lưu", chọn hồ sơ nông nghiệp và bấm "Lưu vào hồ sơ".<br>3. Kiểm tra thông báo "Đã lưu kết quả vào hồ sơ" và request PUT tới /agricultural-profile. | [`test_link_diagnosis_prediction_to_agricultural_profile`](../../../frontend/tests/browser/e2e/test_profile.py) |

### SYSTEM

| Mã | Ưu tiên | Tiền điều kiện | Bước kiểm | Assertion trong mã |
|---|---|---|---|---|
| `E2E-SYS-01` | **P1** | Trình duyệt mở /diagnose trên cả desktop (1280px) và mobile (375px) | 1. Trên desktop 1280px, bấm liên kết "Cây trồng" trên thanh điều hướng chính và kiểm tra URL /plants.<br>2. Trên mobile 375px, kiểm tra chiều cao nút "Mở menu", mở drawer và bấm "Về dự án" để kiểm tra URL /about. | [`test_responsive_navigation_desktop_bar_and_mobile_drawer_with_touch_targets`](../../../frontend/tests/browser/e2e/test_home_system.py) |
| `E2E-SYS-02` | **P2** | Trình duyệt truy cập một đường dẫn không tồn tại (/duong-dan-khong-ton-tai) | 1. Điều hướng tới /duong-dan-khong-ton-tai và kiểm tra HTTP status 404.<br>2. Kiểm tra tiêu đề "Không tìm thấy trang" và thẻ meta[name=robots] có content='noindex'.<br>3. Bấm liên kết "Về trang chủ" và xác nhận quay về /. | [`test_not_found_404_page_has_noindex_and_recovery_actions`](../../../frontend/tests/browser/e2e/test_home_system.py) |
| `E2E-SYS-04` | **P2** | Trình duyệt truy cập route công khai /about | 1. Mở /about và kiểm tra HTTP 200 cùng các tiêu đề nội dung chính.<br>2. Reload trang /about và xác nhận nội dung vẫn hiển thị bình thường.<br>3. Bấm nút "Kiểm tra lá" trong main và xác nhận chuyển sang /diagnose. | [`test_about_page_loads_survives_reload_and_navigates_to_diagnose`](../../../frontend/tests/browser/e2e/test_home_system.py) |

## Chạy và đọc báo cáo

```powershell
python frontend/tests/browser/e2e/run_suite.py --with-server --json-report .cache/e2e-browser.json
python frontend/tests/browser/e2e/run_live_suite.py --json-report .cache/e2e-live.json
```

Runner live dùng Chromium, API thật, PostgreSQL, AI và Mailpit. Mỗi ID `LIVE-*` đại diện một hành trình có thể thành công hoặc thất bại độc lập. Bốn danh mục phải có bản ghi công khai để tìm kiếm và mở chi tiết. Dùng stack thử nghiệm với demo users, storage cấu hình riêng và dữ liệu bỏ được.

Báo cáo live không cấp kết quả cho 40 ID trong bảng. Ví dụ, luồng live quản trị tra cứu người dùng, còn contract browser kiểm cả khóa, khôi phục, cảnh báo và cưỡng chế đăng xuất. Luồng live chẩn đoán kiểm confidence, Top-3 và lịch sử. Contract browser Healthy dùng fixture tất định và kiểm nội dung hướng dẫn. Ca `LIVE-DIAGNOSIS-HEALTHY` tải ảnh ớt khỏe có sẵn trong repo và kiểm phân loại Healthy, hai trường thuốc của API và UI cảnh báo độ tin cậy thấp, hiển thị Healthy trong Top-3 khi mở đối chiếu. Trang giới thiệu khách ở `/` và các ca đăng nhập ở `/home` có phạm vi riêng.


| ID live | Hành vi được kiểm |
|---|---|
| `LIVE-GUEST` | Landing khách, điều hướng responsive, About/404, chẩn đoán khách, validation và route được bảo vệ |
| `LIVE-ACCOUNT` | Đăng ký, hồ sơ, avatar, lịch sử trống và đăng xuất |
| `LIVE-DIAGNOSIS-HISTORY` | Chẩn đoán người dùng, Top-3, mở và xóa bản ghi vừa tạo |
| `LIVE-PREDICTION-PROFILE` | Tạo hồ sơ và liên kết bản ghi dự đoán |
| `LIVE-AGRICULTURAL-PROFILE` | Tạo/sửa hồ sơ và kiểm tra lại sau reload |
| `LIVE-ADMIN-NAVIGATION-SEARCH` | Quyền vào admin, điều hướng và tra cứu người dùng/phiên |
| `LIVE-CATALOG-ADMIN` | Tạo, mở lại và xóa đúng cây thử nghiệm |
| `LIVE-EMAIL-AUTH` | OTP reset, đổi mật khẩu và bật 2FA qua Mailpit |
| `LIVE-DIAGNOSIS-HEALTHY` | Kết quả Healthy từ checkpoint hiện tại, không có thuốc, UI cảnh báo độ tin cậy thấp |
| `LIVE-CATALOG-PLANTS` | Tìm cây và mở chi tiết |
| `LIVE-CATALOG-DISEASES` | Tìm bệnh và mở chi tiết |
| `LIVE-CATALOG-MEDICINES` | Tìm thuốc và mở chi tiết |
| `LIVE-CATALOG-KNOWLEDGE` | Tìm bài cẩm nang và mở chi tiết |
