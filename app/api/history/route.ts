import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMongoClientPromise, getMongoDatabaseName } from "@/lib/mongodb";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email || !process.env.MONGODB_URI) return NextResponse.json({ analyses: [] });
  try {
    const client = await getMongoClientPromise();
    const dbName = getMongoDatabaseName();
    const analyses = await client.db(dbName).collection("analyses").find({ userEmail: session.user.email }).sort({ createdAt: -1 }).limit(10).toArray();
    return NextResponse.json({ analyses: analyses.map(({ _id, userEmail, ...rest }) => ({ ...rest, id: String(_id) })) });
  } catch { return NextResponse.json({ analyses: [] }); }
}
