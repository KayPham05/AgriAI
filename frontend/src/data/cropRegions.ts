export interface CropRegionEntry {
  plantId: string;
  locality: string;
  context: string;
  sourceUrl: string;
}

export interface CropRegion {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
  markerOffset?: 'north-east' | 'east';
  crops: CropRegionEntry[];
}

// Representative locations, not a nationwide production-density dataset.
// Coordinates place a regional marker approximately; each crop keeps its own locality and source.
export const CROP_REGIONS: CropRegion[] = [
  {
    id: 'dong-bac',
    name: 'Đông Bắc',
    markerOffset: 'east',
    longitude: 105.1,
    latitude: 22.2,
    crops: [
      {
        plantId: 'orange',
        locality: 'Bắc Quang, Hà Giang',
        context: 'Vùng Bắc Quang gắn với cam sành Hà Giang và chỉ dẫn địa lý của sản phẩm.',
        sourceUrl: 'https://tuyengiao.hagiang.gov.vn/upload/64711/20220407/04-NQTU_01_91891.pdf',
      },
      {
        plantId: 'tea',
        locality: 'Tân Cương, Thái Nguyên',
        context: 'Tân Cương là vùng chè truyền thống có chỉ dẫn địa lý.',
        sourceUrl:
          'https://thainguyen.gov.vn/thuong-hieu-tra/khat-vong-vuon-tam-du-lich-sinh-thai-va-van-hoa-tra-161797',
      },
    ],
  },
  {
    id: 'son-la',
    name: 'Sơn La',
    longitude: 103.9,
    latitude: 21.32,
    crops: [
      {
        plantId: 'corn',
        locality: 'Sơn La',
        context: 'Ngô được ghi nhận trong thống kê diện tích gieo trồng của địa phương.',
        sourceUrl:
          'https://data.sonla.gov.vn/storage/all/2024/04/tL25KoyA445iGuflrH9KWwZReMMncOfYC1lz3NwD.PDF',
      },
    ],
  },
  {
    id: 'dak-lak',
    name: 'Đắk Lắk',
    longitude: 107.85,
    latitude: 13.15,
    crops: [
      {
        plantId: 'coffee',
        locality: 'Đắk Lắk',
        context: 'Đắk Lắk là vùng trồng cà phê trọng điểm của Tây Nguyên.',
        sourceUrl:
          'https://www.mard.gov.vn/VanBanLayYKien/VBPLFile/QHPCTTTL_BaoCaoTongHop_20210708.pdf',
      },
      {
        plantId: 'durian',
        locality: 'Krông Pắc, Đắk Lắk',
        context: 'Krông Pắc phát triển vùng trồng và thương hiệu sầu riêng địa phương.',
        sourceUrl: 'https://daklak.gov.vn/en/-/huyen-krong-pac-tong-ket-nien-vu-sau-rieng-nam-2024',
      },
    ],
  },
  {
    id: 'lam-dong',
    name: 'Lâm Đồng',
    longitude: 108.6,
    latitude: 11.55,
    crops: [
      {
        plantId: 'tomato',
        locality: 'Đơn Dương, Lâm Đồng',
        context: 'Đơn Dương có mô hình sản xuất cà chua phù hợp điều kiện địa phương.',
        sourceUrl:
          'https://lamdong.gov.vn/sites/snnptnt/tth/SitePages/Ca-chua-NT8-nang-suat-cao-o-Don-Duong.aspx',
      },
      {
        plantId: 'potato',
        locality: 'Đà Lạt và vùng ven, Lâm Đồng',
        context: 'Khí hậu Đà Lạt và vùng ven thuận lợi cho sản xuất khoai tây.',
        sourceUrl: 'https://lamdong.gov.vn/sites/book/kyyeu/nghiencuuphattrienkhoaitay45.htm',
      },
    ],
  },
  {
    id: 'dong-nai',
    name: 'Đồng Nai',
    longitude: 107.03,
    latitude: 10.96,
    crops: [
      {
        plantId: 'banana',
        locality: 'Trảng Bom, Đồng Nai',
        context: 'Trảng Bom có vùng chuyên canh chuối phục vụ xuất khẩu.',
        sourceUrl:
          'https://dongnai.gov.vn/vi/news/chuong-trinh-ke-hoach-phat-trien-ktxh/vung-chuyen-canh-van-kho-san-xuat-lon-12284.html',
      },
    ],
  },
  {
    id: 'ninh-thuan',
    name: 'Ninh Thuận',
    longitude: 108.95,
    latitude: 11.52,
    markerOffset: 'north-east',
    crops: [
      {
        plantId: 'grape',
        locality: 'Vùng trồng Ninh Phước và Thuận Nam, Ninh Thuận',
        context:
          'Nho Ninh Thuận được bảo hộ chỉ dẫn địa lý; tên vùng trồng theo tài liệu của Cục Sở hữu trí tuệ.',
        sourceUrl:
          'https://www.ipvietnam.gov.vn/vi_VN/web/guest/phat-trien-chi-dan-ia-ly/-/asset_publisher/SGA9PgvmYtWI/content/danh-sach-chi-dan-ia-ly-uoc-ang-tren-cong-bao-shcn',
      },
    ],
  },
  {
    id: 'mekong-delta',
    name: 'Đồng bằng sông Cửu Long',
    longitude: 105.54,
    latitude: 10.08,
    crops: [
      {
        plantId: 'rice',
        locality: 'Cần Thơ và vùng Đồng bằng sông Cửu Long',
        context: 'Đồng bằng sông Cửu Long là vùng sản xuất lúa lớn của cả nước.',
        sourceUrl: 'https://sokhcn.cantho.gov.vn/default.aspx?nid=21729&pid=57',
      },
      {
        plantId: 'mango',
        locality: 'Cao Lãnh, Đồng Tháp',
        context: 'Cao Lãnh gắn với vùng xoài cát chu và vườn xoài địa phương.',
        sourceUrl: 'https://dongthap.gov.vn/vi/web/cong-thong-tin-dtp/tin-tuc/chi-tiet?id=6499265',
      },
      {
        plantId: 'chili',
        locality: 'Thanh Bình, Đồng Tháp',
        context: 'Ớt Thanh Bình được địa phương giới thiệu trong nhóm nông sản đặc trưng.',
        sourceUrl: 'https://dongthap.gov.vn/tiem-nang-phat-trien-dong-thap',
      },
      {
        plantId: 'pomelo',
        locality: 'Vùng Bến Tre',
        context: 'Bưởi da xanh Bến Tre đã được cấp chỉ dẫn địa lý.',
        sourceUrl: 'https://xtdt.bentre.gov.vn/tiem-nang-va-the-manh/tiem-nang/',
      },
      {
        plantId: 'watermelon',
        locality: 'Gò Công Đông',
        context: 'Gò Công Đông có vùng trồng dưa hấu được cấp mã số xuất khẩu.',
        sourceUrl: 'https://dongthap.gov.vn/en/ubnd-xa-go-cong-dong',
      },
    ],
  },
];
