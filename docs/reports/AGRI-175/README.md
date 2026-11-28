# AGRI-175 · S18 Tạo hoặc sửa hồ sơ nông nghiệp (`ProfileEditor`)

- Ngày: 28/11/2026 · Nhánh: `AGRI-175-mobile-profile-editor`
- Thiết kế Figma đã duyệt: [`AGRI-175 · S18 / Tạo hoặc sửa hồ sơ`](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=90-280)

## Thay đổi chính

- **`reactNative/src/features/profiles/profileMutations.ts`:** Validation (`name` trim 1–150 ký tự, `description` trim/null), cùng các adapter `fetchAgriculturalProfileById`, `createAgriculturalProfile` (`POST → 201`), `updateAgriculturalProfile` (`PUT → 200`), `deleteAgriculturalProfile` (`DELETE → 204`).
- **`reactNative/src/features/profiles/screens/ProfileEditorScreen.tsx` & `src/app/profiles/editor.tsx`:** Form chung cho create/edit, chống double tap, giữ draft khi lỗi và hiện `ConfirmDialog` `"Bỏ thay đổi?"` khi quay lại lúc đang sửa.
- **`reactNative/src/app/profiles/index.tsx` & `_layout.tsx`:** Nối `onCreate` sang `/profiles/editor`.

## Kết quả kiểm thử (28/11/2026)

| Case / Kiểm tra | Kết quả | Chi tiết |
| --- | --- | --- |
| `S18-T1` · Tên trắng / 151 ký tự | **Pass** (component) | `ProfileEditorScreen.test.tsx`: chặn gửi và báo lỗi field. |
| `S18-T2` · Create 201 | **Pass** (component/mock) | `ProfileEditorScreen.test.tsx`: gửi `{ name, description }` đã trim và gọi `onSaved`. |
| `S18-T3` · PUT lỗi | **Pass** (component/mock) | `ProfileEditorScreen.test.tsx`: giữ nguyên draft và cho phép gửi lại thành công. |
| `pnpm typecheck`, `pnpm lint`, `pnpm test` | **Pass** | 20 suites / 84 tests passed (19 suites trước đó + `ProfileEditorScreen.test.tsx` 3/3). |

## Còn lại

- Nối `S18` edit từ màn `S19` (`AGRI-176`) và kiểm thử CRUD hồ sơ với backend thật.
