const configuredBase = import.meta.env?.BASE_URL ?? "/insight-journal/";

function cleanInternalPath(pathname: string): string {
  if (/^[\\/]{2}/.test(pathname) || pathname.includes("\\") || /[\u0000-\u001f\u007f]/.test(pathname)) {
    throw new TypeError("安全でないサイト内パスです");
  }
  const leading = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const trailingSlash = leading.endsWith("/");
  const segments = leading.split("/").filter(Boolean);
  for (const segment of segments) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      throw new TypeError("不正なURLエンコードを含むサイト内パスです");
    }
    if (decoded === "." || decoded === ".." || decoded.includes("/") || decoded.includes("\\")) {
      throw new TypeError("相対移動を含むサイト内パスは使用できません");
    }
  }
  const clean = `/${segments.join("/")}`;
  return clean === "/" || !trailingSlash ? clean : `${clean}/`;
}

function normalizeBase(value: string): string {
  if (typeof value !== "string" || value.includes("?") || value.includes("#")) {
    throw new TypeError("BASE_URLはサイト内パスで指定します");
  }
  const clean = cleanInternalPath(value);
  return clean === "/" ? "" : clean.replace(/\/$/, "");
}

export const basePath = normalizeBase(configuredBase);

/** Prefixes a trusted site-relative path with Astro's deployment base. */
export function withBase(path = "/"): string {
  if (path.startsWith("#")) return path;
  if (/^[a-z][a-z\d+.-]*:/i.test(path)) {
    let url: URL;
    try {
      url = new URL(path);
    } catch {
      throw new TypeError("不正な絶対URLです");
    }
    if (url.protocol !== "https:" || url.username || url.password) {
      throw new TypeError("許可されていない絶対URLです");
    }
    return url.href;
  }
  if (path.startsWith("//")) throw new TypeError("プロトコル相対URLは使用できません");

  const suffixIndex = path.search(/[?#]/);
  const pathname = suffixIndex === -1 ? path : path.slice(0, suffixIndex);
  const suffix = suffixIndex === -1 ? "" : path.slice(suffixIndex);
  const clean = cleanInternalPath(pathname || "/");
  const alreadyPrefixed = basePath && (clean === basePath || clean.startsWith(`${basePath}/`));
  const prefixed = alreadyPrefixed ? clean : `${basePath}${clean}`;
  return `${prefixed || "/"}${suffix}`;
}

/** Converts an absolute or based URL back to a canonical path used by navigation. */
export function normalizeSitePath(path: string): string {
  let pathname = path;
  if (/^https?:\/\//i.test(path)) {
    try {
      pathname = new URL(path).pathname;
    } catch {
      return "/";
    }
  } else {
    pathname = path.split(/[?#]/, 1)[0];
  }
  const clean = cleanInternalPath(pathname || "/");
  const withoutBase = basePath && (clean === basePath || clean.startsWith(`${basePath}/`))
    ? clean.slice(basePath.length)
    : clean;
  const normalized = (withoutBase || "/").replace(/index\.html$/, "");
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}
