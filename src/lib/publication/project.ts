import {
  assertPublicPayload,
  validatePublicPayload,
  type PublicPayload,
  type ValidationIssue
} from "../contracts/public.ts";

/**
 * Public output is created from this list. Never spread a private object into a
 * payload: private database fields can be added without changing this boundary.
 */
export const PUBLIC_PAYLOAD_KEYS = [
  "schemaVersion",
  "kind",
  "publicId",
  "slug",
  "title",
  "summary",
  "topics",
  "countries",
  "regions",
  "themeIds",
  "publishedAt",
  "updatedAt",
  "revision",
  "bodyMarkdown",
  "sources",
  "geography",
  "timeline",
  "timelineOmissionReason",
  "relatedPublicIds",
  "changeNote"
] as const satisfies readonly (keyof PublicPayload)[];

export type PublicProjectionInput = Partial<PublicPayload> & Record<string, unknown>;

export interface ProjectionResult {
  payload: PublicPayload | null;
  issues: ValidationIssue[];
}

export class PublicProjectionError extends Error {
  readonly code = "VALIDATION_ERROR";
  readonly issues: ValidationIssue[];
  constructor(issues: ValidationIssue[]) {
    super(issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n"));
    this.name = "PublicProjectionError";
    this.issues = issues;
  }
}

const PRIVATE_STRING_RULES: ReadonlyArray<{ name: string; pattern: RegExp }> = [
  { name: "検証用の非公開文字列", pattern: /PRIVATE_SENTINEL/i },
  { name: "Notion URL", pattern: /(?:https?:\/\/)?(?:www\.)?(?:notion\.so|notion\.site|app\.notion\.com)(?:\/|\b)/i },
  { name: "Notion内部リンク", pattern: /notion:\/\//i },
  { name: "ChatGPT共有URL", pattern: /https?:\/\/(?:chatgpt\.com|chat\.openai\.com)\/share\//i },
  { name: "認証情報らしい文字列", pattern: /(?:secret|token|api[_-]?key|authorization)\s*[:=]\s*\S+/i }
];

const RAW_UUID = /(?<![a-z0-9-])[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?![a-z0-9-])/i;
const RAW_NOTION_ID = /(?<![a-z0-9])[0-9a-f]{32}(?![a-z0-9])/i;

const publicIdPaths = [
  /^\$\.publicId$/,
  /^\$\.themeIds\[\d+\]$/,
  /^\$\.relatedPublicIds\[\d+\]$/
];

const sha256Paths = [
  /^\$\.geography\.baseMap\.sha256$/,
  /^\$\.geography\.image\.sha256$/
];

function containsOnlyPublicIdentifier(text: string, path: string): boolean {
  return publicIdPaths.some((pattern) => pattern.test(path))
    && /^[at]-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text);
}

function containsOnlySha256(text: string, path: string): boolean {
  return sha256Paths.some((pattern) => pattern.test(path)) && /^[0-9a-f]{64}$/i.test(text);
}

function cloneAllowedValue<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => cloneAllowedValue(item)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, cloneAllowedValue(item)])
    ) as T;
  }
  return value;
}

function visitStrings(value: unknown, path: string, visit: (text: string, path: string) => void): void {
  if (typeof value === "string") {
    visit(value, path);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => visitStrings(item, `${path}[${index}]`, visit));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      visitStrings(item, `${path}.${key}`, visit);
    }
  }
}

function findUnknownKeys(
  value: unknown,
  allowed: readonly string[],
  path: string,
  issues: ValidationIssue[]
): void {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (!allowed.includes(key)) issues.push({ path: `${path}.${key}`, message: "公開契約にない項目です" });
  }
}

