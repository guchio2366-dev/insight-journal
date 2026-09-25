// Generated from official station-normal tables by scripts/atlas-asia-climate-cities.py.
// Monthly arrays are January–December; null means unavailable, never zero-filled.
// Display sourceName, normalPeriod, sourceUrl and missingMonths with each chart.
export type AsiaClimateCity = {
  id: string;
  regionId: 'east-asia' | 'southeast-asia' | 'south-central-asia';
  countryCode: string;
  name: string;
  stationId: string;
  stationName: string;
  coordinates: [number, number];
  elevationM?: number;
  normalPeriod: string;
  temperatureC: (number | null)[];
  precipitationMm: (number | null)[];
  sourceUrl: string;
  sourceName: string;
  sourceRetrievedAt: string;
  sourceTermsUrl: string;
  sourceSha256: string[];
  additionalSourceUrls?: string[];
  missingMonths: { temperature: number[]; precipitation: number[] };
  notes: string[];
  summary: string;
  reading: string;
};

export const asiaClimateCities: AsiaClimateCity[] = [
  {
    "id": "tokyo",
    "regionId": "east-asia",
    "countryCode": "JPN",
    "name": "東京",
    "stationId": "47662",
    "stationName": "TOKYO",
    "coordinates": [
      139.75,
      35.69
    ],
    "elevationM": 25.0,
    "temperatureC": [
      5.4,
      6.1,
      9.4,
      14.3,
      18.8,
      21.9,
      25.7,
      26.9,
      23.3,
      18.0,
      12.5,
      7.7
    ],
    "precipitationMm": [
      59.7,
      56.5,
      116.0,
      133.7,
      139.7,
      167.8,
      156.2,
      154.7,
      224.9,
      234.8,
      96.3,
      57.9
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.data.jma.go.jp/stats/etrn/view/nml_sfc_ym.php?prec_no=44&block_no=47662&year=&month=&day=&view=",
    "sourceName": "気象庁 過去の気象データ検索・平年値",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
    "sourceSha256": [
      "c73beed753010ea176400d62d11eab87ad74ebca41ed36db3031434a068be254",
      "0d7434aad5151b2783464525335fba47a977d99ff9054522179cfafa79bedcf5"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": []
    },
    "notes": [
      "日本の気温・降水量はClimatViewの推奨に従い国内の平年値表を採用。位置・標高はClimatViewの観測所情報。"
    ],
    "summary": "10月の雨が多く、2月との季節差がある。",
    "reading": "月平均気温は1月の5.4℃から8月の26.9℃まで変化する。月降水量は10月が234.8mm、2月が56.5mm。12か月の降水量平年値の合計は1,598.2mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。"
  },
  {
    "id": "sapporo",
    "regionId": "east-asia",
    "countryCode": "JPN",
    "name": "札幌",
    "stationId": "47412",
    "stationName": "SAPPORO",
    "coordinates": [
      141.32,
      43.05
    ],
    "elevationM": 17.0,
    "temperatureC": [
      -3.2,
      -2.7,
      1.1,
      7.3,
      13.0,
      17.0,
      21.1,
      22.3,
      18.6,
      12.1,
      5.2,
      -0.9
    ],
    "precipitationMm": [
      108.4,
      91.9,
      77.6,
      54.6,
      55.5,
      60.4,
      90.7,
      126.8,
      142.2,
      109.9,
      113.8,
      114.5
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.data.jma.go.jp/stats/etrn/view/nml_sfc_ym.php?prec_no=14&block_no=47412&year=&month=&day=&view=",
    "sourceName": "気象庁 過去の気象データ検索・平年値",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
    "sourceSha256": [
      "2553df0f340c4c73f10768212e0d0ccaf8b9fa2cd47eb3ea1161abaf7ff3ea88",
      "82a8e88426c47e093a6c7b8e127a98859ced7a67a0d6238562852e2f2949c0b2"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": []
    },
    "notes": [
      "日本の気温・降水量はClimatViewの推奨に従い国内の平年値表を採用。位置・標高はClimatViewの観測所情報。"
    ],
    "summary": "最寒月は-3.2℃。夏と冬の気温差が大きい。",
    "reading": "月平均気温は1月の-3.2℃から8月の22.3℃まで変化する。月降水量は9月が142.2mm、4月が54.6mm。12か月の降水量平年値の合計は1,146.3mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。"
  },
  {
    "id": "naha",
    "regionId": "east-asia",
    "countryCode": "JPN",
    "name": "那覇",
    "stationId": "47936",
    "stationName": "NAHA",
    "coordinates": [
      127.68,
      26.2
    ],
    "elevationM": 28.0,
    "temperatureC": [
      17.3,
      17.5,
      19.1,
      21.5,
      24.2,
      27.2,
      29.1,
      29.0,
      27.9,
      25.5,
      22.5,
      19.0
    ],
    "precipitationMm": [
      101.6,
      114.5,
      142.8,
      161.0,
      245.3,
      284.4,
      188.1,
      240.0,
      275.2,
      179.2,
      119.1,
      110.0
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.data.jma.go.jp/stats/etrn/view/nml_sfc_ym.php?prec_no=91&block_no=47936&year=&month=&day=&view=",
    "sourceName": "気象庁 過去の気象データ検索・平年値",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
    "sourceSha256": [
      "a104b4c18bba74c10c547f2ffc35c5192cc224fb0ea70c9bcb3f908d8ef72de9",
      "3e3d91be33339d388470282b308b1abadba7c6e8e426edbfae647f78d6281922"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": []
    },
    "notes": [
      "日本の気温・降水量はClimatViewの推奨に従い国内の平年値表を採用。位置・標高はClimatViewの観測所情報。"
    ],
    "summary": "気温と降水量の両方から季節の移り変わりを読む。",
    "reading": "月平均気温は1月の17.3℃から7月の29.1℃まで変化する。月降水量は6月が284.4mm、1月が101.6mm。12か月の降水量平年値の合計は2,161.2mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。"
  },
  {
    "id": "beijing",
    "regionId": "east-asia",
    "countryCode": "CHN",
    "name": "北京",
    "stationId": "54511",
    "stationName": "BEIJING",
    "coordinates": [
      116.28,
      39.93
    ],
    "elevationM": 32.0,
    "temperatureC": [
      -2.8,
      0.6,
      7.5,
      15.1,
      21.3,
      25.3,
      27.2,
      26.0,
      21.2,
      13.8,
      5.2,
      -1.0
    ],
    "precipitationMm": [
      2.1,
      5.6,
      8.5,
      21.9,
      36.5,
      72.7,
      170.6,
      114.1,
      53.3,
      29.3,
      13.7,
      2.5
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml.php?n=54511&y=2025&m=12&e=6&r=1&s=1&k=0",
    "sourceName": "気象庁 ClimatView（CLIMAT・GHCNに基づく平年値）",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
    "sourceSha256": [
      "94a1dc1368e29aa2cb30bb7f859dc9201226c05da223712f956b1a6af99abc4d"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": []
    },
    "notes": [],
    "summary": "最寒月は-2.8℃。夏と冬の気温差が大きい。",
    "reading": "月平均気温は1月の-2.8℃から7月の27.2℃まで変化する。月降水量は7月が170.6mm、1月が2.1mm。12か月の降水量平年値の合計は530.8mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。"
  },
  {
    "id": "shanghai",
    "regionId": "east-asia",
    "countryCode": "CHN",
    "name": "上海",
    "stationId": "58362",
    "stationName": "SHANGHAI (BAOSHAN)",
    "coordinates": [
      121.45,
      31.42
    ],
    "elevationM": 9.0,
    "temperatureC": [
      5.0,
      6.5,
      10.3,
      15.7,
      20.9,
      24.4,
      28.8,
      28.5,
      24.8,
      19.7,
      13.9,
      7.5
    ],
    "precipitationMm": [
      67.5,
      62.9,
      81.0,
      77.2,
      90.6,
      181.5,
      144.1,
      215.5,
      122.2,
      61.5,
      60.5,
      47.4
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml.php?n=58362&y=2025&m=12&e=6&r=1&s=1&k=0",
    "sourceName": "気象庁 ClimatView（CLIMAT・GHCNに基づく平年値）",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
    "sourceSha256": [
      "2c7ea0b86703442e7137e99deaf8c03cefde8a5cf945cd1f27bad9ab7f82b84e"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": []
    },
    "notes": [],
    "summary": "8月の雨が多く、12月との季節差がある。",
    "reading": "月平均気温は1月の5.0℃から7月の28.8℃まで変化する。月降水量は8月が215.5mm、12月が47.4mm。12か月の降水量平年値の合計は1,211.9mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。"
  },
  {
    "id": "guangzhou",
    "regionId": "east-asia",
    "countryCode": "CHN",
    "name": "広州",
    "stationId": "59287",
    "stationName": "GUANGZHOU",
    "coordinates": [
      113.48,
      23.22
    ],
    "elevationM": 71.0,
    "temperatureC": [
      13.8,
      15.5,
      18.3,
      22.5,
      26.0,
      27.9,
      28.9,
      28.6,
      27.4,
      24.5,
      20.1,
      15.5
    ],
    "precipitationMm": [
      50.9,
      54.4,
      96.2,
      193.3,
      330.1,
      364.6,
      242.5,
      270.2,
      202.3,
      67.3,
      37.4,
      34.3
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml.php?n=59287&y=2025&m=12&e=6&r=1&s=1&k=0",
    "sourceName": "気象庁 ClimatView（CLIMAT・GHCNに基づく平年値）",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
    "sourceSha256": [
      "60fa6561a65486f58bf7ab32542f656420bed3368c02477f8c45d0f3e7d7f92a"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": []
    },
    "notes": [],
    "summary": "6月の雨が多く、12月との季節差がある。",
    "reading": "月平均気温は1月の13.8℃から7月の28.9℃まで変化する。月降水量は6月が364.6mm、12月が34.3mm。12か月の降水量平年値の合計は1,943.5mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。"
  },
  {
    "id": "changchun",
    "regionId": "east-asia",
    "countryCode": "CHN",
    "name": "長春",
    "stationId": "54161",
    "stationName": "CHANGCHUN",
    "coordinates": [
      125.22,
      43.9
    ],
    "elevationM": 238.0,
    "temperatureC": [
      -14.3,
      -9.3,
      -1.0,
      8.8,
      16.2,
      21.3,
      23.7,
      22.3,
      16.5,
      7.9,
      -2.8,
      -11.8
    ],
    "precipitationMm": [
      4.6,
      6.2,
      13.1,
      22.1,
      62.8,
      102.2,
      147.6,
      131.2,
      53.9,
      24.5,
      16.8,
      8.2
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml.php?n=54161&y=2025&m=12&e=6&r=1&s=1&k=0",
    "sourceName": "気象庁 ClimatView（CLIMAT・GHCNに基づく平年値）",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
    "sourceSha256": [
      "fe6a3712bc6f10c82b05d58fe19e78210371aeb9d5db9d960e8178b4eb5e224a"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": []
    },
    "notes": [],
    "summary": "最寒月は-14.3℃。夏と冬の気温差が大きい。",
    "reading": "月平均気温は1月の-14.3℃から7月の23.7℃まで変化する。月降水量は7月が147.6mm、1月が4.6mm。12か月の降水量平年値の合計は593.2mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。"
  },
  {
    "id": "urumqi",
    "regionId": "east-asia",
    "countryCode": "CHN",
    "name": "ウルムチ",
    "stationId": "51463",
    "stationName": "WU LU MU QI",
    "coordinates": [
      87.65,
      43.78
    ],
    "elevationM": 936.0,
    "temperatureC": [
      -12.1,
      -8.9,
      0.4,
      11.5,
      17.3,
      22.4,
      24.2,
      23.0,
      17.2,
      8.8,
      -0.9,
      -9.2
    ],
    "precipitationMm": [
      10.4,
      13.5,
      19.0,
      40.1,
      41.6,
      27.8,
      35.8,
      29.4,
      20.2,
      22.4,
      24.0,
      20.0
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml.php?n=51463&y=2025&m=12&e=6&r=1&s=1&k=0",
    "sourceName": "気象庁 ClimatView（CLIMAT・GHCNに基づく平年値）",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
    "sourceSha256": [
      "c01b2f681062cffbfbe8ce08cf85ec450ddb3f3e81263530434a8a6203d399bc"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": []
    },
    "notes": [],
    "summary": "最寒月は-12.1℃。夏と冬の気温差が大きい。",
    "reading": "月平均気温は1月の-12.1℃から7月の24.2℃まで変化する。月降水量は5月が41.6mm、1月が10.4mm。12か月の降水量平年値の合計は304.2mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。"
  },
  {
    "id": "lhasa",
    "regionId": "east-asia",
    "countryCode": "CHN",
    "name": "ラサ",
    "stationId": "55591",
    "stationName": "LHASA",
    "coordinates": [
      91.13,
      29.67
    ],
    "elevationM": 3650.0,
    "temperatureC": [
      -0.1,
      2.7,
      6.2,
      9.3,
      13.3,
      16.8,
      16.6,
      16.0,
      14.4,
      10.0,
      4.3,
      0.4
    ],
    "precipitationMm": [
      0.9,
      1.0,
      3.7,
      8.5,
      30.3,
      84.8,
      140.6,
      127.5,
      58.2,
      6.9,
      0.9,
      0.5
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml.php?n=55591&y=2025&m=12&e=6&r=1&s=1&k=0",
    "sourceName": "気象庁 ClimatView（CLIMAT・GHCNに基づく平年値）",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
    "sourceSha256": [
      "ec72f5205bee7ea7b6e9669904e34ce772d5c5ebb975293d11f751e8a052b23e"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": []
    },
    "notes": [],
    "summary": "最寒月は-0.1℃。夏と冬の気温差が大きい。",
    "reading": "月平均気温は1月の-0.1℃から6月の16.8℃まで変化する。月降水量は7月が140.6mm、12月が0.5mm。12か月の降水量平年値の合計は463.8mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。"
  },
  {
    "id": "seoul",
    "regionId": "east-asia",
    "countryCode": "KOR",
    "name": "ソウル",
    "stationId": "47108",
    "stationName": "SEOUL",
    "coordinates": [
      126.95,
      37.57
    ],
    "elevationM": 86.0,
    "temperatureC": [
      -1.9,
      0.7,
      6.1,
      12.6,
      18.3,
      22.7,
      25.3,
      26.1,
      21.7,
      15.1,
      7.5,
      0.2
    ],
    "precipitationMm": [
      16.4,
      28.1,
      36.9,
      71.7,
      103.7,
      129.6,
      414.5,
      348.3,
      141.6,
      52.1,
      51.2,
      23.7
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml.php?n=47108&y=2025&m=12&e=6&r=1&s=1&k=0",
    "sourceName": "気象庁 ClimatView（CLIMAT・GHCNに基づく平年値）",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
    "sourceSha256": [
      "e54d4d21d2541032f498b172733d2bb4d00839023da35d23fee5d4c6ec03d0b4"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": []
    },
    "notes": [],
    "summary": "最寒月は-1.9℃。夏と冬の気温差が大きい。",
    "reading": "月平均気温は1月の-1.9℃から8月の26.1℃まで変化する。月降水量は7月が414.5mm、1月が16.4mm。12か月の降水量平年値の合計は1,417.8mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。"
  },
  {
    "id": "pyongyang",
    "regionId": "east-asia",
    "countryCode": "PRK",
    "name": "平壌",
    "stationId": "47058",
    "stationName": "PYONGYANG",
    "coordinates": [
      125.78,
      39.03
    ],
    "elevationM": 36.0,
    "temperatureC": [
      -5.1,
      -2.3,
      4.0,
      11.4,
      17.4,
      21.9,
      24.5,
      25.1,
      20.1,
      13.1,
      5.0,
      -2.8
    ],
    "precipitationMm": [
      10.3,
      15.7,
      21.0,
      56.4,
      89.0,
      106.9,
      316.0,
      236.3,
      109.0,
      42.6,
      42.5,
      17.2
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml.php?n=47058&y=2025&m=12&e=6&r=1&s=1&k=0",
    "sourceName": "気象庁 ClimatView（CLIMAT・GHCNに基づく平年値）",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
    "sourceSha256": [
      "8afbd0fa9e976d5e301fbab19cc4bfaf4e47385f161c06350d723de6c6413710"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": []
    },
    "notes": [],
    "summary": "最寒月は-5.1℃。夏と冬の気温差が大きい。",
    "reading": "月平均気温は1月の-5.1℃から8月の25.1℃まで変化する。月降水量は7月が316.0mm、1月が10.3mm。12か月の降水量平年値の合計は1,062.9mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。"
  },
  {
    "id": "ulaanbaatar",
    "regionId": "east-asia",
    "countryCode": "MNG",
    "name": "ウランバートル",
    "stationId": "44292",
    "stationName": "ULAANBAATAR",
    "coordinates": [
      106.87,
      47.92
    ],
    "elevationM": 1729.0,
    "temperatureC": [
      -21.4,
      -16.2,
      -6.1,
      3.1,
      10.3,
      16.3,
      19.1,
      16.8,
      10.2,
      1.1,
      -10.4,
      -19.0
    ],
    "precipitationMm": [
      1.8,
      2.8,
      4.0,
      9.1,
      21.4,
      44.9,
      79.8,
      66.2,
      28.3,
      9.6,
      6.6,
      3.2
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml.php?n=44292&y=2025&m=12&e=6&r=1&s=1&k=0",
    "sourceName": "気象庁 ClimatView（CLIMAT・GHCNに基づく平年値）",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
    "sourceSha256": [
      "a0b82ee228aa09951fa783bedff6080e1ce7800847de0ebe433784f1f57ce3b9"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": []
    },
    "notes": [],
    "summary": "最寒月は-21.4℃。夏と冬の気温差が大きい。",
    "reading": "月平均気温は1月の-21.4℃から7月の19.1℃まで変化する。月降水量は7月が79.8mm、1月が1.8mm。12か月の降水量平年値の合計は277.7mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。"
  },
  {
    "id": "bangkok",
    "regionId": "southeast-asia",
    "countryCode": "THA",
    "name": "バンコク",
    "stationId": "48455",
    "stationName": "BANGKOK METROPOLIS",
    "coordinates": [
      100.55,
      13.72
    ],
    "elevationM": 3.0,
    "temperatureC": [
      27.6,
      28.7,
      29.8,
      30.8,
      30.5,
      29.8,
      29.3,
      29.1,
      28.7,
      28.5,
      28.4,
      27.4
    ],
    "precipitationMm": [
      24.2,
      19.4,
      53.6,
      92.7,
      215.4,
      209.9,
      182.9,
      212.0,
      343.6,
      304.0,
      46.5,
      13.5
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml.php?n=48455&y=2025&m=12&e=6&r=1&s=1&k=0",
    "sourceName": "気象庁 ClimatView（CLIMAT・GHCNに基づく平年値）",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
    "sourceSha256": [
      "b5ec809fdb0c4d3cbbdfb629bbd0a1a224a942d9e8962fb6bd1184d44851bdb0"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": []
    },
    "notes": [],
    "summary": "一年の気温差は3.4℃。雨の増減に注目する。",
    "reading": "月平均気温は12月の27.4℃から4月の30.8℃まで変化する。月降水量は9月が343.6mm、12月が13.5mm。12か月の降水量平年値の合計は1,717.7mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。"
  },
  {
    "id": "chiang-mai",
    "regionId": "southeast-asia",
    "countryCode": "THA",
    "name": "チェンマイ",
    "stationId": "48327",
    "stationName": "CHIANG MAI",
    "coordinates": [
      98.97,
      18.77
    ],
    "elevationM": 313.0,
    "temperatureC": [
      22.3,
      24.4,
      27.4,
      29.6,
      28.8,
      28.2,
      27.7,
      27.2,
      27.2,
      26.6,
      24.7,
      22.5
    ],
    "precipitationMm": [
      11.3,
      10.3,
      15.0,
      54.8,
      164.5,
      126.8,
      143.0,
      216.0,
      207.1,
      123.8,
      29.8,
      10.0
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml.php?n=48327&y=2025&m=12&e=6&r=1&s=1&k=0",
    "sourceName": "気象庁 ClimatView（CLIMAT・GHCNに基づく平年値）",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
    "sourceSha256": [
      "713c72d3b785627ccd4cee73f488db8ccd4029ebd4108d9027a80be90e7be666"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": []
    },
    "notes": [],
    "summary": "8月の雨が多く、12月との季節差がある。",
    "reading": "月平均気温は1月の22.3℃から4月の29.6℃まで変化する。月降水量は8月が216.0mm、12月が10.0mm。12か月の降水量平年値の合計は1,112.4mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。"
  },
  {
    "id": "yangon",
    "regionId": "southeast-asia",
    "countryCode": "MMR",
    "name": "ヤンゴン",
    "stationId": "48097",
    "stationName": "YANGON",
    "coordinates": [
      96.17,
      16.77
    ],
    "elevationM": 14.0,
    "temperatureC": [
      24.7,
      26.5,
      28.7,
      31.0,
      30.0,
      27.4,
      26.9,
      26.8,
      27.5,
      27.7,
      27.6,
      25.3
    ],
    "precipitationMm": [
      2.1,
      0.5,
      6.7,
      10.9,
      296.0,
      578.8,
      645.5,
      566.6,
      369.5,
      228.4,
      72.5,
      7.6
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml.php?n=48097&y=2025&m=12&e=6&r=1&s=1&k=0",
    "sourceName": "気象庁 ClimatView（CLIMAT・GHCNに基づく平年値）",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
    "sourceSha256": [
      "6e121372ea95b35e0ea86345ce7cae62352bb4e66d6b75c531f57bd99aa0a927"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": []
    },
    "notes": [],
    "summary": "7月の雨が多く、2月との季節差がある。",
    "reading": "月平均気温は1月の24.7℃から4月の31.0℃まで変化する。月降水量は7月が645.5mm、2月が0.5mm。12か月の降水量平年値の合計は2,785.1mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。"
  },
  {
    "id": "vientiane",
    "regionId": "southeast-asia",
    "countryCode": "LAO",
    "name": "ビエンチャン",
    "stationId": "48940",
    "stationName": "VIENTIANE",
    "coordinates": [
      102.57,
      17.95
    ],
    "elevationM": 171.0,
    "temperatureC": [
      23.3,
      25.2,
      27.9,
      29.7,
      29.1,
      28.7,
      28.3,
      27.9,
      28.0,
      27.6,
      26.0,
      23.4
    ],
    "precipitationMm": [
      20.6,
      31.4,
      51.7,
      98.6,
      195.1,
      229.9,
      296.6,
      329.5,
      257.7,
      101.2,
      23.3,
      5.0
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml.php?n=48940&y=2025&m=12&e=6&r=1&s=1&k=0",
    "sourceName": "気象庁 ClimatView（CLIMAT・GHCNに基づく平年値）",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
    "sourceSha256": [
      "fdccd712bcf2aa2e9ae0efeb7e65be2fbd0bfc8520cf12a8f0ca3be7b336b66a"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": []
    },
    "notes": [],
    "summary": "8月の雨が多く、12月との季節差がある。",
    "reading": "月平均気温は1月の23.3℃から4月の29.7℃まで変化する。月降水量は8月が329.5mm、12月が5.0mm。12か月の降水量平年値の合計は1,640.6mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。"
  },
  {
    "id": "haiphong",
    "regionId": "southeast-asia",
    "countryCode": "VNM",
    "name": "ハイフォン（フーリエン）",
    "stationId": "48826",
    "stationName": "PHU LIEN",
    "coordinates": [
      106.63,
      20.8
    ],
    "elevationM": 112.0,
    "temperatureC": [
      16.8,
      17.9,
      20.1,
      23.7,
      26.9,
      28.8,
      28.7,
      28.1,
      27.3,
      25.3,
      22.1,
      18.5
    ],
    "precipitationMm": [
      40.5,
      22.6,
      51.9,
      72.8,
      176.8,
      196.1,
      281.3,
      366.7,
      269.7,
      91.9,
      52.5,
      19.8
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml.php?n=48826&y=2025&m=12&e=6&r=1&s=1&k=0",
    "sourceName": "気象庁 ClimatView（CLIMAT・GHCNに基づく平年値）",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
    "sourceSha256": [
      "4b710ad60c46de6fe306bc0bee45c0f7f0944d7a73ea943d8bca82f028b90a51"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": []
    },
    "notes": [],
    "summary": "8月の雨が多く、12月との季節差がある。",
    "reading": "月平均気温は1月の16.8℃から6月の28.8℃まで変化する。月降水量は8月が366.7mm、12月が19.8mm。12か月の降水量平年値の合計は1,642.6mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。"
  },
  {
    "id": "da-nang",
    "regionId": "southeast-asia",
    "countryCode": "VNM",
    "name": "ダナン",
    "stationId": "48855",
    "stationName": "DA NANG",
    "coordinates": [
      108.35,
      16.07
    ],
    "elevationM": 7.0,
    "temperatureC": [
      21.7,
      22.6,
      24.4,
      26.6,
      28.8,
      30.0,
      29.4,
      29.3,
      27.9,
      26.3,
      24.9,
      22.4
    ],
    "precipitationMm": [
      99.8,
      16.5,
      34.4,
      55.0,
      53.3,
      55.2,
      99.8,
      143.1,
      410.4,
      692.5,
      471.2,
      210.2
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml.php?n=48855&y=2025&m=12&e=6&r=1&s=1&k=0",
    "sourceName": "気象庁 ClimatView（CLIMAT・GHCNに基づく平年値）",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
    "sourceSha256": [
      "bb4581b0ca077ea65ee9da664fbeec6350be6df70b28582f05ceffc80e30916c"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": []
    },
    "notes": [],
    "summary": "10月の雨が多く、2月との季節差がある。",
    "reading": "月平均気温は1月の21.7℃から6月の30.0℃まで変化する。月降水量は10月が692.5mm、2月が16.5mm。12か月の降水量平年値の合計は2,341.4mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。"
  },
  {
    "id": "ca-mau",
    "regionId": "southeast-asia",
    "countryCode": "VNM",
    "name": "カマウ",
    "stationId": "48914",
    "stationName": "CA MAU",
    "coordinates": [
      105.15,
      9.18
    ],
    "elevationM": 1.0,
    "temperatureC": [
      26.4,
      26.9,
      28.2,
      29.2,
      29.1,
      28.2,
      27.9,
      27.8,
      27.7,
      27.4,
      27.5,
      26.8
    ],
    "precipitationMm": [
      36.5,
      19.1,
      33.1,
      67.2,
      206.6,
      280.4,
      328.9,
      285.9,
      382.0,
      341.8,
      251.3,
      94.0
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml.php?n=48914&y=2025&m=12&e=6&r=1&s=1&k=0",
    "sourceName": "気象庁 ClimatView（CLIMAT・GHCNに基づく平年値）",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
    "sourceSha256": [
      "9b5a8fda6f1b70e28e05e32556e749fae3cf4316c7c422abe12bec9d9980431d"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": []
    },
    "notes": [],
    "summary": "一年の気温差は2.8℃。雨の増減に注目する。",
    "reading": "月平均気温は1月の26.4℃から4月の29.2℃まで変化する。月降水量は9月が382.0mm、2月が19.1mm。12か月の降水量平年値の合計は2,326.8mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。"
  },
  {
    "id": "kuala-lumpur",
    "regionId": "southeast-asia",
    "countryCode": "MYS",
    "name": "クアラルンプール（スバン）",
    "stationId": "48647",
    "stationName": "KUALA LUMPUR/SUBANG",
    "coordinates": [
      101.55,
      3.12
    ],
    "elevationM": 27.0,
    "temperatureC": [
      27.3,
      27.7,
      28.1,
      28.1,
      28.5,
      28.4,
      28.0,
      28.0,
      27.7,
      27.5,
      27.1,
      27.0
    ],
    "precipitationMm": [
      231.3,
      195.6,
      271.5,
      303.6,
      220.1,
      141.5,
      166.2,
      172.6,
      218.3,
      280.5,
      356.5,
      283.9
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml.php?n=48647&y=2025&m=12&e=6&r=6&s=1&k=0",
    "sourceName": "気象庁 ClimatView（CLIMAT・GHCNに基づく平年値）",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
    "sourceSha256": [
      "7fe72d9ee9d5e4fbe5baeaffaf38772ab52d69c837535e697b8ff052d36b38c1"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": []
    },
    "notes": [],
    "summary": "一年の気温差は1.5℃。雨の増減に注目する。",
    "reading": "月平均気温は12月の27.0℃から5月の28.5℃まで変化する。月降水量は11月が356.5mm、6月が141.5mm。12か月の降水量平年値の合計は2,841.6mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。"
  },
  {
    "id": "kota-kinabalu",
    "regionId": "southeast-asia",
    "countryCode": "MYS",
    "name": "コタキナバル",
    "stationId": "96471",
    "stationName": "KOTA KINABALU",
    "coordinates": [
      116.05,
      5.93
    ],
    "elevationM": 2.0,
    "temperatureC": [
      26.8,
      26.9,
      27.5,
      28.1,
      28.1,
      27.8,
      27.5,
      27.7,
      27.6,
      27.2,
      27.2,
      27.1
    ],
    "precipitationMm": [
      143.6,
      79.3,
      96.3,
      125.2,
      215.3,
      294.8,
      303.5,
      278.9,
      287.4,
      381.7,
      295.1,
      255.0
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml.php?n=96471&y=2025&m=12&e=6&r=6&s=1&k=0",
    "sourceName": "気象庁 ClimatView（CLIMAT・GHCNに基づく平年値）",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
    "sourceSha256": [
      "9fa8fd79c3b2de348d6847fd96af2382abb3959e87e0aaf0ba3c5ec817e65939"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": []
    },
    "notes": [],
    "summary": "一年の気温差は1.3℃。雨の増減に注目する。",
    "reading": "月平均気温は1月の26.8℃から4月の28.1℃まで変化する。月降水量は10月が381.7mm、2月が79.3mm。12か月の降水量平年値の合計は2,756.1mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。"
  },
  {
    "id": "singapore",
    "regionId": "southeast-asia",
    "countryCode": "SGP",
    "name": "シンガポール",
    "stationId": "48698",
    "stationName": "SINGAPORE/CHANGI AIRPORT",
    "coordinates": [
      103.98,
      1.37
    ],
    "elevationM": 5.0,
    "temperatureC": [
      26.8,
      27.3,
      27.9,
      28.2,
      28.6,
      28.5,
      28.2,
      28.1,
      28.0,
      27.9,
      27.2,
      26.8
    ],
    "precipitationMm": [
      221.0,
      104.9,
      151.1,
      164.0,
      164.3,
      136.5,
      144.9,
      148.8,
      133.4,
      166.5,
      254.2,
      333.1
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml.php?n=48698&y=2025&m=12&e=6&r=6&s=1&k=0",
    "sourceName": "気象庁 ClimatView（CLIMAT・GHCNに基づく平年値）",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
    "sourceSha256": [
      "02daf0b10ef24b082b18a771400f125a5f0a1fcdbc781a8d6b8dd8731efec433"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": []
    },
    "notes": [],
    "summary": "一年の気温差は1.8℃。雨の増減に注目する。",
    "reading": "月平均気温は1月の26.8℃から5月の28.6℃まで変化する。月降水量は12月が333.1mm、2月が104.9mm。12か月の降水量平年値の合計は2,122.7mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。"
  },
  {
    "id": "bandar-seri-begawan",
    "regionId": "southeast-asia",
    "countryCode": "BRN",
    "name": "バンダルスリブガワン",
    "stationId": "96315",
    "stationName": "BRUNEI AIRPORT",
    "coordinates": [
      114.93,
      4.93
    ],
    "elevationM": 22.0,
    "temperatureC": [
      27.1,
      27.2,
      27.7,
      28.1,
      28.2,
      27.9,
      27.7,
      27.8,
      27.7,
      27.3,
      27.3,
      27.2
    ],
    "precipitationMm": [
      337.3,
      194.5,
      161.0,
      247.0,
      271.8,
      234.8,
      254.7,
      243.6,
      232.2,
      330.9,
      331.3,
      398.1
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml.php?n=96315&y=2025&m=12&e=6&r=6&s=1&k=0",
    "sourceName": "気象庁 ClimatView（CLIMAT・GHCNに基づく平年値）",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
    "sourceSha256": [
      "e92d1b102cc763899ba79980c1cf617c009b00a99e6d5500c196321303a7836c"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": []
    },
    "notes": [],
    "summary": "一年の気温差は1.1℃。雨の増減に注目する。",
    "reading": "月平均気温は1月の27.1℃から5月の28.2℃まで変化する。月降水量は12月が398.1mm、3月が161.0mm。12か月の降水量平年値の合計は3,237.2mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。"
  },
  {
    "id": "jakarta",
    "regionId": "southeast-asia",
    "countryCode": "IDN",
    "name": "ジャカルタ（スカルノ・ハッタ空港）",
    "stationId": "96749",
    "stationName": "JAKARTA/SOEKARNO-HATTA",
    "coordinates": [
      106.65,
      -6.12
    ],
    "elevationM": 8.0,
    "temperatureC": [
      26.9,
      26.8,
      27.4,
      27.9,
      28.0,
      27.7,
      27.3,
      27.6,
      27.8,
      27.9,
      27.7,
      27.3
    ],
    "precipitationMm": [
      307.1,
      359.5,
      166.5,
      107.4,
      90.1,
      50.6,
      84.9,
      36.2,
      42.6,
      56.7,
      80.4,
      180.4
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml.php?n=96749&y=2025&m=12&e=6&r=6&s=1&k=0",
    "sourceName": "気象庁 ClimatView（CLIMAT・GHCNに基づく平年値）",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
    "sourceSha256": [
      "77d984fa390889bbb6a57e796487fcad68d7eb5e8dba1846acfe3a6d96cc6a2a"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": []
    },
    "notes": [],
    "summary": "一年の気温差は1.2℃。雨の増減に注目する。",
    "reading": "月平均気温は2月の26.8℃から5月の28.0℃まで変化する。月降水量は2月が359.5mm、8月が36.2mm。12か月の降水量平年値の合計は1,562.4mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。"
  },
  {
    "id": "makassar",
    "regionId": "southeast-asia",
    "countryCode": "IDN",
    "name": "マカッサル",
    "stationId": "97180",
    "stationName": "UJUNG PANDANG/HASANUDDIN",
    "coordinates": [
      119.55,
      -5.07
    ],
    "elevationM": 14.0,
    "temperatureC": [
      26.5,
      26.6,
      26.8,
      27.2,
      27.4,
      27.2,
      26.8,
      27.4,
      28.1,
      28.2,
      27.4,
      26.6
    ],
    "precipitationMm": [
      750.6,
      574.4,
      396.3,
      256.2,
      137.4,
      103.6,
      35.1,
      19.3,
      67.0,
      122.5,
      295.0,
      636.4
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml.php?n=97180&y=2025&m=12&e=6&r=6&s=1&k=0",
    "sourceName": "気象庁 ClimatView（CLIMAT・GHCNに基づく平年値）",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
    "sourceSha256": [
      "ce18d53e9291ef0c90d3d35fc4998fc23ff94d098225cd926be80ff3e072c5a6"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": []
    },
    "notes": [],
    "summary": "一年の気温差は1.7℃。雨の増減に注目する。",
    "reading": "月平均気温は1月の26.5℃から10月の28.2℃まで変化する。月降水量は1月が750.6mm、8月が19.3mm。12か月の降水量平年値の合計は3,393.8mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。"
  },
  {
    "id": "quezon-city",
    "regionId": "southeast-asia",
    "countryCode": "PHL",
    "name": "ケソン市（マニラ首都圏）",
    "stationId": "98430",
    "stationName": "SCIENCE GARDEN",
    "coordinates": [
      121.03,
      14.63
    ],
    "elevationM": 45.0,
    "temperatureC": [
      25.9,
      26.2,
      27.7,
      29.2,
      29.6,
      28.8,
      27.9,
      27.8,
      27.7,
      27.5,
      27.2,
      26.3
    ],
    "precipitationMm": [
      25.6,
      29.6,
      28.8,
      80.2,
      203.6,
      349.8,
      470.2,
      598.7,
      553.0,
      282.5,
      204.8,
      110.6
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml.php?n=98430&y=2025&m=12&e=6&r=6&s=1&k=0",
    "sourceName": "気象庁 ClimatView（CLIMAT・GHCNに基づく平年値）",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
    "sourceSha256": [
      "93f23fc6be6ad14247e7b59a5221c92f39733c76a111d01247dd9b1b733274dc"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": []
    },
    "notes": [],
    "summary": "一年の気温差は3.7℃。雨の増減に注目する。",
    "reading": "月平均気温は1月の25.9℃から5月の29.6℃まで変化する。月降水量は8月が598.7mm、1月が25.6mm。12か月の降水量平年値の合計は2,937.4mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。"
  },
  {
    "id": "cebu",
    "regionId": "southeast-asia",
    "countryCode": "PHL",
    "name": "セブ（マクタン）",
    "stationId": "98646",
    "stationName": "MACTAN",
    "coordinates": [
      123.97,
      10.32
    ],
    "elevationM": 23.0,
    "temperatureC": [
      26.7,
      26.9,
      27.7,
      28.8,
      29.2,
      28.7,
      28.1,
      28.3,
      28.2,
      28.0,
      27.9,
      27.3
    ],
    "precipitationMm": [
      124.5,
      85.8,
      63.3,
      56.5,
      106.3,
      180.4,
      209.8,
      160.5,
      181.8,
      210.5,
      118.5,
      178.0
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml.php?n=98646&y=2025&m=12&e=6&r=6&s=1&k=0",
    "sourceName": "気象庁 ClimatView（CLIMAT・GHCNに基づく平年値）",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
    "sourceSha256": [
      "0bf878676a839fe8b399fe1e5072307659bdedf7f80bd0d3f6468cce64c227a9"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": []
    },
    "notes": [],
    "summary": "一年の気温差は2.5℃。雨の増減に注目する。",
    "reading": "月平均気温は1月の26.7℃から5月の29.2℃まで変化する。月降水量は10月が210.5mm、4月が56.5mm。12か月の降水量平年値の合計は1,675.9mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。"
  },
  {
    "id": "new-delhi",
    "regionId": "south-central-asia",
    "countryCode": "IND",
    "name": "ニューデリー",
    "stationId": "42182",
    "stationName": "NEW DELHI/SAFDARJUNG",
    "coordinates": [
      77.2,
      28.58
    ],
    "elevationM": 211.0,
    "temperatureC": [
      13.9,
      17.6,
      22.9,
      29.1,
      32.7,
      33.3,
      31.5,
      30.4,
      29.6,
      26.2,
      20.5,
      15.6
    ],
    "precipitationMm": [
      20.0,
      25.6,
      21.4,
      13.0,
      26.1,
      87.8,
      197.2,
      226.1,
      131.1,
      17.1,
      5.4,
      11.4
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml.php?n=42182&y=2025&m=12&e=6&r=1&s=1&k=0",
    "sourceName": "気象庁 ClimatView（CLIMAT・GHCNに基づく平年値）",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
    "sourceSha256": [
      "c98cfc0b58a32574816f0aa1d2a1337b476b223b1217298711cbcfcd312b1ba5"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": []
    },
    "notes": [],
    "summary": "8月の雨が多く、11月との季節差がある。",
    "reading": "月平均気温は1月の13.9℃から6月の33.3℃まで変化する。月降水量は8月が226.1mm、11月が5.4mm。12か月の降水量平年値の合計は782.2mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。"
  },
  {
    "id": "mumbai",
    "regionId": "south-central-asia",
    "countryCode": "IND",
    "name": "ムンバイ",
    "stationId": "43057",
    "stationName": "BOMBAY / COLABA",
    "coordinates": [
      72.82,
      18.9
    ],
    "elevationM": 9.0,
    "temperatureC": [
      24.9,
      25.5,
      27.3,
      29.2,
      30.7,
      29.3,
      27.7,
      27.5,
      27.9,
      29.1,
      28.7,
      26.7
    ],
    "precipitationMm": [
      0.6,
      1.0,
      1.3,
      0.8,
      6.0,
      516.5,
      790.5,
      483.3,
      352.8,
      86.3,
      8.8,
      2.8
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml.php?n=43057&y=2025&m=12&e=6&r=1&s=1&k=0",
    "sourceName": "気象庁 ClimatView（CLIMAT・GHCNに基づく平年値）",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
    "sourceSha256": [
      "6d13aebc73db39bce199b806bc8f2922effb7de061e69febf398d94e54de7af8"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": []
    },
    "notes": [],
    "summary": "7月の雨が多く、1月との季節差がある。",
    "reading": "月平均気温は1月の24.9℃から5月の30.7℃まで変化する。月降水量は7月が790.5mm、1月が0.6mm。12か月の降水量平年値の合計は2,250.7mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。"
  },
  {
    "id": "chennai",
    "regionId": "south-central-asia",
    "countryCode": "IND",
    "name": "チェンナイ",
    "stationId": "43279",
    "stationName": "CHENNAI/MINAMBAKKAM",
    "coordinates": [
      80.18,
      13.0
    ],
    "elevationM": 13.0,
    "temperatureC": [
      25.4,
      26.7,
      28.7,
      31.0,
      33.0,
      32.3,
      31.0,
      30.3,
      29.8,
      28.5,
      26.7,
      25.6
    ],
    "precipitationMm": [
      19.7,
      5.4,
      3.6,
      22.4,
      49.7,
      75.7,
      104.3,
      141.5,
      142.5,
      291.5,
      381.1,
      189.8
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml.php?n=43279&y=2025&m=12&e=6&r=1&s=1&k=0",
    "sourceName": "気象庁 ClimatView（CLIMAT・GHCNに基づく平年値）",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
    "sourceSha256": [
      "2ba2b687630d3b95d10b179e63d3edca9237eb4a7bc31b1d99286e45fc4f997d"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": []
    },
    "notes": [],
    "summary": "11月の雨が多く、3月との季節差がある。",
    "reading": "月平均気温は1月の25.4℃から5月の33.0℃まで変化する。月降水量は11月が381.1mm、3月が3.6mm。12か月の降水量平年値の合計は1,427.2mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。"
  },
  {
    "id": "karachi",
    "regionId": "south-central-asia",
    "countryCode": "PAK",
    "name": "カラチ",
    "stationId": "41780",
    "stationName": "KARACHI AIRPORT",
    "coordinates": [
      67.13,
      24.9
    ],
    "elevationM": 21.0,
    "temperatureC": [
      19.4,
      22.1,
      26.1,
      29.3,
      31.2,
      31.8,
      30.6,
      29.4,
      29.5,
      29.2,
      25.2,
      21.0
    ],
    "precipitationMm": [
      9.5,
      5.8,
      2.8,
      1.3,
      0.2,
      15.0,
      59.5,
      70.0,
      22.8,
      2.6,
      0.7,
      5.9
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml.php?n=41780&y=2025&m=12&e=6&r=1&s=1&k=0",
    "sourceName": "気象庁 ClimatView（CLIMAT・GHCNに基づく平年値）",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
    "sourceSha256": [
      "6c92de62a222cafe11c29ed48401bd2604360e6b942a1f3321a890a3d8c997a9"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": []
    },
    "notes": [],
    "summary": "8月の雨が多く、5月との季節差がある。",
    "reading": "月平均気温は1月の19.4℃から6月の31.8℃まで変化する。月降水量は8月が70.0mm、5月が0.2mm。12か月の降水量平年値の合計は196.1mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。"
  },
  {
    "id": "islamabad",
    "regionId": "south-central-asia",
    "countryCode": "PAK",
    "name": "イスラマバード",
    "stationId": "41571",
    "stationName": "ISLAMABAD AIRPORT",
    "coordinates": [
      73.1,
      33.62
    ],
    "elevationM": 507.0,
    "temperatureC": [
      10.4,
      13.3,
      18.2,
      23.8,
      29.0,
      31.4,
      30.0,
      29.0,
      27.4,
      22.9,
      16.5,
      11.7
    ],
    "precipitationMm": [
      51.8,
      102.8,
      115.5,
      55.4,
      46.6,
      90.4,
      294.8,
      296.6,
      133.3,
      34.7,
      19.4,
      29.7
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml.php?n=41571&y=2025&m=12&e=6&r=1&s=1&k=0",
    "sourceName": "気象庁 ClimatView（CLIMAT・GHCNに基づく平年値）",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
    "sourceSha256": [
      "035ecff87c10c2048b8f11a54b99ec6464a23d1bc0dfae54192249d1b04e746a"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": []
    },
    "notes": [],
    "summary": "8月の雨が多く、11月との季節差がある。",
    "reading": "月平均気温は1月の10.4℃から6月の31.4℃まで変化する。月降水量は8月が296.6mm、11月が19.4mm。12か月の降水量平年値の合計は1,271.0mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。"
  },
  {
    "id": "dhaka",
    "regionId": "south-central-asia",
    "countryCode": "BGD",
    "name": "ダッカ",
    "stationId": "41923",
    "stationName": "DHAKA",
    "coordinates": [
      90.38,
      23.77
    ],
    "elevationM": 8.0,
    "temperatureC": [
      18.2,
      21.7,
      26.2,
      28.4,
      28.5,
      29.2,
      28.9,
      29.0,
      28.9,
      27.6,
      23.7,
      19.6
    ],
    "precipitationMm": [
      7.5,
      23.7,
      48.2,
      148.5,
      299.5,
      311.8,
      362.5,
      296.0,
      235.4,
      165.4,
      14.2,
      16.0
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml.php?n=41923&y=2025&m=12&e=6&r=1&s=1&k=0",
    "sourceName": "気象庁 ClimatView（CLIMAT・GHCNに基づく平年値）",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
    "sourceSha256": [
      "fc715faa4a1fe0dbb1a0824b4aa1984506382c5fd9ddc35e4665f7680d448cbc"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": []
    },
    "notes": [],
    "summary": "7月の雨が多く、1月との季節差がある。",
    "reading": "月平均気温は1月の18.2℃から6月の29.2℃まで変化する。月降水量は7月が362.5mm、1月が7.5mm。12か月の降水量平年値の合計は1,928.7mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。"
  },
  {
    "id": "colombo",
    "regionId": "south-central-asia",
    "countryCode": "LKA",
    "name": "コロンボ",
    "stationId": "43466",
    "stationName": "COLOMBO",
    "coordinates": [
      79.87,
      6.9
    ],
    "elevationM": 7.0,
    "temperatureC": [
      27.2,
      27.6,
      28.4,
      28.6,
      28.9,
      28.3,
      28.1,
      28.1,
      27.9,
      27.5,
      27.3,
      27.2
    ],
    "precipitationMm": [
      86.7,
      81.4,
      111.6,
      229.4,
      303.4,
      198.4,
      120.4,
      119.5,
      263.7,
      347.4,
      322.2,
      187.1
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml.php?n=43466&y=2025&m=12&e=6&r=1&s=1&k=0",
    "sourceName": "気象庁 ClimatView（CLIMAT・GHCNに基づく平年値）",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
    "sourceSha256": [
      "0b988e1b7a70be00730a24efd95c862ff4aa99c756368a8d115dc6f764b75b1e"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": []
    },
    "notes": [],
    "summary": "一年の気温差は1.7℃。雨の増減に注目する。",
    "reading": "月平均気温は1月の27.2℃から5月の28.9℃まで変化する。月降水量は10月が347.4mm、2月が81.4mm。12か月の降水量平年値の合計は2,371.2mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。"
  },
  {
    "id": "male",
    "regionId": "south-central-asia",
    "countryCode": "MDV",
    "name": "マレ",
    "stationId": "43555",
    "stationName": "MALE",
    "coordinates": [
      73.52,
      4.18
    ],
    "elevationM": 1.0,
    "temperatureC": [
      28.4,
      28.7,
      29.4,
      29.8,
      29.4,
      29.2,
      28.9,
      28.7,
      28.5,
      28.5,
      28.2,
      28.3
    ],
    "precipitationMm": [
      115.2,
      66.0,
      101.7,
      117.7,
      256.2,
      133.9,
      201.5,
      217.7,
      240.6,
      266.8,
      293.7,
      239.1
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml.php?n=43555&y=2025&m=12&e=6&r=1&s=1&k=0",
    "sourceName": "気象庁 ClimatView（CLIMAT・GHCNに基づく平年値）",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
    "sourceSha256": [
      "febc6564acc359f79e809aa2e6d9508e809b81dfd8eb8b94d25a674e5472be09"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": []
    },
    "notes": [],
    "summary": "一年の気温差は1.6℃。雨の増減に注目する。",
    "reading": "月平均気温は11月の28.2℃から4月の29.8℃まで変化する。月降水量は11月が293.7mm、2月が66.0mm。12か月の降水量平年値の合計は2,250.1mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。"
  },
  {
    "id": "astana",
    "regionId": "south-central-asia",
    "countryCode": "KAZ",
    "name": "アスタナ",
    "stationId": "35188",
    "stationName": "ASTANA",
    "coordinates": [
      71.37,
      51.13
    ],
    "elevationM": 350.0,
    "temperatureC": [
      -14.5,
      -13.5,
      -6.0,
      6.6,
      14.5,
      19.6,
      20.7,
      19.2,
      12.6,
      5.2,
      -5.2,
      -12.0
    ],
    "precipitationMm": [
      18.3,
      16.5,
      19.2,
      22.1,
      33.8,
      41.1,
      53.8,
      29.4,
      20.9,
      26.6,
      27.3,
      24.6
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml.php?n=35188&y=2025&m=12&e=6&r=1&s=1&k=0",
    "sourceName": "気象庁 ClimatView（CLIMAT・GHCNに基づく平年値）",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
    "sourceSha256": [
      "ff9a9f940d0ab29fe8bed1233da803d1879103c3d7d8512f4b0caeffea32353b"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": []
    },
    "notes": [],
    "summary": "最寒月は-14.5℃。夏と冬の気温差が大きい。",
    "reading": "月平均気温は1月の-14.5℃から7月の20.7℃まで変化する。月降水量は7月が53.8mm、2月が16.5mm。12か月の降水量平年値の合計は333.6mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。"
  },
  {
    "id": "almaty",
    "regionId": "south-central-asia",
    "countryCode": "KAZ",
    "name": "アルマトイ",
    "stationId": "36870",
    "stationName": "ALMATY",
    "coordinates": [
      76.93,
      43.23
    ],
    "elevationM": 851.0,
    "temperatureC": [
      -4.5,
      -2.4,
      4.3,
      12.1,
      17.1,
      22.1,
      24.5,
      23.3,
      18.0,
      10.5,
      2.9,
      -2.7
    ],
    "precipitationMm": [
      35.2,
      42.7,
      71.9,
      108.8,
      98.8,
      59.8,
      42.2,
      33.4,
      27.7,
      49.8,
      55.3,
      44.9
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml.php?n=36870&y=2025&m=12&e=6&r=1&s=1&k=0",
    "sourceName": "気象庁 ClimatView（CLIMAT・GHCNに基づく平年値）",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
    "sourceSha256": [
      "2d277e7ee454964bf91444d879b11ac5824aa916646a82e3fa7349061ac924de"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": []
    },
    "notes": [],
    "summary": "最寒月は-4.5℃。夏と冬の気温差が大きい。",
    "reading": "月平均気温は1月の-4.5℃から7月の24.5℃まで変化する。月降水量は4月が108.8mm、9月が27.7mm。12か月の降水量平年値の合計は670.5mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。"
  },
  {
    "id": "tashkent",
    "regionId": "south-central-asia",
    "countryCode": "UZB",
    "name": "タシケント",
    "stationId": "38457",
    "stationName": "TASHKENT",
    "coordinates": [
      69.3,
      41.33
    ],
    "elevationM": 488.0,
    "temperatureC": [
      2.4,
      4.5,
      10.5,
      16.1,
      21.5,
      26.3,
      28.3,
      26.9,
      21.4,
      14.6,
      7.9,
      3.4
    ],
    "precipitationMm": [
      56.4,
      70.4,
      70.5,
      60.5,
      35.5,
      15.9,
      3.5,
      2.2,
      4.0,
      26.4,
      55.3,
      54.1
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml.php?n=38457&y=2025&m=12&e=6&r=1&s=1&k=0",
    "sourceName": "気象庁 ClimatView（CLIMAT・GHCNに基づく平年値）",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
    "sourceSha256": [
      "7774af39cfa437804fb297cba3b8e68f3b8ad264665a1c54c3103ff24b75379e"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": []
    },
    "notes": [],
    "summary": "3月の雨が多く、8月との季節差がある。",
    "reading": "月平均気温は1月の2.4℃から7月の28.3℃まで変化する。月降水量は3月が70.5mm、8月が2.2mm。12か月の降水量平年値の合計は454.7mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。"
  },
  {
    "id": "bishkek",
    "regionId": "south-central-asia",
    "countryCode": "KGZ",
    "name": "ビシュケク",
    "stationId": "38353",
    "stationName": "BISHKEK",
    "coordinates": [
      74.53,
      42.85
    ],
    "elevationM": 756.0,
    "temperatureC": [
      -2.6,
      -0.5,
      6.2,
      12.8,
      17.9,
      22.9,
      25.5,
      24.2,
      18.6,
      11.6,
      4.3,
      -1.0
    ],
    "precipitationMm": [
      28.2,
      38.0,
      52.5,
      77.4,
      64.5,
      37.9,
      19.2,
      14.2,
      19.4,
      38.4,
      46.0,
      37.9
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml.php?n=38353&y=2025&m=12&e=6&r=1&s=1&k=0",
    "sourceName": "気象庁 ClimatView（CLIMAT・GHCNに基づく平年値）",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
    "sourceSha256": [
      "092a641126037ccc08ce021e4509b4e6f36bffb65e827c9cf559d1e02d737df1"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": []
    },
    "notes": [],
    "summary": "最寒月は-2.6℃。夏と冬の気温差が大きい。",
    "reading": "月平均気温は1月の-2.6℃から7月の25.5℃まで変化する。月降水量は4月が77.4mm、8月が14.2mm。12か月の降水量平年値の合計は473.6mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。"
  },
  {
    "id": "khujand",
    "regionId": "south-central-asia",
    "countryCode": "TJK",
    "name": "ホジェンド",
    "stationId": "38599",
    "stationName": "KHUDJANT",
    "coordinates": [
      69.73,
      40.22
    ],
    "elevationM": 427.0,
    "temperatureC": [
      0.5,
      3.3,
      9.6,
      16.6,
      22.2,
      26.9,
      28.9,
      26.7,
      21.4,
      14.4,
      7.1,
      2.2
    ],
    "precipitationMm": [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml.php?n=38599&y=2025&m=12&e=6&r=1&s=1&k=0",
    "sourceName": "気象庁 ClimatView（CLIMAT・GHCNに基づく平年値）",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
    "sourceSha256": [
      "f0551f8838d1d8f549aa0c150ce369867649c87006b3c8b9ab365a93dbc7915d"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": [
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12
      ]
    },
    "notes": [],
    "summary": "気温の季節差を読む。降水量の平年値は未収録。",
    "reading": "月平均気温は1月の0.5℃から7月の28.9℃まで変化する。採用元では12か月すべての降水量平年値が欠けるため、降水量の棒や年間合計は表示しない。気温は掲載した観測所の平年値で、都市全域の平均ではない。"
  },
  {
    "id": "ashgabat",
    "regionId": "south-central-asia",
    "countryCode": "TKM",
    "name": "アシガバート",
    "stationId": "38880",
    "stationName": "ASHGABAT",
    "coordinates": [
      58.35,
      37.98
    ],
    "elevationM": 312.0,
    "temperatureC": [
      3.4,
      4.5,
      11.6,
      16.5,
      23.7,
      28.8,
      30.8,
      28.6,
      23.1,
      15.9,
      8.4,
      4.1
    ],
    "precipitationMm": [
      17.7,
      51.8,
      41.2,
      40.5,
      22.2,
      9.5,
      2.6,
      1.5,
      3.8,
      13.4,
      21.0,
      14.8
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml.php?n=38880&y=2025&m=12&e=6&r=1&s=1&k=0",
    "sourceName": "気象庁 ClimatView（CLIMAT・GHCNに基づく平年値）",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
    "sourceSha256": [
      "95d5d9e978e11d5d1193f3d3209155f12d7b66c02e9d27821020d693f8385bfa"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": []
    },
    "notes": [],
    "summary": "2月の雨が多く、8月との季節差がある。",
    "reading": "月平均気温は1月の3.4℃から7月の30.8℃まで変化する。月降水量は2月が51.8mm、8月が1.5mm。12か月の降水量平年値の合計は240.0mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。"
  },
  {
    "id": "taipei",
    "regionId": "east-asia",
    "countryCode": "TWN",
    "name": "台北",
    "stationId": "466920",
    "stationName": "臺北（Taipei）",
    "coordinates": [
      121.514853,
      25.037658
    ],
    "elevationM": 6.3,
    "temperatureC": [
      16.4,
      16.9,
      18.8,
      22.3,
      25.6,
      28.2,
      29.9,
      29.5,
      27.7,
      24.6,
      21.9,
      18.2
    ],
    "precipitationMm": [
      90.5,
      143.2,
      157.2,
      152.5,
      239.9,
      345.0,
      226.1,
      337.8,
      315.2,
      150.2,
      83.2,
      88.7
    ],
    "normalPeriod": "1991–2020",
    "sourceUrl": "https://www.cwa.gov.tw/V8/C/C/Statistics/monthlymean.html",
    "sourceName": "台湾・中央気象署 気候月平均（1991–2020）",
    "sourceRetrievedAt": "2026-09-25",
    "sourceTermsUrl": "https://www.cwa.gov.tw/V8/C/information.html",
    "sourceSha256": [
      "0eaa4cab7f3e100ce7c964a04fc9dada509c966d81a366e52c3389c8a0bb071a",
      "f1f67202b2cf8f10c139fcdffb33e7fbba37d90ef8b299faf8e3d8d5cf89717a"
    ],
    "additionalSourceUrls": [
      "https://www.cwa.gov.tw/V8/C/C/Statistics/MonthlyMean/MOD/Taiwan_tx.html",
      "https://www.cwa.gov.tw/V8/C/C/Statistics/MonthlyMean/MOD/Taiwan_precp.html",
      "https://hdps.cwa.gov.tw/static/state.html"
    ],
    "missingMonths": {
      "temperature": [],
      "precipitation": []
    },
    "notes": [
      "降水量は中央気象署の平均値表を採用し、別提供の中央値は使用しない。",
      "観測所位置は中央気象署の測站一覧。1992年2月〜1997年8月は庁舎改築のため観測場所の移転があった。"
    ],
    "summary": "6月の雨が多く、11月との季節差がある。",
    "reading": "月平均気温は1月の16.4℃から7月の29.9℃まで変化する。月降水量は6月が345.0mm、11月が83.2mm。12か月の降水量平年値の合計は2,329.5mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。"
  }
];
