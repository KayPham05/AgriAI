# Mobile architecture

src/app chỉ chứa routes/layouts; route compose screen từ src/features/<domain>/screens. Đừng đặt services/components thường trong router directory vì chúng có thể thành route ngoài ý muốn.

| Thư mục | Trách nhiệm |
|---|---|
| onboarding | WelcomeScreen tĩnh đã nối root route |
| auth/account | Auth/challenges/session/profile/avatar, chưa triển khai |
| home/diagnosis/history/profiles | Home/một ảnh/lượt/snapshot/profile, chưa triển khai |
| catalog/notifications/settings | Tra cứu public/notification User/local settings/help, chưa triển khai |
| components/ui | Native primitives dùng chung, chưa triển khai |
| lib/api, lib/storage | Network/persistence boundary, chưa triển khai |
| theme | Semantic token từ DESIGN.md, không hardcode màu trong feature |
| config/hooks/types | Chỉ thêm module khi có consumer thật |

Expo Router root layout đã nối WelcomeScreen, safe area/status bar/light theme. Native projects sinh qua prebuild, chưa duy trì android/ios thủ công. ReactDOM pin cùng React để đáp ứng peer Router, không tạo app Next.js riêng. System font fallback; shared components/tab bar/query/session/API còn là task tiếp theo.

Khi tích hợp API: DTO theo contract thật,204 không parse JSON,401 khác timeout; catalog không nâng route admin; private image có owner auth/token không URL/log; clear cache theo user. Guest save không inference lại; timeout prediction không auto-POST.
