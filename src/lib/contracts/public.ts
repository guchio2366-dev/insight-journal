import { regions, topics } from "../../data/taxonomy.ts";

export type PublicKind = "article" | "theme";
export type Verification = "confirmed" | "unconfirmed";
export type DatePrecision = "day" | "month" | "year" | "range" | "approximate" | "unknown";

export interface HistoricalDate {
  year: number;
  month?: number;
  day?: number;
}

export interface Source {
  id: string;
  title: string;
  publisher: string;
  url: string;
  publishedOn: string | null;
  accessedOn: string;
  locator: string | null;
  verification: Verification;
}

export interface MapPoint {
  label: string;
  longitude: number;
  latitude: number;
  sourceIds: string[];
}

export type Geography =
  | { mode: "none"; reason: string }
  | {
      mode: "map";
      caption: string;
      alt: string;
      bounds: { west: number; south: number; east: number; north: number };
      points: MapPoint[];
      highlightCountries: string[];
      baseMap: {
        name: string;
        scale: string;
        version: string;
        sourceUrl: string;
        sha256: string;
      };
      image: {
        path: string;
        sha256: string;
        width: number;
        height: number;
        bytes: number;
        alt: string;
      };
    };

export interface TimelineEvent {
  id: string;
  dateLabel: string;
  start: HistoricalDate | null;
  end: HistoricalDate | null;
  precision: DatePrecision;
  title: string;
  description: string;
  sourceIds: string[];
}

export interface PublicPayload {
  schemaVersion: 1;
  kind: PublicKind;
  publicId: string;
  slug: string;
  title: string;
  summary: string;
  topics: string[];
  countries: string[];
  regions: string[];
  themeIds: string[];
  publishedAt: string;
  updatedAt: string;
  revision: number;
  bodyMarkdown: string;
  sources: Source[];
  geography: Geography;
  timeline: TimelineEvent[];
  timelineOmissionReason: string | null;
  relatedPublicIds: string[];
  changeNote: string | null;
}

export type PublicFrontmatter = Omit<PublicPayload, "bodyMarkdown">;

export interface ValidationIssue {
  path: string;
  message: string;
}

export const PUBLIC_PAYLOAD_KEYS = [
  "schemaVersion", "kind", "publicId", "slug", "title", "summary", "topics",
  "countries", "regions", "themeIds", "publishedAt", "updatedAt", "revision",
  "bodyMarkdown", "sources", "geography", "timeline", "timelineOmissionReason",
  "relatedPublicIds", "changeNote"
] as const satisfies readonly (keyof PublicPayload)[];

export const PUBLIC_ID_PATTERN = /^[at]-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const ARTICLE_ID_PATTERN = /^a-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const THEME_ID_PATTERN = /^t-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const SOURCE_ID_PATTERN = /^s[1-9]\d*$/;
export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,78}[a-z0-9])$/;
export const SHA256_PATTERN = /^[0-9a-f]{64}$/;
export const PUBLIC_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z)?$/;

const FRONTMATTER_KEYS = PUBLIC_PAYLOAD_KEYS.filter((key) => key !== "bodyMarkdown");
const PRIVATE_PATTERNS = [
  /PRIVATE_SENTINEL/i,
  /notion\.so|app\.notion\.com/i,
  /chatgpt\.com\/share|chat\.openai\.com\/share/i,
  /(?:secret|token|api[_-]?key)\s*[:=]/i
];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

function containsPrivateMaterial(value: unknown, seen = new WeakSet<object>()): boolean {
  if (typeof value === "string") return PRIVATE_PATTERNS.some((pattern) => pattern.test(value));
  if (typeof value !== "object" || value === null) return false;
  if (seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) return value.some((item) => containsPrivateMaterial(item, seen));
  return Object.entries(value).some(([key, item]) =>
    PRIVATE_PATTERNS.some((pattern) => pattern.test(key)) || containsPrivateMaterial(item, seen)
  );
}

function hasExactKeys(
  value: Record<string, unknown>,
  path: string,
  keys: readonly string[],
  issues: ValidationIssue[]
): void {
  const allowed = new Set(keys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) issues.push({ path: `${path}.${key}`, message: "公開契約にない項目です" });
  }
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) issues.push({ path: `${path}.${key}`, message: "必須項目です" });
  }
}

