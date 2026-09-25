import { Plant, Disease } from '../types';

export const CORE_PLANT_IDS = ['rice', 'tomato', 'corn', 'potato', 'chili', 'coffee', 'tea', 'banana', 'watermelon', 'orange'];

export const SUPPORTED_PLANTS: Plant[] = [
  {
    id: 'coffee',
    name: 'Cà phê',
    scientificName: 'Coffea arabica / canephora',
    category: 'Cây công nghiệp',
    description: 'Cây công nghiệp lâu năm có giá trị kinh tế cao, thường mẫn cảm với các nấm bệnh hại lá làm rụng lá sớm và giảm sút năng suất nhân cà phê.',
    imageUrl: '/images/vietnam-coffee-plant.png',
    detectableCount: 4,
    conditions: [
      {
        id: 'coffee-leaf-rust',
        name: 'Bệnh rỉ sắt',
        scientificName: 'Hemileia vastatrix',
        shortDescription: 'Đốm bột màu vàng cam ở mặt dưới lá, gây cháy khô và rụng lá hàng loạt.',
        imageUrl: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'coffee-brown-spot',
        name: 'Bệnh đốm mắt cua',
        scientificName: 'Cercospora coffeicola',
        shortDescription: 'Vết bệnh hình tròn đồng tâm màu nâu xám viền nâu đậm xung quanh.',
        imageUrl: 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'coffee-leaf-miner',
        name: 'Tổn thương sâu vẽ bùa',
        scientificName: 'Leucoptera coffeella',
        shortDescription: 'Đường hầm ngoằn ngoèo màu trắng bạc và mảng hoại tử khô cháy trên phiến lá.',
        imageUrl: 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'coffee-healthy',
        name: 'Lá khỏe mạnh',
        shortDescription: 'Phiến lá xanh mướt, bóng loáng, không xuất hiện đốm hoại tử hay bào tử nấm.',
        imageUrl: 'https://images.unsplash.com/photo-1524350876685-274059332603?auto=format&fit=crop&w=600&q=80',
        isHealthy: true,
      }
    ]
  },
  {
    id: 'tomato',
    name: 'Cà chua',
    scientificName: 'Solanum lycopersicum',
    category: 'Cây lương thực',
    description: 'Cây hoa màu ngắn ngày rất dễ nhiễm các loại bệnh sương mai, đốm vòng và đốm vi khuẩn lây lan nhanh trong điều kiện ẩm ướt.',
    imageUrl: '/images/vietnam-tomato-plant.png',
    detectableCount: 5,
    conditions: [
      {
        id: 'tomato-early-blight',
        name: 'Bệnh đốm vòng (Mốc sương sớm)',
        scientificName: 'Alternaria solani',
        shortDescription: 'Đốm nâu đen có vân vòng đồng tâm giống bia bắn, xung quanh có quầng vàng.',
        imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d69102353?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'tomato-late-blight',
        name: 'Bệnh mốc sương (Sương mai)',
        scientificName: 'Phytophthora infestans',
        shortDescription: 'Vết ủng nước màu xanh xám nhanh chóng thâm đen, mép dưới lá có lớp mốc trắng khi ẩm.',
        imageUrl: 'https://images.unsplash.com/photo-1591857177580-dc82b9ac4e1e?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'tomato-bacterial-spot',
        name: 'Bệnh đốm vi khuẩn',
        scientificName: 'Xanthomonas campestris pv. vesicatoria',
        shortDescription: 'Vết đốm nhỏ góc cạnh ủng nước chuyển sang nâu đen bao quanh bởi quầng vàng nhạt.',
        imageUrl: 'https://images.unsplash.com/photo-1563714193259-25597793d56a?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'tomato-leaf-mold',
        name: 'Bệnh mốc lá',
        scientificName: 'Passalora fulva',
        shortDescription: 'Mặt trên lá có đốm vàng lợt, mặt dưới phủ lớp nấm mịn màu xanh ô-liu.',
        imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'tomato-healthy',
        name: 'Lá khỏe mạnh',
        shortDescription: 'Tán lá kép xanh tươi tốt, lông tơ phát triển đều, phiến lá dày và đàn hồi tốt.',
        imageUrl: 'https://images.unsplash.com/photo-1582284540020-8acbe03f4924?auto=format&fit=crop&w=600&q=80',
        isHealthy: true,
      }
    ]
  },
  {
    id: 'rice',
    name: 'Lúa nước',
    scientificName: 'Oryza sativa',
    category: 'Cây lương thực',
    description: 'Cây lương thực chủ lực của nông nghiệp Việt Nam, đối mặt với các đe dọa nghiêm trọng từ bệnh đạo ôn, cháy bìa lá và đốm sọc.',
    imageUrl: '/images/vietnam-rice-leaves.png',
    detectableCount: 4,
    conditions: [
      {
        id: 'rice-blast',
        name: 'Bệnh đạo ôn lá',
        scientificName: 'Magnaporthe oryzae',
        shortDescription: 'Vết bệnh hình thoi (mắt én), tâm xám trắng viền nâu đậm, gây thắt cổ bông và cháy rụi lá.',
        imageUrl: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'rice-bacterial-blight',
        name: 'Bệnh cháy bìa lá (Bạc lá)',
        scientificName: 'Xanthomonas oryzae pv. oryzae',
        shortDescription: 'Vệt cháy dọc theo mép phiến lá từ chóp xuống màu vàng xám có giọt dịch vi khuẩn.',
        imageUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'rice-brown-spot',
        name: 'Bệnh đốm nâu',
        scientificName: 'Bipolaris oryzae',
        shortDescription: 'Đốm tròn hoặc bầu dục màu nâu sẫm phân bố đều khắp mặt lá, thường xuất hiện trên đất nghèo dinh dưỡng.',
        imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'rice-tungro',
        name: 'Bệnh vàng lùn Tungro',
        shortDescription: 'Lá có thể chuyển vàng cam, cây sinh trưởng chậm và thấp hơn bình thường.',
      },
      {
        id: 'rice-healthy',
        name: 'Lá khỏe mạnh',
        shortDescription: 'Lá lúa thẳng đứng, xanh mướt tự nhiên, không có đốm rỉ hay sọc bạc mép lá.',
        imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=600&q=80',
        isHealthy: true,
      }
    ]
  },
  {
    id: 'corn',
    name: 'Bắp (Ngô)',
    scientificName: 'Zea mays',
    category: 'Cây lương thực',
    description: 'Cây trồng vụ mùa có diện tích lớn, chịu tác động nặng từ bệnh gỉ sắt ngô và đốm lá lớn làm suy giảm khả năng quang hợp.',
    imageUrl: '/images/vietnam-corn-plant.png',
    detectableCount: 4,
    conditions: [
      {
        id: 'corn-common-rust',
        name: 'Bệnh rỉ sắt ngô',
        scientificName: 'Puccinia sorghi',
        shortDescription: 'Các mụn rộp nhỏ li ti màu nâu đỏ gồ ghề chứa đầy bụi phấn bào tử nấm.',
        imageUrl: 'https://images.unsplash.com/photo-1601600576337-c1d8a0d1373c?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'corn-northern-leaf-blight',
        name: 'Bệnh đốm lá lớn',
        scientificName: 'Exserohilum turcicum',
        shortDescription: 'Vết bệnh dài hình thoi hoặc điếu xì gà màu xám tro lan dọc theo gân lá.',
        imageUrl: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'corn-cercospora-leaf-spot',
        name: 'Bệnh đốm lá xám',
        scientificName: 'Cercospora zeae-maydis',
        shortDescription: 'Các vệt tổn thương hình chữ nhật góc cạnh hẹp bị giới hạn giữa các gân phụ.',
        imageUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'corn-healthy',
        name: 'Lá khỏe mạnh',
        shortDescription: 'Phiến lá bản rộng, màu xanh đậm óng ả, gân giữa vững chãi và sạch bệnh.',
        imageUrl: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=600&q=80',
        isHealthy: true,
      }
    ]
  },
  {
    id: 'orange',
    name: 'Cam sành (Cây có múi)',
    scientificName: 'Citrus × sinensis',
    category: 'Cây ăn trái',
    description: 'Cây ăn trái chủ lực tại các vùng chuyên canh đồng bằng sông Cửu Long và miền núi, thường bị bệnh loét sẹo và bệnh vàng lá gân xanh đe dọa.',
    imageUrl: '/images/vietnam-citrus-plant.png',
    detectableCount: 4,
    conditions: [
      {
        id: 'citrus-canker',
        name: 'Bệnh loét sẹo cam',
        scientificName: 'Xanthomonas axonopodis pv. citri',
        shortDescription: 'Vết loét xốp sần sùi màu nâu nhô lên như miệng núi lửa, bao quanh bởi quầng vàng.',
        imageUrl: 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'citrus-greening',
        name: 'Bệnh vàng lá gân xanh (HLB)',
        scientificName: 'Candidatus Liberibacter asiaticus',
        shortDescription: 'Lá vàng lốm đốm không đối xứng, phiến lá nhỏ giòn dựng đứng, gân lá sưng sần sùi.',
        imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'citrus-black-spot',
        name: 'Bệnh đốm đen cam',
        scientificName: 'Phyllosticta citricarpa',
        shortDescription: 'Đốm tròn lõm màu nâu sẫm viền đen với tâm màu xám sáng rải rác trên bề mặt.',
        imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d69102353?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'citrus-healthy',
        name: 'Lá khỏe mạnh',
        shortDescription: 'Lá cam xanh thẫm, láng bóng, cánh lá nguyên vẹn và giàu tinh dầu thơm tự nhiên.',
        imageUrl: 'https://images.unsplash.com/photo-1582979512210-99b6a53386f9?auto=format&fit=crop&w=600&q=80',
        isHealthy: true,
      }
    ]
  },
  {
    id: 'mango',
    name: 'Xoài',
    scientificName: 'Mangifera indica',
    category: 'Cây ăn trái',
    description: 'Cây ăn trái nhiệt đới phổ biến, cực kỳ nhạy cảm với bệnh thán thư vào mùa mưa gây rụng hoa và cháy sạm mép lá non.',
    imageUrl: '/images/vietnam-mango-plant.png',
    detectableCount: 3,
    conditions: [
      {
        id: 'mango-anthracnose',
        name: 'Bệnh thán thư xoài',
        scientificName: 'Colletotrichum gloeosporioides',
        shortDescription: 'Đốm nâu đen bất định lan rộng làm mép lá xoăn queo, rách nát và cháy rụi chồi non.',
        imageUrl: 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'mango-bacterial-canker',
        name: 'Bệnh loét vi khuẩn xoài',
        scientificName: 'Xanthomonas citri pv. mangiferaeindicae',
        shortDescription: 'Vết tổn thương góc cạnh màu đen ứa giọt dịch gôm nâu đậm theo gân lá.',
        imageUrl: 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'mango-healthy',
        name: 'Lá khỏe mạnh',
        shortDescription: 'Tán lá xoài thon dài, màu xanh đậm dai chắc và mép lá gợn sóng đều đặn.',
        imageUrl: '/images/vietnam-mango-plant.png',
        isHealthy: true,
      }
    ]
  },
  {
    id: 'chili',
    name: 'Ớt hiểm / Ớt chỉ thiên',
    scientificName: 'Capsicum annuum',
    category: 'Cây lương thực',
    description: 'Cây gia vị giá trị cao, thường bị tấn công bởi bệnh thán thư và khảm lá virus làm xoăn ngọn còi cọc.',
    imageUrl: '/images/vietnam-chili-plant.png',
    detectableCount: 3,
    conditions: [
      {
        id: 'chili-anthracnose',
        name: 'Bệnh thán thư ớt',
        scientificName: 'Colletotrichum capsici',
        shortDescription: 'Vết đốm hình tròn hoặc bầu dục lõm xuống có các vòng tròn đồng tâm chứa bào tử nấm.',
        imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d69102353?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'chili-leaf-curl-virus',
        name: 'Bệnh xoăn lá do virus (Begomovirus)',
        scientificName: 'Chilli leaf curl virus',
        shortDescription: 'Lá xoăn tít cuộn ngược lên trên, gân lá dày lên, lóng thân ngắn lại và cây biến dạng lùn.',
        imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'chili-bacterial-spot',
        name: 'Bệnh đốm vi khuẩn',
        shortDescription: 'Đốm nhỏ sẫm màu trên lá có thể lan rộng trong điều kiện ẩm.',
      },
      {
        id: 'chili-healthy',
        name: 'Lá khỏe mạnh',
        shortDescription: 'Lá ớt phẳng phiu, xanh bóng đều đặn, không có biểu hiện xoăn đọt hay đốm cháy.',
        imageUrl: '/images/vietnam-chili-plant.png',
        isHealthy: true,
      }
    ]
  },
  {
    id: 'tea',
    name: 'Chè (Trà)',
    scientificName: 'Camellia sinensis',
    category: 'Cây công nghiệp',
    description: 'Cây công nghiệp đặc thù của vùng cao nguyên và trung du Bắc Bộ, thường bị đốm mắt cua và phồng lá chè làm giảm phẩm cấp búp.',
    imageUrl: '/images/vietnam-tea-plant.png',
    detectableCount: 3,
    conditions: [
      {
        id: 'tea-brown-blight',
        name: 'Bệnh chấm xám chè (Thán thư chè)',
        scientificName: 'Colletotrichum camelliae',
        shortDescription: 'Vết bệnh lan từ mép lá hoặc chóp lá vào, màu xám tro có vân viền gợn sóng.',
        imageUrl: 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'tea-blister-blight',
        name: 'Bệnh phồng lá chè',
        scientificName: 'Exobasidium vexans',
        shortDescription: 'Vết bệnh phồng rộp lên lõm ở mặt trên, mặt dưới lồi ra phủ lớp phấn trắng xốp mịn.',
        imageUrl: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'tea-algal-spot',
        name: 'Bệnh đốm rong',
        shortDescription: 'Đốm tròn màu cam hoặc nâu gạch có thể xuất hiện trên lá già.',
      },
      {
        id: 'tea-red-spider',
        name: 'Tổn thương do nhện đỏ',
        shortDescription: 'Lá có thể xuất hiện chấm nhỏ vàng nâu và xỉn màu khi bị nhện đỏ gây hại.',
      },
      {
        id: 'tea-birds-eye-spot',
        name: 'Bệnh đốm mắt cua',
        shortDescription: 'Vết đốm nhỏ có tâm sáng và viền sẫm trên phiến lá.',
      },
      {
        id: 'tea-healthy',
        name: 'Búp chè khỏe mạnh',
        shortDescription: 'Búp và lá non màu xanh mạ nõn chuối, răng cưa đều đặn, phủ lớp lông tơ mịn đặc trưng.',
        imageUrl: '/images/vietnam-tea-plant.png',
        isHealthy: true,
      }
    ]
  },
  {
    id: 'durian',
    name: 'Sầu riêng',
    scientificName: 'Durio zibethinus',
    category: 'Cây ăn trái',
    description: 'Cây ăn trái có giá trị xuất khẩu rất cao, cực kỳ mẫn cảm với nấm Phytophthora gây thối thân xì mủ và cháy lá hàng loạt.',
    imageUrl: '/images/vietnam-durian-plant.png',
    detectableCount: 3,
    conditions: [
      {
        id: 'durian-leaf-blight',
        name: 'Bệnh cháy lá chết đọt sầu riêng',
        scientificName: 'Rhizoctonia solani',
        shortDescription: 'Các mảng cháy lớn như bị luộc nước sôi màu nâu xám, các lá dính liền nhau bằng sợi tơ nấm.',
        imageUrl: 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'durian-algal-spot',
        name: 'Bệnh đốm rong sầu riêng',
        scientificName: 'Cephaleuros virescens',
        shortDescription: 'Các đốm tròn nhung màu cam gạch rỉ sắt mọc nhô lên trên bề mặt phiến lá già.',
        imageUrl: 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'durian-healthy',
        name: 'Lá sầu riêng khỏe mạnh',
        shortDescription: 'Lá dày cứng cáp, mặt trên xanh bóng đậm, mặt dưới có ánh màu vàng đồng đặc trưng.',
        imageUrl: '/images/vietnam-durian-plant.png',
        isHealthy: true,
      }
    ]
  },
  {
    id: 'pomelo',
    name: 'Bưởi da xanh',
    scientificName: 'Citrus maxima',
    category: 'Cây ăn trái',
    description: 'Cây đặc sản xuất khẩu trọng điểm, thường bị bệnh loét vi khuẩn và nhện đỏ gây rám lá suy giảm khả năng quang hợp.',
    imageUrl: '/images/vietnam-pomelo-plant.png',
    detectableCount: 3,
    conditions: [
      {
        id: 'pomelo-canker',
        name: 'Bệnh loét vi khuẩn bưởi',
        scientificName: 'Xanthomonas axonopodis pv. citri',
        shortDescription: 'Vết loét màu nâu nổi gờ sần sùi có quầng vàng trong suốt bao quanh trên phiến lá và cuống lá.',
        imageUrl: 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'pomelo-sooty-mold',
        name: 'Bệnh bồ hóng (Nấm muội đen)',
        scientificName: 'Capnodium citri',
        shortDescription: 'Màng muội đen như bồ hóng phủ kín mặt lá cản trở quang hợp, phát sinh từ dịch bài tiết của rầy rệp.',
        imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'pomelo-healthy',
        name: 'Lá bưởi khỏe mạnh',
        shortDescription: 'Lá to bản dày dặn, eo lá cánh bướm nở đều, phiến lá xanh thẫm không tì vết.',
        imageUrl: '/images/vietnam-pomelo-plant.png',
        isHealthy: true,
      }
    ]
  },
  {
    id: 'potato',
    name: 'Khoai tây',
    scientificName: 'Solanum tuberosum',
    category: 'Cây lương thực',
    description: 'Lá khoai tây dạng kép với nhiều lá chét. Thư viện giới thiệu những dấu hiệu đốm vòng và mốc sương thường được quan sát trên lá.',
    imageUrl: '/images/vietnam-potato-plant.png',
    detectableCount: 2,
    conditions: [
      {
        id: 'potato-early-blight',
        name: 'Bệnh đốm vòng',
        scientificName: 'Alternaria solani',
        shortDescription: 'Vết nâu có những vòng đồng tâm, thường xuất hiện trên lá già.',
      },
      {
        id: 'potato-late-blight',
        name: 'Bệnh mốc sương',
        scientificName: 'Phytophthora infestans',
        shortDescription: 'Vùng lá úng nước có thể chuyển nâu và lan nhanh khi thời tiết ẩm.',
      },
      {
        id: 'potato-healthy',
        name: 'Lá khỏe mạnh',
        shortDescription: 'Các lá chét xanh đều, không có vùng úng nước hay đốm nâu.',
        imageUrl: '/images/vietnam-potato-plant.png',
        isHealthy: true,
      },
    ],
  },
  {
    id: 'banana',
    name: 'Chuối',
    scientificName: 'Musa spp.',
    category: 'Cây ăn trái',
    description: 'Phiến lá chuối lớn, dễ thấy các vệt đổi màu. Tài liệu dự án đưa chuối vào nhóm cây tham khảo với hai dạng đốm lá.',
    imageUrl: '/images/vietnam-banana-plant.png',
    detectableCount: 2,
    conditions: [
      {
        id: 'banana-sigatoka',
        name: 'Bệnh đốm lá Sigatoka',
        scientificName: 'Pseudocercospora spp.',
        shortDescription: 'Các vệt và đốm lá kéo dài, đổi từ vàng sang nâu khi phát triển.',
      },
      {
        id: 'banana-leaf-speckle',
        name: 'Bệnh đốm li ti trên lá',
        shortDescription: 'Nhiều chấm nhỏ sẫm màu xuất hiện trên bề mặt phiến lá.',
      },
      {
        id: 'banana-healthy',
        name: 'Lá khỏe mạnh',
        shortDescription: 'Phiến lá xanh, còn nguyên cấu trúc và không có vệt bệnh rõ.',
        imageUrl: '/images/vietnam-banana-plant.png',
        isHealthy: true,
      },
    ],
  },
  {
    id: 'watermelon',
    name: 'Dưa hấu',
    scientificName: 'Citrullus lanatus',
    category: 'Cây ăn trái',
    description: 'Lá dưa hấu chia thùy rõ và phát triển trên dây bò. Danh mục tham khảo hai bệnh lá được nêu trong tài liệu.',
    imageUrl: '/images/vietnam-watermelon-plant.png',
    detectableCount: 2,
    conditions: [
      {
        id: 'watermelon-downy-mildew',
        name: 'Bệnh sương mai',
        scientificName: 'Pseudoperonospora cubensis',
        shortDescription: 'Vết vàng góc cạnh trên mặt lá, về sau có thể chuyển nâu.',
      },
      {
        id: 'watermelon-anthracnose',
        name: 'Bệnh thán thư',
        scientificName: 'Colletotrichum orbiculare',
        shortDescription: 'Đốm nâu trên lá có thể lớn dần và làm khô một phần phiến lá.',
      },
      {
        id: 'watermelon-healthy',
        name: 'Lá khỏe mạnh',
        shortDescription: 'Lá chia thùy xanh đều, không có đốm nâu hay vùng vàng bất thường.',
        imageUrl: '/images/vietnam-watermelon-plant.png',
        isHealthy: true,
      },
    ],
  }
];

