/**
 * ============================================
 * 中国行政区坐标数据
 * ============================================
 *
 * 包含省、直辖市、主要城市坐标信息
 * 坐标格式：[经度, 纬度]
 */

export interface Region {
  name: string;
  pinyin: string;
  coord: [number, number]; // [经度, 纬度]
  zoom?: number; // 建议缩放级别
  type: "province" | "city" | "district";
}

// 省级（含直辖市、自治区）
export const provinces: Region[] = [
  // 直辖市
  { name: "北京", pinyin: "beijing", coord: [116.4074, 39.9042], zoom: 11, type: "province" },
  { name: "上海", pinyin: "shanghai", coord: [121.4737, 31.2304], zoom: 11, type: "province" },
  { name: "天津", pinyin: "tianjin", coord: [117.1901, 39.1255], zoom: 11, type: "province" },
  { name: "重庆", pinyin: "chongqing", coord: [106.5516, 29.563], zoom: 11, type: "province" },

  // 省会及自治区首府
  { name: "广东", pinyin: "guangdong", coord: [113.2644, 23.1291], zoom: 8, type: "province" },
  { name: "广州", pinyin: "guangzhou", coord: [113.2644, 23.1291], zoom: 11, type: "city" },
  { name: "深圳", pinyin: "shenzhen", coord: [114.0579, 22.5431], zoom: 11, type: "city" },
  { name: "浙江", pinyin: "zhejiang", coord: [120.1536, 30.2875], zoom: 8, type: "province" },
  { name: "杭州", pinyin: "hangzhou", coord: [120.1536, 30.2875], zoom: 11, type: "city" },
  { name: "宁波", pinyin: "ningbo", coord: [121.544, 29.8683], zoom: 11, type: "city" },
  { name: "江苏", pinyin: "jiangsu", coord: [118.7674, 32.0415], zoom: 8, type: "province" },
  { name: "南京", pinyin: "nanjing", coord: [118.7674, 32.0415], zoom: 11, type: "city" },
  { name: "苏州", pinyin: "suzhou", coord: [120.5853, 31.2994], zoom: 11, type: "city" },
  { name: "四川", pinyin: "sichuan", coord: [104.0657, 30.6595], zoom: 8, type: "province" },
  { name: "成都", pinyin: "chengdu", coord: [104.0657, 30.6595], zoom: 11, type: "city" },
  { name: "湖北", pinyin: "hubei", coord: [114.2986, 30.5844], zoom: 8, type: "province" },
  { name: "武汉", pinyin: "wuhan", coord: [114.2986, 30.5844], zoom: 11, type: "city" },
  { name: "湖南", pinyin: "hunan", coord: [112.9823, 28.1942], zoom: 8, type: "province" },
  { name: "长沙", pinyin: "changsha", coord: [112.9823, 28.1942], zoom: 11, type: "city" },
  { name: "河南", pinyin: "henan", coord: [113.6254, 34.7466], zoom: 8, type: "province" },
  { name: "郑州", pinyin: "zhengzhou", coord: [113.6254, 34.7466], zoom: 11, type: "city" },
  { name: "山东", pinyin: "shandong", coord: [117.0009, 36.6758], zoom: 8, type: "province" },
  { name: "济南", pinyin: "jinan", coord: [117.0009, 36.6758], zoom: 11, type: "city" },
  { name: "青岛", pinyin: "qingdao", coord: [120.3826, 36.0671], zoom: 11, type: "city" },
  { name: "福建", pinyin: "fujian", coord: [119.3062, 26.0753], zoom: 8, type: "province" },
  { name: "福州", pinyin: "fuzhou", coord: [119.3062, 26.0753], zoom: 11, type: "city" },
  { name: "厦门", pinyin: "xiamen", coord: [118.0894, 24.4798], zoom: 11, type: "city" },
  { name: "陕西", pinyin: "shaanxi", coord: [108.9402, 34.3416], zoom: 8, type: "province" },
  { name: "西安", pinyin: "xian", coord: [108.9402, 34.3416], zoom: 11, type: "city" },
  { name: "辽宁", pinyin: "liaoning", coord: [123.4291, 41.7968], zoom: 8, type: "province" },
  { name: "沈阳", pinyin: "shenyang", coord: [123.4291, 41.7968], zoom: 11, type: "city" },
  { name: "大连", pinyin: "dalian", coord: [121.6147, 38.914], zoom: 11, type: "city" },
  { name: "黑龙江", pinyin: "heilongjiang", coord: [126.6424, 45.7569], zoom: 8, type: "province" },
  { name: "哈尔滨", pinyin: "haerbin", coord: [126.6424, 45.7569], zoom: 11, type: "city" },
  { name: "吉林", pinyin: "jilin", coord: [125.3245, 43.8868], zoom: 8, type: "province" },
  { name: "长春", pinyin: "changchun", coord: [125.3245, 43.8868], zoom: 11, type: "city" },
  { name: "安徽", pinyin: "anhui", coord: [117.283, 31.8612], zoom: 8, type: "province" },
  { name: "合肥", pinyin: "hefei", coord: [117.283, 31.8612], zoom: 11, type: "city" },
  { name: "江西", pinyin: "jiangxi", coord: [115.8581, 28.6829], zoom: 8, type: "province" },
  { name: "南昌", pinyin: "nanchang", coord: [115.8581, 28.6829], zoom: 11, type: "city" },
  { name: "河北", pinyin: "hebei", coord: [114.5025, 38.0455], zoom: 8, type: "province" },
  { name: "石家庄", pinyin: "shijiazhuang", coord: [114.5025, 38.0455], zoom: 11, type: "city" },
  { name: "山西", pinyin: "shanxi", coord: [112.5489, 37.8706], zoom: 8, type: "province" },
  { name: "太原", pinyin: "taiyuan", coord: [112.5489, 37.8706], zoom: 11, type: "city" },
  { name: "云南", pinyin: "yunnan", coord: [102.7123, 25.0406], zoom: 8, type: "province" },
  { name: "昆明", pinyin: "kunming", coord: [102.7123, 25.0406], zoom: 11, type: "city" },
  { name: "贵州", pinyin: "guizhou", coord: [106.7135, 26.5783], zoom: 8, type: "province" },
  { name: "贵阳", pinyin: "guiyang", coord: [106.7135, 26.5783], zoom: 11, type: "city" },
  { name: "广西", pinyin: "guangxi", coord: [108.32, 22.824], zoom: 8, type: "province" },
  { name: "南宁", pinyin: "nanning", coord: [108.32, 22.824], zoom: 11, type: "city" },
  { name: "海南", pinyin: "hainan", coord: [110.3312, 20.0311], zoom: 9, type: "province" },
  { name: "海口", pinyin: "haikou", coord: [110.3312, 20.0311], zoom: 11, type: "city" },
  { name: "三亚", pinyin: "sanya", coord: [109.5082, 18.2479], zoom: 11, type: "city" },
  { name: "甘肃", pinyin: "gansu", coord: [103.8343, 36.0611], zoom: 8, type: "province" },
  { name: "兰州", pinyin: "lanzhou", coord: [103.8343, 36.0611], zoom: 11, type: "city" },
  { name: "青海", pinyin: "qinghai", coord: [101.7782, 36.6171], zoom: 7, type: "province" },
  { name: "西宁", pinyin: "xining", coord: [101.7782, 36.6171], zoom: 11, type: "city" },
  { name: "内蒙古", pinyin: "neimenggu", coord: [111.6708, 40.8183], zoom: 7, type: "province" },
  { name: "呼和浩特", pinyin: "huhehaote", coord: [111.6708, 40.8183], zoom: 11, type: "city" },
  { name: "宁夏", pinyin: "ningxia", coord: [106.2586, 38.468], zoom: 8, type: "province" },
  { name: "银川", pinyin: "yinchuan", coord: [106.2586, 38.468], zoom: 11, type: "city" },
  { name: "新疆", pinyin: "xinjiang", coord: [87.6177, 43.7928], zoom: 7, type: "province" },
  { name: "乌鲁木齐", pinyin: "wulumuqi", coord: [87.6177, 43.7928], zoom: 11, type: "city" },
  { name: "西藏", pinyin: "xizang", coord: [91.1322, 29.6601], zoom: 7, type: "province" },
  { name: "拉萨", pinyin: "lasa", coord: [91.1322, 29.6601], zoom: 11, type: "city" },

  // 港澳台
  { name: "香港", pinyin: "xianggang", coord: [114.1694, 22.3193], zoom: 12, type: "city" },
  { name: "澳门", pinyin: "aomen", coord: [113.5439, 22.2006], zoom: 13, type: "city" },
  { name: "台湾", pinyin: "taiwan", coord: [121.5654, 25.033], zoom: 8, type: "province" },
  { name: "台北", pinyin: "taibei", coord: [121.5654, 25.033], zoom: 11, type: "city" },
  { name: "高雄", pinyin: "gaoxiong", coord: [120.3119, 22.6275], zoom: 11, type: "city" },

  // 其他重要城市
  { name: "无锡", pinyin: "wuxi", coord: [120.3119, 31.4912], zoom: 11, type: "city" },
  { name: "东莞", pinyin: "dongguan", coord: [113.7463, 23.0462], zoom: 11, type: "city" },
  { name: "佛山", pinyin: "foshan", coord: [113.1227, 23.0288], zoom: 11, type: "city" },
  { name: "温州", pinyin: "wenzhou", coord: [120.6994, 27.9938], zoom: 11, type: "city" },
  { name: "常州", pinyin: "changzhou", coord: [119.9741, 31.8112], zoom: 11, type: "city" },
  { name: "徐州", pinyin: "xuzhou", coord: [117.2841, 34.2044], zoom: 11, type: "city" },
  { name: "烟台", pinyin: "yantai", coord: [121.4479, 37.4638], zoom: 11, type: "city" },
  { name: "潍坊", pinyin: "weifang", coord: [119.1619, 36.7068], zoom: 11, type: "city" },
  { name: "临沂", pinyin: "linyi", coord: [118.3565, 35.1047], zoom: 11, type: "city" },
  { name: "淄博", pinyin: "zibo", coord: [118.0549, 36.8135], zoom: 11, type: "city" },
  { name: "济宁", pinyin: "jining", coord: [116.5874, 35.4154], zoom: 11, type: "city" },
  { name: "唐山", pinyin: "tangshan", coord: [118.1802, 39.6305], zoom: 11, type: "city" },
  { name: "保定", pinyin: "baoding", coord: [115.4648, 38.8739], zoom: 11, type: "city" },
  { name: "邯郸", pinyin: "handan", coord: [114.5391, 36.6256], zoom: 11, type: "city" },
  { name: "廊坊", pinyin: "langfang", coord: [116.6838, 39.538], zoom: 11, type: "city" },
  { name: "洛阳", pinyin: "luoyang", coord: [112.454, 34.6197], zoom: 11, type: "city" },
  { name: "开封", pinyin: "kaifeng", coord: [114.3076, 35.0837], zoom: 11, type: "city" },
  { name: "南阳", pinyin: "nanyang", coord: [112.5283, 32.9908], zoom: 11, type: "city" },
  { name: "株洲", pinyin: "zhuzhou", coord: [113.134, 27.8274], zoom: 11, type: "city" },
  { name: "湘潭", pinyin: "xiangtan", coord: [112.944, 27.8297], zoom: 11, type: "city" },
  { name: "岳阳", pinyin: "yueyang", coord: [113.1329, 29.3703], zoom: 11, type: "city" },
  { name: "宜昌", pinyin: "yichang", coord: [111.2909, 30.6972], zoom: 11, type: "city" },
  { name: "襄阳", pinyin: "xiangyang", coord: [112.1226, 32.0089], zoom: 11, type: "city" },
  { name: "荆州", pinyin: "jingzhou", coord: [112.2397, 30.3352], zoom: 11, type: "city" },
  { name: "绵阳", pinyin: "mianyang", coord: [104.6794, 31.4678], zoom: 11, type: "city" },
  { name: "德阳", pinyin: "deyang", coord: [104.3984, 31.1279], zoom: 11, type: "city" },
  { name: "宜宾", pinyin: "yibin", coord: [104.6434, 28.7532], zoom: 11, type: "city" },
  { name: "泸州", pinyin: "luzhou", coord: [105.4434, 28.8891], zoom: 11, type: "city" },
  { name: "桂林", pinyin: "guilin", coord: [110.1799, 25.2345], zoom: 11, type: "city" },
  { name: "柳州", pinyin: "liuzhou", coord: [109.4286, 24.3263], zoom: 11, type: "city" },
  { name: "珠海", pinyin: "zhuhai", coord: [113.5537, 22.2235], zoom: 12, type: "city" },
  { name: "汕头", pinyin: "shantou", coord: [116.6817, 23.3541], zoom: 11, type: "city" },
  { name: "惠州", pinyin: "huizhou", coord: [114.4151, 23.1115], zoom: 11, type: "city" },
  { name: "中山", pinyin: "zhongshan", coord: [113.3926, 22.5176], zoom: 11, type: "city" },
  { name: "江门", pinyin: "jiangmen", coord: [113.0949, 22.5904], zoom: 11, type: "city" },
  { name: "湛江", pinyin: "zhanjiang", coord: [110.3649, 21.2743], zoom: 11, type: "city" },
  { name: "茂名", pinyin: "maoming", coord: [110.9192, 21.6598], zoom: 11, type: "city" },
  { name: "连云港", pinyin: "lianyungang", coord: [119.2216, 34.5967], zoom: 11, type: "city" },
  { name: "盐城", pinyin: "yancheng", coord: [120.1391, 33.3776], zoom: 11, type: "city" },
  { name: "南通", pinyin: "nantong", coord: [120.8944, 31.9802], zoom: 11, type: "city" },
  { name: "扬州", pinyin: "yangzhou", coord: [119.421, 32.3932], zoom: 11, type: "city" },
  { name: "镇江", pinyin: "zhenjiang", coord: [119.4556, 32.2044], zoom: 11, type: "city" },
  { name: "泰州", pinyin: "taizhou", coord: [119.9226, 32.4555], zoom: 11, type: "city" },
  { name: "淮安", pinyin: "huaian", coord: [119.1137, 33.5513], zoom: 11, type: "city" },
  { name: "嘉兴", pinyin: "jiaxing", coord: [120.7555, 30.7467], zoom: 11, type: "city" },
  { name: "绍兴", pinyin: "shaoxing", coord: [120.5821, 29.9971], zoom: 11, type: "city" },
  { name: "金华", pinyin: "jinhua", coord: [119.6495, 29.0895], zoom: 11, type: "city" },
  { name: "台州", pinyin: "taizhou", coord: [121.4208, 28.6564], zoom: 11, type: "city" },
  { name: "湖州", pinyin: "huzhou", coord: [120.0868, 30.8673], zoom: 11, type: "city" },
  { name: "衢州", pinyin: "quzhou", coord: [118.859, 28.9701], zoom: 11, type: "city" },
  { name: "丽水", pinyin: "lishui", coord: [119.9215, 28.4516], zoom: 11, type: "city" },
  { name: "舟山", pinyin: "zhoushan", coord: [122.2072, 29.9853], zoom: 11, type: "city" },
];

// 获取所有区域（用于搜索）
export const allRegions: Region[] = [...provinces];

/**
 * 搜索地区
 * @param keyword 关键词
 * @returns 匹配的地区列表
 */
export function searchRegions(keyword: string): Region[] {
  const lowerKeyword = keyword.toLowerCase().trim();
  if (!lowerKeyword) return [];

  return allRegions.filter((region) => {
    return (
      region.name.includes(keyword) ||
      region.pinyin.includes(lowerKeyword) ||
      region.name.startsWith(keyword)
    );
  });
}