function validateText(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  { min = 1, max }: { min?: number; max: number }
): value is string {
  if (typeof value !== "string" || value.trim().length < min || value.length > max) {
    issues.push({ path, message: `${min}〜${max}文字が必要です` });
    return false;
  }
  return true;
}

function daysInMonth(month: number, year?: number): number {
  if (month === 2) {
    if (year === undefined) return 29;
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return leap ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function isPublicDateString(value: unknown): value is string {
  if (typeof value !== "string" || !PUBLIC_DATE_PATTERN.test(value)) return false;
  const [datePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  if (year === 0 || month < 1 || month > 12 || day < 1 || day > daysInMonth(month, year)) return false;
  return !value.includes("T") || Number.isFinite(Date.parse(value));
}

function publicDateEpoch(value: string): number {
  return Date.parse(value.length === 10 ? `${value}T00:00:00Z` : value);
}

function publicDateIsBefore(left: string, right: string): boolean {
  if (left.length === 10 || right.length === 10) return left.slice(0, 10) < right.slice(0, 10);
  return publicDateEpoch(left) < publicDateEpoch(right);
}

function uniqueStrings(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  { min = 0, max = Number.POSITIVE_INFINITY }: { min?: number; max?: number } = {}
): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    issues.push({ path, message: "文字列配列が必要です" });
    return [];
  }
  const strings = value as string[];
  if (strings.length < min || strings.length > max) {
    issues.push({ path, message: `${min}〜${max === Number.POSITIVE_INFINITY ? "任意" : max}件が必要です` });
  }
  if (new Set(strings).size !== strings.length) issues.push({ path, message: "重複値があります" });
  return strings;
}

function validateHistoricalDate(value: unknown, path: string, issues: ValidationIssue[]): value is HistoricalDate {
  if (!isObject(value)) {
    issues.push({ path, message: "年を含むオブジェクトが必要です" });
    return false;
  }
  hasExactKeys(value, path, ["year", ...(value.month !== undefined ? ["month"] : []), ...(value.day !== undefined ? ["day"] : [])], issues);
  let valid = true;
  if (!Number.isInteger(value.year) || Number(value.year) === 0 || Math.abs(Number(value.year)) > 9999) {
    issues.push({ path: `${path}.year`, message: "-9999〜9999の範囲にある0以外の整数が必要です" });
    valid = false;
  }
  if (value.month !== undefined && (!Number.isInteger(value.month) || Number(value.month) < 1 || Number(value.month) > 12)) {
    issues.push({ path: `${path}.month`, message: "1〜12の整数が必要です" });
    valid = false;
  }
  if (value.day !== undefined) {
    const maximum = Number.isInteger(value.month) && Number(value.month) >= 1 && Number(value.month) <= 12
      ? daysInMonth(Number(value.month))
      : 31;
    if (!Number.isInteger(value.day) || Number(value.day) < 1 || Number(value.day) > maximum) {
      issues.push({ path: `${path}.day`, message: `1〜${maximum}の整数が必要です` });
      valid = false;
    }
    if (value.month === undefined) {
      issues.push({ path, message: "日を指定する場合は月も必要です" });
      valid = false;
    }
  }
  return valid;
}

function historicalKey(value: HistoricalDate): [number, number, number] {
  return [value.year, value.month ?? 1, value.day ?? 1];
}

function compareHistoricalDates(left: HistoricalDate, right: HistoricalDate): number {
  const a = historicalKey(left);
  const b = historicalKey(right);
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

function validateSourceReferences(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  referencedIds: Set<string>
): void {
  const ids = uniqueStrings(value, path, issues);
  ids.forEach((id, index) => {
    if (!SOURCE_ID_PATTERN.test(id)) issues.push({ path: `${path}[${index}]`, message: "s1形式が必要です" });
    else referencedIds.add(id);
  });
}

function isSafeHttpsUrl(value: string): boolean {
  if (value !== value.trim() || /[\u0000-\u001f\u007f\\]/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.username === "" && url.password === "" && url.hostname.length > 0;
  } catch {
    return false;
  }
}

function validatePublicPayloadObject(value: Record<string, unknown>, issues: ValidationIssue[]): void {
  hasExactKeys(value, "$", PUBLIC_PAYLOAD_KEYS, issues);

  if (value.schemaVersion !== 1) issues.push({ path: "$.schemaVersion", message: "1である必要があります" });
  if (value.kind !== "article" && value.kind !== "theme") issues.push({ path: "$.kind", message: "articleまたはthemeが必要です" });
  if (typeof value.publicId !== "string" || !PUBLIC_ID_PATTERN.test(value.publicId)) {
    issues.push({ path: "$.publicId", message: "a-またはt-で始まる小文字UUIDが必要です" });
  } else if ((value.kind === "article" && !value.publicId.startsWith("a-")) || (value.kind === "theme" && !value.publicId.startsWith("t-"))) {
    issues.push({ path: "$.publicId", message: "kindに対応する接頭辞が必要です" });
  }
  if (typeof value.slug !== "string" || !SLUG_PATTERN.test(value.slug)) issues.push({ path: "$.slug", message: "3〜80文字の英小文字・数字・ハイフンが必要です" });
  validateText(value.title, "$.title", issues, { max: 100 });
  validateText(value.summary, "$.summary", issues, { max: 300 });

  const topicValues = uniqueStrings(value.topics, "$.topics", issues, { min: 1 });
  topicValues.forEach((topic, index) => {
    if (!Object.prototype.hasOwnProperty.call(topics, topic)) issues.push({ path: `$.topics[${index}]`, message: `未知の分類です: ${topic}` });
  });
  const countryValues = uniqueStrings(value.countries, "$.countries", issues);
  countryValues.forEach((country, index) => {
    if (!/^[A-Z]{2}$/.test(country)) issues.push({ path: `$.countries[${index}]`, message: `国コードが不正です: ${country}` });
  });
  const regionValues = uniqueStrings(value.regions, "$.regions", issues);
  regionValues.forEach((region, index) => {
    if (!Object.prototype.hasOwnProperty.call(regions, region)) issues.push({ path: `$.regions[${index}]`, message: `未知の地域です: ${region}` });
  });
  const themeIds = uniqueStrings(value.themeIds, "$.themeIds", issues);
  themeIds.forEach((id, index) => {
    if (!THEME_ID_PATTERN.test(id)) issues.push({ path: `$.themeIds[${index}]`, message: "t-で始まる小文字UUIDが必要です" });
    if (id === value.publicId) issues.push({ path: `$.themeIds[${index}]`, message: "自分自身は指定できません" });
  });

  if (!isPublicDateString(value.publishedAt)) issues.push({ path: "$.publishedAt", message: "実在するISO日付またはUTC日時が必要です" });
  if (!isPublicDateString(value.updatedAt)) issues.push({ path: "$.updatedAt", message: "実在するISO日付またはUTC日時が必要です" });
  if (isPublicDateString(value.publishedAt) && isPublicDateString(value.updatedAt)
    && publicDateIsBefore(value.updatedAt, value.publishedAt)) {
    issues.push({ path: "$.updatedAt", message: "初回公開日より前にはできません" });
  }
  if (!Number.isInteger(value.revision) || Number(value.revision) < 1) issues.push({ path: "$.revision", message: "1以上の整数が必要です" });
  validateText(value.bodyMarkdown, "$.bodyMarkdown", issues, { max: 30_000 });

  const body = typeof value.bodyMarkdown === "string" ? value.bodyMarkdown : "";
  if (/<\/?(?:script|iframe|object|embed|style)\b/i.test(body) || /<\/?[a-z][^>]*>/i.test(body)) issues.push({ path: "$.bodyMarkdown", message: "生HTMLは使用できません" });
  if (/\]\(\s*(?:javascript|data|vbscript):/i.test(body)) issues.push({ path: "$.bodyMarkdown", message: "危険なリンク形式です" });
  if (containsPrivateMaterial(value)) issues.push({ path: "$", message: "非公開情報または検証用文字列を含んでいます" });

  const sourceIds = new Set<string>();
  if (!Array.isArray(value.sources)) {
    issues.push({ path: "$.sources", message: "配列が必要です" });
  } else {
    value.sources.forEach((source, index) => {
      const path = `$.sources[${index}]`;
      if (!isObject(source)) {
        issues.push({ path, message: "オブジェクトが必要です" });
        return;
      }
      hasExactKeys(source, path, ["id", "title", "publisher", "url", "publishedOn", "accessedOn", "locator", "verification"], issues);
      if (typeof source.id !== "string" || !SOURCE_ID_PATTERN.test(source.id)) issues.push({ path: `${path}.id`, message: "s1形式が必要です" });
      else if (sourceIds.has(source.id)) issues.push({ path: `${path}.id`, message: "重複IDです" });
      else sourceIds.add(source.id);
      validateText(source.title, `${path}.title`, issues, { max: 300 });
      validateText(source.publisher, `${path}.publisher`, issues, { max: 160 });
      if (typeof source.url !== "string" || !isSafeHttpsUrl(source.url)) issues.push({ path: `${path}.url`, message: "認証情報を含まないhttps URLが必要です" });
      if (source.publishedOn !== null && !isPublicDateString(source.publishedOn)) issues.push({ path: `${path}.publishedOn`, message: "実在する日付、UTC日時、またはnullが必要です" });
      if (!isPublicDateString(source.accessedOn)) issues.push({ path: `${path}.accessedOn`, message: "実在する日付またはUTC日時が必要です" });
      if (isPublicDateString(source.publishedOn) && isPublicDateString(source.accessedOn)
        && publicDateIsBefore(source.accessedOn, source.publishedOn)) {
        issues.push({ path: `${path}.accessedOn`, message: "公表日より前にはできません" });
      }
      if (source.locator !== null && (typeof source.locator !== "string" || source.locator.trim().length === 0 || source.locator.length > 300)) issues.push({ path: `${path}.locator`, message: "1〜300文字またはnullが必要です" });
      if (source.verification !== "confirmed" && source.verification !== "unconfirmed") issues.push({ path: `${path}.verification`, message: "confirmedまたはunconfirmedが必要です" });
    });
  }

  const referencedIds = new Set<string>();
  for (const match of body.matchAll(/#source-(s[1-9]\d*)/g)) referencedIds.add(match[1]);

  if (!isObject(value.geography) || (value.geography.mode !== "none" && value.geography.mode !== "map")) {
    issues.push({ path: "$.geography", message: "modeが必要です" });
  } else if (value.geography.mode === "none") {
    hasExactKeys(value.geography, "$.geography", ["mode", "reason"], issues);
    validateText(value.geography.reason, "$.geography.reason", issues, { max: 300 });
  } else {
    const geography = value.geography;
    hasExactKeys(geography, "$.geography", ["mode", "caption", "alt", "bounds", "points", "highlightCountries", "baseMap", "image"], issues);
    validateText(geography.caption, "$.geography.caption", issues, { max: 180 });
    validateText(geography.alt, "$.geography.alt", issues, { max: 300 });
    const bounds = geography.bounds;
    let boundsAreValid = false;
    if (!isObject(bounds)) {
      issues.push({ path: "$.geography.bounds", message: "4方向の数値が必要です" });
    } else {
      hasExactKeys(bounds, "$.geography.bounds", ["west", "south", "east", "north"], issues);
      const rangeValid = isFiniteNumber(bounds.west) && bounds.west >= -180 && bounds.west <= 180
        && isFiniteNumber(bounds.east) && bounds.east >= -180 && bounds.east <= 180
        && isFiniteNumber(bounds.south) && bounds.south >= -90 && bounds.south <= 90
        && isFiniteNumber(bounds.north) && bounds.north >= -90 && bounds.north <= 90;
      if (!rangeValid) issues.push({ path: "$.geography.bounds", message: "緯度経度の範囲外です" });
      else if (bounds.west >= bounds.east || bounds.south >= bounds.north) issues.push({ path: "$.geography.bounds", message: "初期版ではwestをeast未満、southをnorth未満にします" });
      else boundsAreValid = true;
    }
    const highlighted = uniqueStrings(geography.highlightCountries, "$.geography.highlightCountries", issues);
    highlighted.forEach((country, index) => {
      if (!/^[A-Z]{2}$/.test(country)) issues.push({ path: `$.geography.highlightCountries[${index}]`, message: "ISO 3166-1 alpha-2形式が必要です" });
    });
    if (!Array.isArray(geography.points)) {
      issues.push({ path: "$.geography.points", message: "配列が必要です" });
    } else {
      if (geography.points.length > 20) issues.push({ path: "$.geography.points", message: "20件以内が必要です" });
      geography.points.forEach((point, index) => {
        const path = `$.geography.points[${index}]`;
        if (!isObject(point)) {
          issues.push({ path, message: "オブジェクトが必要です" });
          return;
        }
        hasExactKeys(point, path, ["label", "longitude", "latitude", "sourceIds"], issues);
        validateText(point.label, `${path}.label`, issues, { max: 80 });
        if (!isFiniteNumber(point.longitude) || point.longitude < -180 || point.longitude > 180) issues.push({ path: `${path}.longitude`, message: "経度の範囲外です" });
        if (!isFiniteNumber(point.latitude) || point.latitude < -90 || point.latitude > 90) issues.push({ path: `${path}.latitude`, message: "緯度の範囲外です" });
        if (boundsAreValid && isFiniteNumber(point.longitude) && isFiniteNumber(point.latitude)) {
          const west = Number((bounds as Record<string, unknown>).west);
          const east = Number((bounds as Record<string, unknown>).east);
          const longitudeInside = point.longitude >= west && point.longitude <= east;
          if (!longitudeInside
            || point.latitude < Number((bounds as Record<string, unknown>).south)
            || point.latitude > Number((bounds as Record<string, unknown>).north)) {
            issues.push({ path, message: "地点が地図の表示範囲外です" });
          }
        }
        validateSourceReferences(point.sourceIds, `${path}.sourceIds`, issues, referencedIds);
      });
    }
    if (Array.isArray(geography.points) && geography.points.length === 0 && highlighted.length === 0) issues.push({ path: "$.geography", message: "地点または強調する国が1件以上必要です" });
    if (!isObject(geography.baseMap)) {
      issues.push({ path: "$.geography.baseMap", message: "基図情報が必要です" });
    } else {
      hasExactKeys(geography.baseMap, "$.geography.baseMap", ["name", "scale", "version", "sourceUrl", "sha256"], issues);
      validateText(geography.baseMap.name, "$.geography.baseMap.name", issues, { max: 120 });
      validateText(geography.baseMap.scale, "$.geography.baseMap.scale", issues, { max: 40 });
      validateText(geography.baseMap.version, "$.geography.baseMap.version", issues, { max: 40 });
      if (typeof geography.baseMap.sourceUrl !== "string" || !isSafeHttpsUrl(geography.baseMap.sourceUrl)) issues.push({ path: "$.geography.baseMap.sourceUrl", message: "認証情報を含まないhttps URLが必要です" });
      if (typeof geography.baseMap.sha256 !== "string" || !SHA256_PATTERN.test(geography.baseMap.sha256)) issues.push({ path: "$.geography.baseMap.sha256", message: "小文字64桁のSHA-256が必要です" });
    }
    if (!isObject(geography.image)) {
      issues.push({ path: "$.geography.image", message: "画像情報が必要です" });
    } else {
      const image = geography.image;
      hasExactKeys(image, "$.geography.image", ["path", "sha256", "width", "height", "bytes", "alt"], issues);
      const expectedPath = typeof value.publicId === "string" && typeof image.sha256 === "string" && SHA256_PATTERN.test(image.sha256)
        ? `assets/${value.publicId}/${image.sha256.slice(0, 12)}.png`
        : null;
      if (typeof image.path !== "string" || image.path !== expectedPath) issues.push({ path: "$.geography.image.path", message: "公開IDと画像SHA-256先頭12桁を含むパスが必要です" });
      if (typeof image.sha256 !== "string" || !SHA256_PATTERN.test(image.sha256)) issues.push({ path: "$.geography.image.sha256", message: "小文字64桁のSHA-256が必要です" });
      if (!Number.isInteger(image.width) || Number(image.width) < 800 || Number(image.width) > 10_000) issues.push({ path: "$.geography.image.width", message: "800〜10,000の整数が必要です" });
      if (!Number.isInteger(image.height) || Number(image.height) < 450 || Number(image.height) > 10_000) issues.push({ path: "$.geography.image.height", message: "450〜10,000の整数が必要です" });
      if (!Number.isInteger(image.bytes) || Number(image.bytes) < 1 || Number(image.bytes) >= 5_000_000) issues.push({ path: "$.geography.image.bytes", message: "1以上5MB未満の整数が必要です" });
      validateText(image.alt, "$.geography.image.alt", issues, { max: 300 });
      if (typeof image.alt === "string" && typeof geography.alt === "string" && image.alt !== geography.alt) issues.push({ path: "$.geography.image.alt", message: "geography.altと一致させます" });
    }
  }

  if (!Array.isArray(value.timeline)) {
    issues.push({ path: "$.timeline", message: "15件以内の配列が必要です" });
  } else {
    if (value.timeline.length > 15) issues.push({ path: "$.timeline", message: "15件以内の配列が必要です" });
    const eventIds = new Set<string>();
    value.timeline.forEach((event, index) => {
      const path = `$.timeline[${index}]`;
      if (!isObject(event)) {
        issues.push({ path, message: "オブジェクトが必要です" });
        return;
      }
      hasExactKeys(event, path, ["id", "dateLabel", "start", "end", "precision", "title", "description", "sourceIds"], issues);
      if (typeof event.id !== "string" || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(event.id)) issues.push({ path: `${path}.id`, message: "1〜80文字の英小文字・数字・ハイフンが必要です" });
      else if (eventIds.has(event.id)) issues.push({ path: `${path}.id`, message: "重複IDです" });
      else eventIds.add(event.id);
      validateText(event.dateLabel, `${path}.dateLabel`, issues, { max: 40 });
      validateText(event.title, `${path}.title`, issues, { max: 100 });
      validateText(event.description, `${path}.description`, issues, { max: 180 });
      if (typeof event.precision !== "string" || !["day", "month", "year", "range", "approximate", "unknown"].includes(event.precision)) issues.push({ path: `${path}.precision`, message: "定義済みの精度が必要です" });
      const startValid = event.start !== null && validateHistoricalDate(event.start, `${path}.start`, issues);
      const endValid = event.end !== null && validateHistoricalDate(event.end, `${path}.end`, issues);
      if (event.precision === "unknown") {
        if (event.start !== null || event.end !== null) issues.push({ path, message: "unknownでは開始・終了をnullにします" });
      } else if (event.precision === "range") {
        if (!startValid || !endValid) issues.push({ path, message: "rangeでは開始・終了の両方が必要です" });
      } else {
        if (!startValid) issues.push({ path: `${path}.start`, message: "unknown以外では開始日が必要です" });
        if (event.end !== null) issues.push({ path: `${path}.end`, message: "range以外ではnullにします" });
      }
      if (startValid && endValid && compareHistoricalDates(event.start as HistoricalDate, event.end as HistoricalDate) > 0) issues.push({ path: `${path}.end`, message: "開始日以後にします" });
      if (startValid && event.precision === "day" && (!(event.start as HistoricalDate).month || !(event.start as HistoricalDate).day)) issues.push({ path: `${path}.start`, message: "dayでは年月日が必要です" });
      if (startValid && event.precision === "month" && (!(event.start as HistoricalDate).month || (event.start as HistoricalDate).day !== undefined)) issues.push({ path: `${path}.start`, message: "monthでは年と月だけが必要です" });
      if (startValid && event.precision === "year" && ((event.start as HistoricalDate).month !== undefined || (event.start as HistoricalDate).day !== undefined)) issues.push({ path: `${path}.start`, message: "yearでは年だけが必要です" });
      validateSourceReferences(event.sourceIds, `${path}.sourceIds`, issues, referencedIds);
    });
  }

  if (Array.isArray(value.timeline) && value.timeline.length === 0) validateText(value.timelineOmissionReason, "$.timelineOmissionReason", issues, { max: 300 });
  else if (value.timelineOmissionReason !== null) issues.push({ path: "$.timelineOmissionReason", message: "年表がある場合はnullにします" });

  const relatedIds = uniqueStrings(value.relatedPublicIds, "$.relatedPublicIds", issues, { max: 6 });
  relatedIds.forEach((id, index) => {
    if (!ARTICLE_ID_PATTERN.test(id)) issues.push({ path: `$.relatedPublicIds[${index}]`, message: "a-で始まる公開記事IDが必要です" });
    if (id === value.publicId) issues.push({ path: `$.relatedPublicIds[${index}]`, message: "自分自身は指定できません" });
  });
  if (value.changeNote !== null && (typeof value.changeNote !== "string" || value.changeNote.trim().length === 0 || value.changeNote.length > 300)) issues.push({ path: "$.changeNote", message: "1〜300文字またはnullが必要です" });

  for (const id of referencedIds) if (!sourceIds.has(id)) issues.push({ path: "$", message: `存在しない出典参照です: ${id}` });
}

export function validatePublicPayload(value: unknown): ValidationIssue[] {
  if (!isObject(value)) return [{ path: "$", message: "オブジェクトが必要です" }];
  const issues: ValidationIssue[] = [];
  validatePublicPayloadObject(value, issues);
  return issues;
}

export function validatePublicFrontmatter(value: unknown): ValidationIssue[] {
  if (!isObject(value)) return [{ path: "$", message: "オブジェクトが必要です" }];
  const issues: ValidationIssue[] = [];
  hasExactKeys(value, "$", FRONTMATTER_KEYS, issues);
  const candidate = { ...value, bodyMarkdown: "本文" };
  const payloadIssues = validatePublicPayload(candidate).filter((issue) => issue.path !== "$.bodyMarkdown" && !issue.path.startsWith("$.bodyMarkdown."));
  return [...issues, ...payloadIssues.filter((issue) => !issues.some((existing) => existing.path === issue.path && existing.message === issue.message))];
}

export function assertPublicPayload(value: unknown): asserts value is PublicPayload {
  const issues = validatePublicPayload(value);
  if (issues.length) throw new Error(issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n"));
}

const isoDateSchema = { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}(?:T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{3})?Z)?$" } as const;
const publicIdSchema = { type: "string", pattern: "^[at]-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$" } as const;
const articleIdSchema = { type: "string", pattern: "^a-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$" } as const;
const sourceIdArraySchema = { type: "array", uniqueItems: true, items: { type: "string", pattern: "^s[1-9]\\d*$" } } as const;
const historicalDateSchema = {
  type: "object", additionalProperties: false, required: ["year"],
  properties: {
    year: { type: "integer", minimum: -9999, maximum: 9999, not: { const: 0 } },
    month: { type: "integer", minimum: 1, maximum: 12 },
    day: { type: "integer", minimum: 1, maximum: 31 }
  },
  dependentRequired: { day: ["month"] }
} as const;

/** Machine-readable shape. Runtime validation additionally checks dates, ordering, references and hash-derived paths. */
export const publicPayloadJsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://guchio2366-dev.github.io/insight-journal/schema/public-payload-v1.json",
  title: "Insight Journal PublicPayload v1",
  type: "object",
  additionalProperties: false,
  required: [...PUBLIC_PAYLOAD_KEYS],
  properties: {
    schemaVersion: { const: 1 },
    kind: { enum: ["article", "theme"] },
    publicId: publicIdSchema,
    slug: { type: "string", minLength: 3, maxLength: 80, pattern: "^[a-z0-9](?:[a-z0-9-]{1,78}[a-z0-9])$" },
    title: { type: "string", minLength: 1, maxLength: 100 },
    summary: { type: "string", minLength: 1, maxLength: 300 },
    topics: { type: "array", minItems: 1, uniqueItems: true, items: { enum: Object.keys(topics) } },
    countries: { type: "array", uniqueItems: true, items: { type: "string", pattern: "^[A-Z]{2}$" } },
    regions: { type: "array", uniqueItems: true, items: { enum: Object.keys(regions) } },
    themeIds: { type: "array", uniqueItems: true, items: { type: "string", pattern: "^t-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$" } },
    publishedAt: isoDateSchema,
    updatedAt: isoDateSchema,
    revision: { type: "integer", minimum: 1 },
    bodyMarkdown: { type: "string", minLength: 1, maxLength: 30000 },
    sources: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        required: ["id", "title", "publisher", "url", "publishedOn", "accessedOn", "locator", "verification"],
        properties: {
          id: { type: "string", pattern: "^s[1-9]\\d*$" }, title: { type: "string", minLength: 1, maxLength: 300 },
          publisher: { type: "string", minLength: 1, maxLength: 160 }, url: { type: "string", format: "uri", pattern: "^https://" },
          publishedOn: { oneOf: [isoDateSchema, { type: "null" }] }, accessedOn: isoDateSchema,
          locator: { oneOf: [{ type: "string", minLength: 1, maxLength: 300 }, { type: "null" }] },
          verification: { enum: ["confirmed", "unconfirmed"] }
        }
      }
    },
    geography: {
      oneOf: [
        { type: "object", additionalProperties: false, required: ["mode", "reason"], properties: { mode: { const: "none" }, reason: { type: "string", minLength: 1, maxLength: 300 } } },
        {
          type: "object", additionalProperties: false,
          required: ["mode", "caption", "alt", "bounds", "points", "highlightCountries", "baseMap", "image"],
          properties: {
            mode: { const: "map" }, caption: { type: "string", minLength: 1, maxLength: 180 }, alt: { type: "string", minLength: 1, maxLength: 300 },
            bounds: {
              type: "object", additionalProperties: false, required: ["west", "south", "east", "north"],
              description: "初期版では west < east かつ south < north。日付変更線をまたぐ範囲は未対応。",
              properties: {
                west: { type: "number", minimum: -180, maximum: 180 }, south: { type: "number", minimum: -90, maximum: 90 },
                east: { type: "number", minimum: -180, maximum: 180 }, north: { type: "number", minimum: -90, maximum: 90 }
              }
            },
            points: {
              type: "array", maxItems: 20,
              items: {
                type: "object", additionalProperties: false, required: ["label", "longitude", "latitude", "sourceIds"],
                properties: {
                  label: { type: "string", minLength: 1, maxLength: 80 }, longitude: { type: "number", minimum: -180, maximum: 180 },
                  latitude: { type: "number", minimum: -90, maximum: 90 }, sourceIds: sourceIdArraySchema
                }
              }
            },
            highlightCountries: { type: "array", uniqueItems: true, items: { type: "string", pattern: "^[A-Z]{2}$" } },
            baseMap: {
              type: "object", additionalProperties: false, required: ["name", "scale", "version", "sourceUrl", "sha256"],
              properties: {
                name: { type: "string", minLength: 1, maxLength: 120 }, scale: { type: "string", minLength: 1, maxLength: 40 },
                version: { type: "string", minLength: 1, maxLength: 40 }, sourceUrl: { type: "string", format: "uri", pattern: "^https://" },
                sha256: { type: "string", pattern: "^[0-9a-f]{64}$" }
              }
            },
            image: {
              type: "object", additionalProperties: false, required: ["path", "sha256", "width", "height", "bytes", "alt"],
              properties: {
                path: { type: "string", pattern: "^assets/[at]-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{12}\\.png$" },
                sha256: { type: "string", pattern: "^[0-9a-f]{64}$" }, width: { type: "integer", minimum: 800, maximum: 10000 },
                height: { type: "integer", minimum: 450, maximum: 10000 }, bytes: { type: "integer", minimum: 1, maximum: 4999999 },
                alt: { type: "string", minLength: 1, maxLength: 300 }
              }
            }
          }
        }
      ]
    },
    timeline: {
      type: "array", maxItems: 15,
      items: {
        type: "object", additionalProperties: false, required: ["id", "dateLabel", "start", "end", "precision", "title", "description", "sourceIds"],
        properties: {
          id: { type: "string", minLength: 1, maxLength: 80, pattern: "^[a-z0-9][a-z0-9-]*$" },
          dateLabel: { type: "string", minLength: 1, maxLength: 40 }, start: { oneOf: [historicalDateSchema, { type: "null" }] },
          end: { oneOf: [historicalDateSchema, { type: "null" }] }, precision: { enum: ["day", "month", "year", "range", "approximate", "unknown"] },
          title: { type: "string", minLength: 1, maxLength: 100 }, description: { type: "string", minLength: 1, maxLength: 180 }, sourceIds: sourceIdArraySchema
        }
      }
    },
    timelineOmissionReason: { oneOf: [{ type: "string", minLength: 1, maxLength: 300 }, { type: "null" }] },
    relatedPublicIds: { type: "array", maxItems: 6, uniqueItems: true, items: articleIdSchema },
    changeNote: { oneOf: [{ type: "string", minLength: 1, maxLength: 300 }, { type: "null" }] }
  },
  allOf: [
    { if: { properties: { kind: { const: "article" } }, required: ["kind"] }, then: { properties: { publicId: { pattern: "^a-" } } } },
    { if: { properties: { kind: { const: "theme" } }, required: ["kind"] }, then: { properties: { publicId: { pattern: "^t-" } } } },
    { if: { properties: { timeline: { maxItems: 0 } }, required: ["timeline"] }, then: { properties: { timelineOmissionReason: { type: "string", minLength: 1 } } }, else: { properties: { timelineOmissionReason: { type: "null" } } } }
  ]
} as const;
