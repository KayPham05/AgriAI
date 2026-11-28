# AGRI-169 · S12 Xem trước ảnh (`ImagePreview`)

- Ngày: 28/11/2026 · Nhánh: `AGRI-169-mobile-image-preview`
- Thiết kế Figma đã duyệt: [`AGRI-169 · S12 / Xem trước ảnh`](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=90-69)

## Thay đổi chính

- **`reactNative/src/features/diagnosis/validateLeafImage.ts`:** Kiểm tra định dạng JPEG/PNG, từ chối HEIC chưa chuyển đổi và tệp trống hoặc > 15 MiB (`15_728_640` bytes).
- **`reactNative/src/features/profiles/fetchAgriculturalProfiles.ts` & `src/components/ui/ProfilePickerSheet.tsx`:** Adapter `GET /api/agricultural-profiles` (chỉ gọi khi User) và sheet chọn hồ sơ có tùy chọn `"Không gắn hồ sơ"`.
- **`reactNative/src/features/diagnosis/screens/ImagePreviewScreen.tsx` & `src/app/diagnosis/preview.tsx`:** Hiển thị ảnh `4:3 contain` qua `MediaPreview`, khóa CTA `"Phân tích ảnh"` khi ảnh không hợp lệ, ẩn chọn hồ sơ với Guest và truyền `profileId: null`.

## Kết quả kiểm thử (28/11/2026)

| Case / Kiểm tra | Kết quả | Chi tiết |
| --- | --- | --- |
| `S12-T1` · Chọn ảnh thứ hai | **Pass** (component) | `ImagePreviewScreen.test.tsx`: chỉ giữ ảnh thứ hai trong preview. |
| `S12-T2` · Ảnh > 15 MiB | **Pass** (component) | `ImagePreviewScreen.test.tsx`: báo lỗi và khóa CTA `"Phân tích ảnh"`. |
| `S12-T3` · Chọn hồ sơ User / Guest | **Pass** (component) | `ImagePreviewScreen.test.tsx`: User truyền đúng `profileId`; Guest ẩn picker và truyền `null`. |
| `pnpm typecheck`, `pnpm lint`, `pnpm test` | **Pass** | 14 suites / 67 tests passed (13 suites trước đó + `ImagePreviewScreen.test.tsx` 3/3). |

## Còn lại

- Nối `onAnalyze` sang màn `S13` (`AGRI-170`) và kiểm thử convert HEIC/EXIF trên thiết bị thật.
