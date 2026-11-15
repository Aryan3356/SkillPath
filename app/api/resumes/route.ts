import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMongoClientPromise, getMongoDatabaseName } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const maxFileSize = 4 * 1024 * 1024;

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Sign in to view your documents." }, { status: 401 });
  try {
    const client = await getMongoClientPromise();
    const documents = await client.db(getMongoDatabaseName()).collection("resumes")
      .find({ userEmail: session.user.email }, { projection: { fileData: 0, userEmail: 0 } })
      .sort({ updatedAt: -1 }).toArray();
    return NextResponse.json({ documents: documents.map(({ _id, ...document }) => ({ ...document, id: String(_id) })) });
  } catch {
    return NextResponse.json({ error: "Could not load your resume." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Sign in to save a document." }, { status: 401 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    const replaceId = form.get("replaceId");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose a resume PDF." }, { status: 400 });
    }
    if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF resumes are supported." }, { status: 400 });
    }
    if (file.size === 0 || file.size > maxFileSize) {
      return NextResponse.json({ error: "Choose a PDF file smaller than 4 MB." }, { status: 400 });
    }
    const client = await getMongoClientPromise();
    const collection = client.db(getMongoDatabaseName()).collection("resumes");
    const now = new Date();
    const document = {
      userEmail: session.user.email,
      kind: "Resume",
      fileName: file.name.slice(0, 180),
      mimeType: "application/pdf",
      size: file.size,
      fileData: Buffer.from(await file.arrayBuffer()),
      updatedAt: now,
    };
    let id: string;
    if (typeof replaceId === "string" && replaceId) {
      const { ObjectId } = await import("mongodb");
      if (!ObjectId.isValid(replaceId)) return NextResponse.json({ error: "That document could not be found." }, { status: 404 });
      const result = await collection.updateOne({ _id: new ObjectId(replaceId), userEmail: session.user.email }, { $set: document });
      if (!result.matchedCount) return NextResponse.json({ error: "That document could not be found." }, { status: 404 });
      id = replaceId;
    } else {
      const result = await collection.insertOne({ ...document, createdAt: now });
      id = String(result.insertedId);
    }
    const analyses = client.db(getMongoDatabaseName()).collection("analyses");
    const latest = await analyses.findOne({ userEmail: session.user.email }, { sort: { createdAt: -1 }, projection: { _id: 1 } });
    if (latest) await analyses.updateOne({ _id: latest._id, userEmail: session.user.email }, { $set: { resumeId: id, resumeFileName: document.fileName } });
    return NextResponse.json({ id, fileName: document.fileName, kind: document.kind, size: document.size, updatedAt: now.toISOString() });
  } catch {
    return NextResponse.json({ error: "Could not save this document. Please try again." }, { status: 503 });
  }
}
