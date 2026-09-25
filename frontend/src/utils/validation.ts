import { ValidationResult, QualityCheck, ValidationStatus } from '../types';

/**
 * Kiểm định chất lượng ảnh bằng phân tích quang học trực tiếp trên Canvas
 * (độ sáng, độ sắc nét Laplacian, độ tương phản, tỷ lệ màu sắc thực vật).
 */
export async function validateLeafImage(imageSrc: string): Promise<ValidationResult> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const width = img.naturalWidth || 600;
      const height = img.naturalHeight || 400;

      // Render hình ảnh mẫu lên offscreen canvas để phân tích pixel nhanh
      const canvas = document.createElement('canvas');
      const sampleW = 160;
      const sampleH = Math.max(1, Math.floor((sampleW * height) / width));
      canvas.width = sampleW;
      canvas.height = sampleH;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(createUnavailableResult());
        return;
      }

      ctx.drawImage(img, 0, 0, sampleW, sampleH);
      const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
      const data = imgData.data;

      let totalLum = 0;
      let greenDominantPixels = 0;
      let darkPixels = 0;
      let brightPixels = 0;
      const totalPixels = sampleW * sampleH;

      const grayscale: number[] = [];

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Độ sáng (Luminance)
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        totalLum += lum;
        grayscale.push(lum);

        if (lum < 40) darkPixels++;
        if (lum > 225) brightPixels++;

        // Kiểm tra sắc tố thực vật: sắc xanh lục hoặc sắc nâu gỉ sắt
        const isGreen = g > r * 0.95 && g > b * 1.1;
        const isBrownRust = r > g && g > b && r > 60;
        if (isGreen || isBrownRust) {
          greenDominantPixels++;
        }
      }

      const meanLum = totalLum / totalPixels;
      const plantPixelFraction = greenDominantPixels / totalPixels;

      // Tính biến thiên Laplacian để đo độ sắc nét
      let laplacianDiffSum = 0;
      let countNeighbors = 0;
      for (let y = 1; y < sampleH - 1; y++) {
        for (let x = 1; x < sampleW - 1; x++) {
          const idx = y * sampleW + x;
          const val = grayscale[idx];
          const laplacian =
            grayscale[idx - 1] +
            grayscale[idx + 1] +
            grayscale[idx - sampleW] +
            grayscale[idx + sampleW] -
            4 * val;
          laplacianDiffSum += Math.abs(laplacian);
          countNeighbors++;
        }
      }
      const sharpnessMetric = laplacianDiffSum / (countNeighbors || 1);

      // Đánh giá 5 tiêu chí kiểm định
      const checks: QualityCheck[] = [];

      // 1. Nhận diện lá
      let leafStatus: ValidationStatus = 'pass';
      let leafMsg = 'Ảnh có tỷ lệ màu xanh hoặc nâu phù hợp để xem xét tiếp.';
      if (plantPixelFraction < 0.18) {
        leafStatus = 'warning';
        leafMsg = 'Sắc tố thực vật hơi thấp. Hãy để lá chiếm phần lớn khung hình.';
      }
      if (plantPixelFraction < 0.08) {
        leafStatus = 'fail';
        leafMsg = 'Ảnh có rất ít vùng màu xanh hoặc nâu. Hãy kiểm tra lại ảnh trước khi sử dụng.';
      }
      checks.push({ id: 'leaf_detected', name: 'Ước lượng màu lá', status: leafStatus, message: leafMsg });

      // 2. Độ sắc nét
      let sharpStatus: ValidationStatus = 'pass';
      let sharpMsg = 'Ảnh có độ nét đủ tốt theo phép đo sơ bộ.';
      if (sharpnessMetric < 9.5) {
        sharpStatus = 'warning';
        sharpMsg = 'Ảnh hơi mờ. Vết bệnh có thể khó phân biệt chi tiết vi mô.';
      }
      if (sharpnessMetric < 4.0) {
        sharpStatus = 'fail';
        sharpMsg = 'Ảnh quá mờ hoặc nhòe rung tay, không đủ điều kiện trích xuất đặc trưng.';
      }
      checks.push({ id: 'sharpness', name: 'Độ sắc nét ảnh', status: sharpStatus, message: sharpMsg });

      // 3. Ánh sáng
      let lightStatus: ValidationStatus = 'pass';
      let lightMsg = 'Ánh sáng tự nhiên hài hòa, không bị chói gắt hoặc sấp bóng.';
      if (meanLum < 55) {
        lightStatus = 'warning';
        lightMsg = 'Ảnh hơi tối. Vùng tối có thể che khuất các vết bệnh nhỏ.';
      } else if (meanLum > 200 || brightPixels / totalPixels > 0.35) {
        lightStatus = 'warning';
        lightMsg = 'Ảnh bị cháy sáng hoặc lóa đèn flash bề mặt.';
      }
      if (meanLum < 30) {
        lightStatus = 'fail';
        lightMsg = 'Ảnh quá tối. Chi tiết tán lá bị chìm hoàn toàn trong bóng đen.';
      }
      checks.push({ id: 'lighting', name: 'Ánh sáng quang học', status: lightStatus, message: lightMsg });

      // 4. Khả năng quan sát lá
      let visStatus: ValidationStatus = 'pass';
      let visMsg = 'Vùng màu xanh hoặc nâu chiếm phần đáng kể trong ảnh.';
      if (plantPixelFraction < 0.25) {
        visStatus = 'warning';
        visMsg = 'Lá mục tiêu chiếm diện tích tương đối nhỏ trong bức ảnh.';
      }
      checks.push({ id: 'leaf_visibility', name: 'Khả năng quan sát lá', status: visStatus, message: visMsg });

      // 5. Độ phức tạp hậu cảnh
      let bgStatus: ValidationStatus = 'pass';
      let bgMsg = 'Chưa thấy dấu hiệu nền quá nhiều chi tiết theo phép đo sơ bộ.';
      if (sharpnessMetric > 28 && plantPixelFraction < 0.35) {
        bgStatus = 'warning';
        bgMsg = 'Hậu cảnh nhiều chi tiết phức tạp. Nên đặt lá trên nền trơn đơn giản.';
      }
      checks.push({ id: 'background', name: 'Độ phức tạp hậu cảnh', status: bgStatus, message: bgMsg });

      // Đánh giá tổng quát
      const hasFail = checks.some((c) => c.status === 'fail');
      const hasWarning = checks.some((c) => c.status === 'warning');

      let overallMsg = 'Ảnh đạt các kiểm tra chất lượng sơ bộ trên thiết bị.';
      if (hasWarning && !hasFail) {
        overallMsg = 'Ảnh có thể sử dụng được, tuy nhiên một số cảnh báo nhỏ có thể ảnh hưởng đến độ tin cậy.';
      } else if (hasFail) {
        overallMsg = 'Hình ảnh này chưa phù hợp để chẩn đoán bệnh chính xác.';
      }

      resolve({
        valid: !hasFail,
        leaf_detected: leafStatus !== 'fail',
        sharpness: sharpStatus,
        lighting: lightStatus,
        background: bgStatus,
        leaf_visibility: visStatus,
        message: overallMsg,
        checks,
        canAnalyzeAnyway: !hasFail || leafStatus !== 'fail'
      });
    };

    img.onerror = () => {
      resolve(createUnavailableResult());
    };

    img.src = imageSrc;
  });
}

function createUnavailableResult(): ValidationResult {
  return {
    valid: false,
    leaf_detected: false,
    sharpness: 'fail',
    lighting: 'fail',
    background: 'fail',
    leaf_visibility: 'fail',
    message: 'Không thể đọc ảnh để kiểm tra chất lượng. Hãy chọn ảnh khác.',
    canAnalyzeAnyway: false,
    checks: [
      { id: 'unreadable', name: 'Đọc ảnh', status: 'fail', message: 'Tệp ảnh không mở được hoặc trình duyệt không thể xử lý ảnh.' }
    ]
  };
}
