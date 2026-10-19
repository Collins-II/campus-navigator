export type CircleKind = "session" | "poll" | "resource";

export const MAX_CIRCLE_DOCUMENT_BYTES = 4 * 1024 * 1024;
export const CIRCLE_DOCUMENT_ACCEPT = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export type CircleDocument = { name: string; size: number; contentType: string };

export function validateCircleDocument(name: string, size: number): { data: CircleDocument; error?: never } | { error: string; data?: never } {
  if (!Number.isSafeInteger(size) || size < 1 || size > MAX_CIRCLE_DOCUMENT_BYTES) {
    return { error: "Choose a non-empty document up to 4 MB." };
  }
  const cleanName = name.trim();
  if (!cleanName || cleanName.length > 180 || /[\\/\u0000-\u001f\u007f]/.test(cleanName)) {
    return { error: "Use a filename within 180 characters, without path separators or control characters." };
  }
  const extension = cleanName.split(".").pop()?.toLowerCase();
  if (extension !== "pdf" && extension !== "docx") return { error: "Only PDF and DOCX documents are supported." };
  return { data: {
    name: cleanName,
    size,
    contentType: extension === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  } };
}

export type CircleDraft = {
  kind: CircleKind;
  title: string;
  description: string;
  location: string;
  startsAt: string;
  options: string[];
  url: string;
};

export type CircleActivity = CircleDraft & {
  id: string;
  createdBy: string;
  createdAt: string;
  responses: Record<string, string>;
  document?: CircleDocument;
};

export function validateCircleDraft(
  input: unknown,
  now = Date.now(),
  resourceMode: "link" | "document" = "link"
): { data: CircleDraft; error?: never } | { error: string; data?: never } {
  if (!input || typeof input !== "object") return { error: "Provide the activity details." };
  const body = input as Record<string, unknown>;
  if (body.kind !== "session" && body.kind !== "poll" && body.kind !== "resource") {
    return { error: "Choose a study session, poll or resource." };
  }
  const kind = body.kind;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (!title || title.length > 120) return { error: "Use a title between 1 and 120 characters." };
  if (description.length > 1000) return { error: "Keep the description within 1,000 characters." };

  const data: CircleDraft = { kind, title, description, location: "", startsAt: "", options: [], url: "" };
  if (kind === "session") {
    const location = typeof body.location === "string" ? body.location.trim() : "";
    const startsAt = typeof body.startsAt === "string" ? Date.parse(body.startsAt) : NaN;
    if (!location || location.length > 160) return { error: "Provide a meeting place within 160 characters." };
    if (!Number.isFinite(startsAt) || startsAt <= now) return { error: "Choose a study session time in the future." };
    data.location = location;
    data.startsAt = new Date(startsAt).toISOString();
  }
  if (kind === "poll") {
    if (!Array.isArray(body.options) || body.options.some((option) => typeof option !== "string")) {
      return { error: "Provide between 2 and 6 poll options." };
    }
    const options = body.options.map((option: string) => option.trim());
    if (options.length < 2 || options.length > 6 || options.some((option) => !option || option.length > 80)) {
      return { error: "Use 2 to 6 non-empty options, each within 80 characters." };
    }
    if (new Set(options.map((option) => option.toLowerCase())).size !== options.length) {
      return { error: "Each poll option must be different." };
    }
    data.options = options;
  }
  if (kind === "resource" && resourceMode === "link") {
    if (typeof body.url !== "string" || body.url.length > 2000) return { error: "Provide a valid resource link." };
    try {
      const url = new URL(body.url);
      if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) {
        return { error: "Use an HTTP or HTTPS link without embedded credentials." };
      }
      data.url = url.toString();
    } catch {
      return { error: "Provide a valid HTTP or HTTPS resource link." };
    }
  }
  return { data };
}

export function validCircleResponse(kind: CircleKind, value: unknown, options: string[]): value is string {
  if (typeof value !== "string") return false;
  if (kind === "session") return value === "going" || value === "not-going";
  return kind === "poll" && options.some((_, index) => String(index) === value);
}
