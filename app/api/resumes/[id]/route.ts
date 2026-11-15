import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getMongoClientPromise, getMongoDatabaseName } from "@/lib/mongodb";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Sign in to open this document." }, { status: 401 });
  const { id } = await context.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Document not found." }, { status: 404 });
  try {
    const client = await getMongoClientPromise();
    const document = await client.db(getMongoDatabaseName()).collection("resumes").findOne({ _id: new ObjectId(id), userEmail: session.user.email });
    if (!document) return NextResponse.json({ error: "Document not found." }, { status: 404 });
    const binary = document.fileData as { value?: (asRaw?: boolean) => Buffer; buffer?: Buffer; position?: number };
    const data = Buffer.isBuffer(document.fileData)
      ? document.fileData
      : binary.value ? Buffer.from(binary.value(true)) : Buffer.from(binary.buffer ?? []).subarray(0, binary.position);
    const disposition = new URL(request.url).searchParams.get("download") === "1" ? "attachment" : "inline";
    const safeName = String(document.fileName || "resume.pdf").replace(/[\r\n"\\]/g, "_");
    return new NextResponse(new Uint8Array(data), { headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${safeName}"`,
      "Content-Length": String(data.length),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch {
    return NextResponse.json({ error: "Could not open this document." }, { status: 503 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Sign in to delete a document." }, { status: 401 });
  const { id } = await context.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Document not found." }, { status: 404 });
  try {
    const client = await getMongoClientPromise();
    const db = client.db(getMongoDatabaseName());
    const result = await db.collection("resumes").deleteOne({ _id: new ObjectId(id), userEmail: session.user.email });
    if (!result.deletedCount) return NextResponse.json({ error: "Document not found." }, { status: 404 });
    await db.collection("analyses").deleteMany({ userEmail: session.user.email, resumeId: id });
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: "Could not delete this document." }, { status: 503 });
  }
}
