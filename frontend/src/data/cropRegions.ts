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
// Sources must be direct news or research articles about the crop in its representative region.
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
        context: 'Bắc Quang có các nhà vườn trồng cam sành theo hướng hữu cơ.',
        sourceUrl:
          'https://baohagiang.vn/kinh-te/202201/trong-cam-huu-co-huong-di-ben-vung-cho-nha-vuon-8C02CF2/',
      },
      {
        plantId: 'tea',
        locality: 'Tân Cương, Thái Nguyên',
        context: 'Tân Cương có truyền thống trồng, chăm sóc và chế biến chè đặc sản.',
        sourceUrl:
          'https://www.vietnamplus.vn/tri-thuc-trong-che-bien-che-tan-cuong-di-san-van-hoa-phi-vat-the-qg-post855479.vnp',
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
        context: 'Sơn La có mô hình trồng ngô ngọt theo chuỗi liên kết sản xuất và tiêu thụ.',
        sourceUrl:
          'https://sonlatv.vn/mo-hinh-trong-ngo-ngot-vu-dong-xuan-theo-chuoi-lien-ket-tai-song-ma-19402.html',
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
          'https://baochinhphu.vn/xay-dung-chuoi-nganh-hang-ca-phe-viet-nam-chat-luong-cao-102230312155540856.htm',
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
        context: 'Đơn Dương là vùng canh tác cà chua của Lâm Đồng.',
        sourceUrl: 'https://nhandan.vn/chua-chat-ca-chua-don-duong-post273925.html',
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
        sourceUrl: 'https://nhandan.vn/mo-huong-cho-chuoi-tuoi-xuat-ngoai-post742535.html',
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
          'Nho Ninh Thuận được bảo hộ chỉ dẫn địa lý, gồm vùng trồng tại Ninh Phước và Thuận Nam theo bài viết của TTXVN.',
        sourceUrl:
          'https://www.vietnamplus.vn/cong-bo-chi-dan-dia-ly-cho-san-pham-nho-ninh-thuan-post135387.vnp',
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
        context: 'Các địa phương Đồng bằng sông Cửu Long phát triển canh tác lúa bền vững.',
        sourceUrl:
          'https://baochinhphu.vn/cong-nghe-so-mo-duong-cho-canh-tac-lua-ben-vung-tai-dong-bang-song-cuu-long-102251023172321188.htm',
      },
      {
        plantId: 'mango',
        locality: 'Cao Lãnh, Đồng Tháp',
        context: 'Cao Lãnh gắn với vùng xoài cát chu và vườn xoài địa phương.',
        sourceUrl:
          'https://www.vietnamplus.vn/san-pham-xoai-cao-lanh-chinh-thuc-co-thuong-hieu-post177670.vnp',
      },
      {
        plantId: 'chili',
        locality: 'Thanh Bình, Đồng Tháp',
        context: 'Thanh Bình là vùng trồng ớt được nghiên cứu trong chuỗi giá trị ớt Đồng Tháp.',
        sourceUrl: 'https://ctujsvn.ctu.edu.vn/index.php/ctujsvn/article/view/1981',
      },
      {
        plantId: 'pomelo',
        locality: 'Vùng Bến Tre',
        context: 'Bến Tre phát triển vùng trồng bưởi da xanh phục vụ xuất khẩu.',
        sourceUrl:
          'https://www.vietnamplus.vn/buoi-da-xanh-cua-ben-tre-san-sang-vuon-minh-ra-bien-lon-post832614.vnp',
      },
      {
        plantId: 'watermelon',
        locality: 'Gò Công Đông',
        context: 'Gò Công Đông có vùng trồng dưa hấu gắn với phát triển nhãn hiệu Dưa hấu Gò Công.',
        sourceUrl:
          'https://baodongthap.vn/xay-dung-phat-trien-nhan-hieu-dua-hau-go-cong-a52097.html',
      },
    ],
  },
];
