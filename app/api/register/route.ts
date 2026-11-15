import { NextResponse } from "next/server";
import { getMongoClientPromise, getMongoDatabaseName } from "@/lib/mongodb";
import { hashPassword } from "@/lib/password";

export const runtime = "nodejs";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const years = new Set(["1st year", "2nd year", "3rd year", "4th year", "Postgraduate", "Other"]);

export async function POST(request: Request) {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json({ error: "Account creation is temporarily unavailable because the database is not configured. You can continue without signing in." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 254) : "";
    const college = typeof body.college === "string" ? body.college.trim().slice(0, 140) : "";
    const studyYear = typeof body.studyYear === "string" ? body.studyYear : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (name.length < 2) return NextResponse.json({ error: "Enter your full name." }, { status: 400 });
    if (!emailPattern.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    if (college.length < 2) return NextResponse.json({ error: "Enter your college or institution." }, { status: 400 });
    if (!years.has(studyYear)) return NextResponse.json({ error: "Choose your current year of study." }, { status: 400 });
    if (password.length < 8 || password.length > 128) return NextResponse.json({ error: "Use a password between 8 and 128 characters." }, { status: 400 });

    const client = await getMongoClientPromise();
    const database = getMongoDatabaseName();
    const users = client.db(database).collection("users");
    await users.createIndex({ email: 1 }, { unique: true, sparse: true });
    if (await users.findOne({ email }, { projection: { _id: 1 } })) {
      return NextResponse.json({ error: "An account with that email already exists. Try signing in." }, { status: 409 });
    }

    await users.insertOne({
      name, email, college, studyYear,
      emailVerified: null,
      passwordHash: await hashPassword(password),
      createdAt: new Date(),
    });
    return NextResponse.json({ created: true }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      return NextResponse.json({ error: "An account with that email already exists. Try signing in." }, { status: 409 });
    }
    console.error("Account registration failed", error);
    return NextResponse.json({ error: "We couldn’t create your account. Check the database settings and try again." }, { status: 500 });
  }
}
