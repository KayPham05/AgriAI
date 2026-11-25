# Mobile architecture

src/app chỉ chứa routes/layouts; route compose screen từ src/features/<domain>/screens. Đừng đặt services/components thường trong router directory vì chúng có thể thành route ngoài ý muốn.

| Thư mục | Trách nhiệm |
|---|---|
| onboarding | WelcomeScreen/S02 là đích Guest, có callback cho các màn đích đang chờ tích hợp |
| auth/account | StartupSession kiểm tra phiên đã lưu. Login, challenge, profile và avatar chờ tích hợp |
| home/diagnosis/history/profiles | Home có bảo vệ là đích User. Chẩn đoán, lịch sử và hồ sơ chờ tích hợp |
| catalog/notifications/settings | Tra cứu public/notification User/local settings/help, chưa triển khai |
| components/ui | ActionButton native; các primitive khác chưa triển khai |
| lib/api, lib/storage | SecureStore cho token phiên. Adapter API chung chờ tích hợp |
| theme | Semantic token từ DESIGN.md, không hardcode màu trong feature |
| config/hooks/types | Chỉ thêm module khi có consumer thật |

Expo Router chỉ cho mở Home sau khi `GET /api/auth/me` xác nhận User. Khi phiên chưa sẵn sàng hoặc là Guest, root hiển thị S01 hoặc Welcome. Guard bỏ các route không còn được phép khỏi navigation history. Home được mount theo ID đã xác thực. App chưa có private cache hay return target động. Các task tiếp theo cần scope cache theo User và chỉ dùng các route đích được phép. [Welcome handoff](welcome-handoff.md) mô tả các CTA đang chờ nối.

Native projects sinh qua prebuild. App dùng font hệ thống, safe area và light theme.

Khi tích hợp API: DTO theo contract thật,204 không parse JSON,401 khác timeout; catalog không nâng route admin; private image có owner auth/token không URL/log; clear cache theo user. Guest save không inference lại; timeout prediction không auto-POST.
