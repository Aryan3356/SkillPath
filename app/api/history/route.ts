import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMongoClientPromise, getMongoDatabaseName } from "@/lib/mongodb";
import { roles } from "@/lib/roles";
import { buildLearningPlan } from "@/lib/learning";

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

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.email || !process.env.MONGODB_URI) {
    return NextResponse.json({ error: "Sign in to save your learning progress." }, { status: 401 });
  }
  try {
    const body = await request.json();
    const target = roles.find((role) => role.title === body.targetRole);
    if (!target) return NextResponse.json({ error: "Choose a supported target role." }, { status: 400 });

    const client = await getMongoClientPromise();
    const analyses = client.db(getMongoDatabaseName()).collection("analyses");
    const latest = await analyses.findOne({ userEmail: session.user.email }, { sort: { createdAt: -1 } });
    if (!latest) return NextResponse.json({ error: "Analyze a resume before saving learning progress." }, { status: 404 });

    const detectedSkills = Array.isArray(latest.detectedSkills)
      ? latest.detectedSkills.filter((skill): skill is string => typeof skill === "string")
      : [];
    const detected = new Set(detectedSkills);
    const matchedSkills = target.skills.filter((skill) => detected.has(skill.name)).map((skill) => skill.name);
    const missingSkills = target.skills.filter((skill) => !detected.has(skill.name)).map((skill) => skill.name);
    const roadmap = buildLearningPlan(missingSkills);
    const requestedRoadmap = Array.isArray(body.roadmap) ? body.roadmap : [];
    const savedRoadmap = roadmap.map((item) => {
      const requested = requestedRoadmap.find((candidate: { title?: unknown }) => candidate?.title === item.title);
      const requestedSteps = Array.isArray(requested?.steps) ? requested.steps : [];
      const steps = item.steps.map((step, index) => ({ ...step, done: requestedSteps[index] === true }));
      return { ...item, steps, done: steps.length > 0 && steps.every((step) => step.done) };
    });
    const readiness = Math.round((matchedSkills.length / target.skills.length) * 100);
    const summary = `You already mention ${matchedSkills.length} of ${target.skills.length} skills for ${target.title}. Focus on the gaps below and show what you can build with each one.`;
    const result = await analyses.updateOne(
      { _id: latest._id, userEmail: session.user.email },
      { $set: { targetRole: target.title, matchedSkills, missingSkills, readiness, roadmap: savedRoadmap, summary, updatedAt: new Date() } },
    );
    if (!result.matchedCount) return NextResponse.json({ error: "Your analysis could not be found. Upload your resume again." }, { status: 404 });
    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error("Learning progress update failed", error);
    return NextResponse.json({ error: "Could not save progress. Please try again." }, { status: 500 });
  }
}
