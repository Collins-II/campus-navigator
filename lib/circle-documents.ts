import { unzipSync, strFromU8 } from "fflate";
import { MAX_CIRCLE_DOCUMENT_BYTES, validateCircleDocument } from "@/lib/study-circles";

export const MAX_CIRCLE_UPLOAD_BYTES = MAX_CIRCLE_DOCUMENT_BYTES + 64 * 1024;

export async function readCircleUpload(request: Request): Promise<
  { data: FormData; error?: never; status?: never } | { error: string; status: number; data?: never }
> {
  const declaredSize = Number(request.headers.get("content-length"));
  if (declaredSize > MAX_CIRCLE_UPLOAD_BYTES) return { error: "The upload is too large. Documents must be 4 MB or smaller.", status: 413 };
  if (!request.body) return { error: "Choose a document to upload.", status: 400 };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      size += result.value.byteLength;
      if (size > MAX_CIRCLE_UPLOAD_BYTES) {
        await reader.cancel();
        return { error: "The upload is too large. Documents must be 4 MB or smaller.", status: 413 };
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    const data = await new Response(bytes, { headers: { "Content-Type": request.headers.get("content-type") || "" } }).formData();
    return { data };
  } catch {
    return { error: "The upload could not be read. Choose the document and try again.", status: 400 };
  }
}

export function validateCircleDocumentContents(name: string, bytes: Uint8Array) {
  const metadata = validateCircleDocument(name, bytes.byteLength);
  if (!metadata.data) return metadata.error;
  if (metadata.data.contentType === "application/pdf") {
    const start = new TextDecoder().decode(bytes.subarray(0, 8));
    const end = new TextDecoder().decode(bytes.subarray(Math.max(0, bytes.length - 1024)));
    return /^%PDF-\d\.\d/.test(start) && end.includes("%%EOF")
      ? null : "This file is not a valid PDF document.";
  }
  try {
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 0x03 || bytes[3] !== 0x04) {
      return "This file is not a valid DOCX document.";
    }
    let expandedSize = 0;
    let entries = 0;
    const files = unzipSync(bytes, {
      filter: (entry) => {
        expandedSize += entry.originalSize;
        entries++;
        if (expandedSize > 32 * 1024 * 1024 || entries > 2048 || /vbaProject\.bin$/i.test(entry.name)) {
          throw new Error("Unsupported document archive.");
        }
        const needed = ["[Content_Types].xml", "word/document.xml", "_rels/.rels"].includes(entry.name);
        if (needed && entry.originalSize > 8 * 1024 * 1024) throw new Error("Document content is too large.");
        return needed;
      },
    });
    const types = files["[Content_Types].xml"];
    const document = files["word/document.xml"];
    return types && document && files["_rels/.rels"] &&
      strFromU8(types).includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml") &&
      strFromU8(document).includes("http://schemas.openxmlformats.org/wordprocessingml/2006/main")
      ? null : "This file is not a valid DOCX document.";
  } catch {
    return "This DOCX is damaged, encrypted, macro-enabled or exceeds the supported document complexity.";
  }
}
