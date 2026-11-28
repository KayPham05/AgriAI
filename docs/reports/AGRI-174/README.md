# AGRI-174 · S17 Danh sách hồ sơ nông nghiệp (`AgriculturalProfiles`)

- Ngày: 28/11/2026 · Nhánh: `AGRI-174-mobile-agricultural-profiles`
- Thiết kế Figma đã duyệt: [`AGRI-174 · S17 / Hồ sơ nông nghiệp`](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=90-253)

## Thay đổi chính

- **`reactNative/src/features/profiles/screens/AgriculturalProfilesScreen.tsx` & `src/app/profiles/index.tsx`:** Hiển thị danh sách hồ sơ của User từ `GET /api/agricultural-profiles` kèm `predictionCount`, `loading`/`empty`/`error` states và key theo `userId` để cô lập cache khi đổi tài khoản.
- **`reactNative/src/app/(tabs)/home.tsx` & `_layout.tsx`:** Nối nút `"Hồ sơ nông nghiệp"` trên Home sang `/profiles`.

## Kết quả kiểm thử (28/11/2026)

| Case / Kiểm tra | Kết quả | Chi tiết |
| --- | --- | --- |
| `S17-T1` · User có 2 hồ sơ | **Pass** (component) | `AgriculturalProfilesScreen.test.tsx`: hiển thị đúng 2 hồ sơ và `predictionCount`. |
| `S17-T2` · Tạo xong quay lại | **Pass** (component) | `AgriculturalProfilesScreen.test.tsx`: cập nhật danh sách có hồ sơ mới. |
| `S17-T3` · Đổi user | **Pass** (component/mock) | `AgriculturalProfilesScreen.test.tsx`: đổi User A → User B không còn thấy hồ sơ User A. |
| `pnpm typecheck`, `pnpm lint`, `pnpm test` | **Pass** | 19 suites / 81 tests passed. |

## Còn lại

- Nối `onCreate` sang `S18` (`AGRI-175`) và `onSelectProfile` sang `S19` (`AGRI-176`).