export const ALL_DISEASES: Disease[] = [
  {
    id: 'coffee-leaf-rust',
    name: 'Bệnh rỉ sắt cà phê',
    plant: 'Cà phê',
    plantId: 'coffee',
    scientificName: 'Hemileia vastatrix',
    category: 'Nấm',
    status: 'Nghiêm trọng',
    heroImage: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=1200&q=80',
    overview: 'Bệnh rỉ sắt cà phê do nấm Hemileia vastatrix gây ra, là dịch bệnh nguy hiểm hàng đầu trên cây cà phê toàn cầu. Bệnh xâm nhiễm qua khí khổng mặt dưới lá, phá hủy chất diệp lục và khiến cây rụng lá hàng loạt trước mùa thu hoạch, làm sụt giảm năng suất từ 30% đến 80% nếu không được can thiệp kịp thời.',
    symptoms: [
      'Xuất hiện các đốm nhỏ màu vàng nhạt li ti ở mặt dưới của phiến lá già.',
      'Vết bệnh nhanh chóng mở rộng thành các ổ bột phấn màu vàng cam đậm chứa đầy bào tử hạ.',
      'Mặt trên tương ứng của lá chuyển sang màu nâu đen khô khốc.',
      'Lá bị bệnh nặng rụng sớm trơ cành, làm cành bị khô khô quả và chết cây dần dần.'
    ],
    visualCharacteristics: [
      'Bột phấn màu vàng nghệ đặc trưng ở mặt dưới phiến lá.',
      'Khu vực hoại tử khô cháy ở trung tâm vết bệnh cũ.',
      'Viền vàng lan tỏa ranh giới giữa mô bệnh và mô khỏe mạnh.'
    ],
    causes: [
      'Độ ẩm không khí cao trên 85% và giọt nước đọng trên lá trên 6-12 giờ.',
      'Nhiệt độ thích hợp trong khoảng 21°C - 25°C vào đầu mùa mưa.',
      'Vườn cà phê rậm rạp, thiếu ánh sáng thông thoáng hoặc bón thừa đạm thiếu kali.'
    ],
    affectedPlants: ['Cà phê Arabica (Chè)', 'Cà phê Robusta (Vối)', 'Cà phê Catimor'],
    prevention: [
      'Tỉa cành tạo tán thông thoáng định kỳ sau vụ thu hoạch.',
      'Sử dụng các giống cà phê lai kháng rỉ sắt đã được kiểm nghiệm (như TRS1, THA1).',
      'Bón phân cân đối N-P-K kết hợp bổ sung phân hữu cơ vi sinh và vôi khử chua đất.'
    ],
    management: [
      'Phun phòng ngừa gốc đồng (Copper oxychloride, Bordeaux) vào đầu mùa mưa khi bệnh chớm xuất hiện.',
      'Sử dụng các hoạt chất trừ nấm nội hấp nhóm triazole (như Hexaconazole, Epoxiconazole, Difenoconazole) khi tỷ lệ lá nhiễm bệnh vượt quá 5%.',
      'Thu gom và tiêu hủy lá rụng dưới gốc cây để triệt tiêu nguồn lây lan bào tử nấm.'
    ]
  },
  {
    id: 'tomato-early-blight',
    name: 'Bệnh đốm vòng cà chua (Mốc sương sớm)',
    plant: 'Cà chua',
    plantId: 'tomato',
    scientificName: 'Alternaria solani',
    category: 'Nấm',
    status: 'Phổ biến',
    heroImage: 'https://images.unsplash.com/photo-1592417817098-8f3d69102353?auto=format&fit=crop&w=1200&q=80',
    overview: 'Bệnh đốm vòng là bệnh nấm hoại sinh phổ biến trên cây họ cà. Bệnh thường khởi phát từ các lá già phía dưới gốc rồi lan dần lên trên ngọn, làm lá khô cháy xơ xác và giảm nghiêm trọng quang hợp cũng như phẩm chất quả.',
    symptoms: [
      'Các đốm tròn màu nâu sẫm đến đen xuất hiện trước tiên trên các lá sát mặt đất.',
      'Vết bệnh có các vòng đồng tâm đặc trưng như hình bia bắn mũi tên.',
      'Xung quanh vết đốm xuất hiện quầng vàng do độc tố của nấm tiết ra.',
      'Lá nhiễm nặng chuyển sang vàng rụi, cong queo và rụng sớm.'
    ],
    visualCharacteristics: [
      'Vân tròn đồng tâm xếp lớp rõ rệt trong tâm vết hoại tử.',
      'Quầng vàng sắc nét bao quanh mép đốm hoại tử.',
      'Khởi phát chủ yếu từ tầng lá già gốc cây.'
    ],
    causes: [
      'Thời tiết ấm áp (24°C - 29°C) kèm theo các đợt mưa rào ngắt quãng và sương đêm nhiều.',
      'Tưới nước bắn từ mặt đất mang theo bào tử nấm lưu tồn lên bề mặt phiến lá.',
      'Đất trồng bị thoái hóa, canh tác liên tục các cây họ cà mà không luân canh.'
    ],
    affectedPlants: ['Cà chua', 'Khoai tây', 'Cà tím', 'Ớt chuông'],
    prevention: [
      'Phủ màng nông nghiệp giữ ẩm và ngăn ngừa nước bắn từ đất lên lá.',
      'Vặt bỏ các lá già sát đất để gốc cây thông thoáng ánh sáng.',
      'Luân canh với cây họ hòa thảo hoặc cây họ đậu ít nhất 2 vụ.'
    ],
    management: [
      'Phun thuốc trừ nấm chứa hoạt chất Azoxystrobin, Chlorothalonil hoặc Mancozeb khi quan sát thấy vết bệnh đầu tiên.',
      'Tưới tiêu nhỏ giọt gốc, tránh tưới phun mưa ướt đẫm lá vào chiều tối.'
    ]
  },
  {
    id: 'rice-blast',
    name: 'Bệnh đạo ôn lúa',
    plant: 'Lúa nước',
    plantId: 'rice',
    scientificName: 'Magnaporthe oryzae',
    category: 'Nấm',
    status: 'Nghiêm trọng',
    heroImage: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=1200&q=80',
    overview: 'Bệnh đạo ôn là bệnh dịch nguy hiểm hàng đầu trong canh tác lúa nước. Nấm có khả năng phá hủy toàn bộ phiến lá (đạo ôn lá) và gây thắt gãy cuống bông (đạo ôn cổ bông), dẫn đến nguy cơ mất trắng năng suất trong các vụ lúa đông xuân và hè thu.',
    symptoms: [
      'Đốm chấm kim màu xám nhạt lúc đầu xuất hiện trên phiến lá lúa non.',
      'Vết bệnh phát triển thành hình thoi đặc trưng (mắt én), tâm xám tro viền nâu đỏ.',
      'Nhiều vết bệnh liên kết lại thành vệt lớn làm toàn bộ lá lúa khô cháy sụp mặt ruộng.',
      'Bệnh tấn công lên cổ bông làm bông lúa bạc trắng, hạt lép lửng.'
    ],
    visualCharacteristics: [
      'Vết hoại tử hình thoi nhọn hai đầu giống mắt én.',
      'Tâm vết bệnh màu xám trắng bạc viền nâu sẫm.',
      'Các mảng lá cháy vàng rực dọc theo ruộng lúa khi dịch bùng phát.'
    ],
    causes: [
      'Nhiệt độ mát 20°C - 26°C kết hợp sương mù dầy đặc và độ ẩm bão hòa.',
      'Sạ lúa quá dày và bón thừa phân đạm vô cơ làm lá lúa lướt mềm, yếu ớt.'
    ],
    affectedPlants: ['Lúa nước', 'Lúa cạn', 'Cỏ lồng vực'],
    prevention: [
      'Sạ thưa hợp lý (80 - 100 kg/ha), áp dụng kỹ thuật 1 phải 5 giảm.',
      'Bón phân cân đối, ngưng bón đạm ngay khi thời tiết âm u có sương mù kéo dài.',
      'Sử dụng giống lúa kháng đạo ôn theo khuyến cáo của Chi cục Trồng trọt & BVTV địa phương.'
    ],
    management: [
      'Phun trừ sớm khi vết bệnh còn ở dạng chấm kim bằng Tricyclazole, Isoprothiolane hoặc Fenoxanil.',
      'Giữ mực nước ruộng ổn định 3-5 cm, không để ruộng bị khô hạn nứt nẻ.'
    ]
  },
  {
    id: 'citrus-canker',
    name: 'Bệnh loét cam quýt (Loét sẹo)',
    plant: 'Cam sành (Cây có múi)',
    plantId: 'orange',
    scientificName: 'Xanthomonas axonopodis pv. citri',
    category: 'Vi khuẩn',
    status: 'Nghiêm trọng',
    heroImage: 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?auto=format&fit=crop&w=1200&q=80',
    overview: 'Bệnh loét cam quýt do vi khuẩn Xanthomonas xâm nhiễm qua các vết thương cơ giới hoặc vết chích hút của sâu vẽ bùa. Bệnh làm sần sùi chai cứng lá, cành non và quả, gây rụng quả hàng loạt và làm mất giá trị thương phẩm xuất khẩu.',
    symptoms: [
      'Đốm nhỏ ủng nước màu vàng xuất hiện trên cả hai mặt phiến lá non.',
      'Vết bệnh gồ lên thành các nốt sần xốp màu nâu như miệng núi lửa.',
      'Bao quanh vết loét là quầng màu vàng tươi rõ nét.',
      'Lá biến dạng gồ ghề, cành non nứt nẻ và quả bị sẹo đen chai sần.'
    ],
    visualCharacteristics: [
      'Bề mặt nốt bệnh xù xì, lõm ở giữa như miệng núi lửa thu nhỏ.',
      'Quầng vàng quang hóa rõ rệt bao bọc lấy gờ sẹo nâu.',
      'Thường xuất hiện đi kèm với các đường ngoằn ngoèo của sâu vẽ bùa.'
    ],
    causes: [
      'Mưa to gió lớn làm rách biểu bì lá tạo điều kiện cho vi khuẩn xâm nhập.',
      'Sâu vẽ bùa phát triển mạnh đục khoét lớp biểu bì tạo vết thương hở.',
      'Nhiệt độ nóng ẩm cao từ 28°C - 35°C.'
    ],
    affectedPlants: ['Cam sành', 'Bưởi da xanh', 'Chanh', 'Quýt đường'],
    prevention: [
      'Phòng trừ triệt để sâu vẽ bùa ở các đợt lộc non mới nhú.',
      'Trồng đai cây chắn gió quanh vườn để giảm rách lá trong mùa bão.',
      'Khử trùng kéo tỉa cành bằng cồn hoặc nước vôi trước khi cắt tỉa sang cây khác.'
    ],
    management: [
      'Phun thuốc gốc đồng định kỳ (Copper Hydroxide, Đồng đỏ) bảo vệ các cơi đọt non.',
      'Sử dụng các kháng sinh nông nghiệp như Kasugamycin hoặc Bismerthiazol khi bệnh lây lan mạnh.'
    ]
  },
  {
    id: 'mango-anthracnose',
    name: 'Bệnh thán thư xoài',
    plant: 'Xoài',
    plantId: 'mango',
    scientificName: 'Colletotrichum gloeosporioides',
    category: 'Nấm',
    status: 'Nghiêm trọng',
    heroImage: 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&w=1200&q=80',
    overview: 'Bệnh thán thư là bệnh hại phổ biến nhất trên xoài tại các vùng nhiệt đới. Bệnh có thể tấn công lên tất cả các bộ phận non như đọt, lá, hoa và quả, gây hiện tượng đen bông rụng quả non và thối hỏng quả sau thu hoạch.',
    symptoms: [
      'Đốm nâu nhỏ góc cạnh li ti trên lá non, sau lan rộng thành mảng cháy lớn màu nâu đen.',
      'Mép lá bị co rút quăn queo, phần mô khô dễ bị rách nát thủng lỗ chỗ.',
      'Chùm hoa xoài bị đen khô rụng sạch cuống.',
      'Vỏ quả non xuất hiện đốm đen tròn lõm sâu có giọt dịch gôm ứa ra.'
    ],
    visualCharacteristics: [
      'Mảng cháy lớn không định hình với rìa răng cưa rách nát.',
      'Màu nâu xám đen khô giòn trên biểu bì lá non.',
      'Các chấm đen nhỏ li ti là ổ bào tử nấm xếp vòng tròn khi độ ẩm cao.'
    ],
    causes: [
      'Mưa nhiều kéo dài trong giai đoạn xoài ra đọt non và trổ bông.',
      'Vườn cây um tùm rậm rạp, ẩm độ cao thiếu ánh sáng mặt trời.',
      'Bào tử nấm phát tán dễ dàng nhờ giọt nước mưa và gió bão.'
    ],
    affectedPlants: ['Xoài', 'Bơ', 'Đu đủ', 'Ổi'],
    prevention: [
      'Cắt tỉa cành thông thoáng sau thu hoạch để ánh sáng chiếu xuyên qua tán cây.',
      'Bao quả bằng túi chuyên dụng khi quả xoài đạt kích thước bằng ngón chân cái.',
      'Phun phòng ngừa trước và sau các đợt trổ hoa nở rộ.'
    ],
    management: [
      'Sử dụng thuốc trừ nấm có hoạt chất Difenoconazole, Azoxystrobin, Propineb hoặc Mancozeb.',
      'Xử lý nhiệt cho quả sau thu hoạch bằng nước nóng 52°C trong 5-10 phút để tiêu diệt mầm nấm tiềm ẩn.'
    ]
  }
];