/** Ensures nested objects are allowlisted even if a looser schema is supplied. */
function findNestedUnknownKeys(input: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) return issues;
  const value = input as Record<string, unknown>;
  if (Array.isArray(value.sources)) value.sources.forEach((source, index) => {
    findUnknownKeys(source, ["id", "title", "publisher", "url", "publishedOn", "accessedOn", "locator", "verification"], `$.sources[${index}]`, issues);
  });
  const geography = value.geography as Record<string, unknown> | undefined;
  if (geography?.mode === "none") {
    findUnknownKeys(geography, ["mode", "reason"], "$.geography", issues);
  } else if (geography?.mode === "map") {
    findUnknownKeys(geography, ["mode", "caption", "alt", "bounds", "points", "highlightCountries", "baseMap", "image"], "$.geography", issues);
    findUnknownKeys(geography.bounds, ["west", "south", "east", "north"], "$.geography.bounds", issues);
    findUnknownKeys(geography.baseMap, ["name", "scale", "version", "sourceUrl", "sha256"], "$.geography.baseMap", issues);
    findUnknownKeys(geography.image, ["path", "sha256", "width", "height", "bytes", "alt"], "$.geography.image", issues);
    if (Array.isArray(geography.points)) geography.points.forEach((point, index) => {
      findUnknownKeys(point, ["label", "longitude", "latitude", "sourceIds"], `$.geography.points[${index}]`, issues);
    });
  }
  if (Array.isArray(value.timeline)) value.timeline.forEach((event, index) => {
    findUnknownKeys(event, ["id", "dateLabel", "start", "end", "precision", "title", "description", "sourceIds"], `$.timeline[${index}]`, issues);
    if (event && typeof event === "object" && !Array.isArray(event)) {
      const typed = event as Record<string, unknown>;
      findUnknownKeys(typed.start, ["year", "month", "day"], `$.timeline[${index}].start`, issues);
      findUnknownKeys(typed.end, ["year", "month", "day"], `$.timeline[${index}].end`, issues);
    }
  });
  return issues;
}

function deduplicateIssues(issues: ValidationIssue[]): ValidationIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.path}\u0000${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Finds high-confidence private-system artifacts in already projected output. */
export function findPrivateMaterial(value: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  visitStrings(value, "$", (text, path) => {
    for (const rule of PRIVATE_STRING_RULES) {
      if (rule.pattern.test(text)) {
        issues.push({ path, message: `${rule.name}を公開できません` });
      }
    }
    // Public IDs deliberately contain UUIDs. Bare UUIDs and 32-character
    // provider IDs elsewhere are treated as private identifiers.
    if (!containsOnlyPublicIdentifier(text, path)
      && !containsOnlySha256(text, path)
      && (RAW_UUID.test(text) || RAW_NOTION_ID.test(text))) {
      issues.push({ path, message: "非公開システムのIDらしい文字列を公開できません" });
    }
  });
  return issues;
}

export function assertNoPrivateMaterial(value: unknown): void {
  const issues = findPrivateMaterial(value);
  if (issues.length > 0) {
    throw new PublicProjectionError(issues);
  }
}

/**
 * Constructs a fresh public object from an explicit allowlist. The input is a
 * public candidate, not a private note: unknown keys are rejected before copy.
 * A caller reading private storage must explicitly build/select this candidate.
 */
export function projectPublicPayload(input: PublicProjectionInput | PublicPayload): PublicPayload {
  const inputIssues = deduplicateIssues([...validatePublicPayload(input), ...findNestedUnknownKeys(input), ...findPrivateMaterial(input)]);
  if (inputIssues.length > 0) {
    throw new PublicProjectionError(inputIssues);
  }
  const candidate: Record<string, unknown> = {};
  for (const key of PUBLIC_PAYLOAD_KEYS) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      candidate[key] = cloneAllowedValue(input[key]);
    }
  }

  assertPublicPayload(candidate);
  assertNoPrivateMaterial(candidate);
  return candidate as unknown as PublicPayload;
}

export function tryProjectPublicPayload(input: PublicProjectionInput | PublicPayload): ProjectionResult {
  const inputIssues = deduplicateIssues([...validatePublicPayload(input), ...findNestedUnknownKeys(input), ...findPrivateMaterial(input)]);
  if (inputIssues.length > 0) return { payload: null, issues: inputIssues };
  const candidate: Record<string, unknown> = {};
  for (const key of PUBLIC_PAYLOAD_KEYS) {
    if (Object.prototype.hasOwnProperty.call(input, key)) candidate[key] = cloneAllowedValue(input[key]);
  }
  const issues = deduplicateIssues([...validatePublicPayload(candidate), ...findPrivateMaterial(candidate)]);
  return issues.length === 0
    ? { payload: candidate as unknown as PublicPayload, issues: [] }
    : { payload: null, issues };
}
