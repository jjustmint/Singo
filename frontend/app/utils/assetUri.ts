import { GlobalConstant } from "@/constant";

const HTTP_PATTERN = /^https?:\/\//i;

const stripDataPrefix = (path: string) =>
  path.startsWith("data/") ? path.slice(5) : path;

const safeEncodeSegment = (segment: string) => {
  try {
    const decoded = decodeURIComponent(segment);
    return encodeURIComponent(decoded);
  } catch {
    return encodeURIComponent(segment);
  }
};

export const buildAssetUri = (path?: string | null): string | null => {
  if (!path || path.trim().length === 0) {
    return null;
  }

  const normalised = path.replace(/\\/g, "/").trim();

  if (HTTP_PATTERN.test(normalised)) {
    return normalised;
  }

  const trimmed = stripDataPrefix(normalised.replace(/^\/+/, ""));

  const encodedPath = trimmed
    .split("/")
    .filter((segment) => segment.length > 0)
    .map(safeEncodeSegment)
    .join("/");

  if (!encodedPath) {
    return null;
  }

  return `${GlobalConstant.API_URL}/${encodedPath}`;
};
