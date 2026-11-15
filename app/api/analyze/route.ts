import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { auth } from "@/auth";
import { roles, findSkills } from "@/lib/roles";
import { buildLearningPlan } from "@/lib/learning";
import { getMongoClientPromise, getMongoDatabaseName } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const text = typeof body.text === "string" ? body.text.slice(0, 24_000) : "";
    const target = roles.find((role) => role.title === body.targetRole);
    if (!text.trim() || !target) return NextResponse.json({ error: "Add resume text and choose a role to continue." }, { status: 400 });

    const detected = findSkills(text);
    const required = target.skills.map((skill) => skill.name);
    const matched = required.filter((skill) => detected.includes(skill));
    const missing = required.filter((skill) => !detected.includes(skill));
    const base = {
      targetRole: target.title,
      detectedSkills: detected,
      matchedSkills: matched,
      missingSkills: missing,
      readiness: Math.round((matched.length / required.length) * 100),
      roadmap: buildLearningPlan(missing),
      summary: `You already mention ${matched.length} of ${required.length} skills for ${target.title}. Focus on the gaps below and show what you can build with each one.`,
      createdAt: new Date().toISOString(),
      source: "SkillPath skill matcher",
    };

    let report = base;
    let poweredBy = "SkillPath skill matcher";
    if (process.env.GEMINI_API_KEY) {
      try {
        const model = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const result = await model.models.generateContent({ model: "gemini-3.8-flash", contents: `You are a practical career coach for Indian college students. Use only the resume facts provided. Do not claim a skill is present unless it is in the detected list. Return only JSON with one key: summary (two short, encouraging sentences).\nTarget role: ${target.title}\nDetected skills: ${matched.join(", ") || "none"}\nSkill gaps: ${missing.join(", ") || "none"}\nResume excerpt: ${text.slice(0, 7000)}` });
        const raw = (result.text || "{}").replace(/^```(?:json)?\s*|\s*```$/g, "");
        const ai = JSON.parse(raw) as { summary?: string };
        report = {
          ...base,
          summary: typeof ai.summary === "string" ? ai.summary.slice(0, 400) : base.summary,
        };
        poweredBy = "Gemini AI + skill matcher";
      } catch { poweredBy = "SkillPath skill matcher (Gemini unavailable)"; }
    }
    report.source = poweredBy;

    const session = process.env.MONGODB_URI ? await auth() : null;
    if (session?.user?.email && process.env.MONGODB_URI) {
      const client = await getMongoClientPromise();
      const dbName = getMongoDatabaseName();
      await client.db(dbName).collection("analyses").insertOne({ ...report, userEmail: session.user.email, createdAt: new Date() });
    }
    return NextResponse.json(report);
  } catch (error) {
    console.error("Analysis request failed", error);
    return NextResponse.json({ error: "We couldn’t analyze that resume. Please try a text-based PDF or paste your resume details." }, { status: 500 });
  }
}
