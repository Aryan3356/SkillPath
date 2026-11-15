# SkillPath

A student-friendly application for topic 22, Skill Gap Analyzer for PMKVY. It reads a text-based PDF resume in the browser, compares detected skills with a selected occupation, suggests a practical learning plan, and points learners to PMKVY pathways and the official training centre directory.

## Student and submission details

- Student name / registration number: **Add before submission**
- Team members: **Add names and registration numbers, or write ?Individual project?**
- GitHub repository: **Add repository URL after publishing**
- Deployment: **Add deployment URL after publishing**

## Technologies

Next.js App Router, React, TypeScript, Tailwind CSS, Auth.js, MongoDB, PDF.js, Google GenAI SDK (Gemini), Recharts, and Lucide icons.

## Application overview

Students create an account with their name, email, college/institution, study year, and password. They upload a text-based PDF resume, select a target occupation, review detected skills and gaps, and mark learning-plan steps complete. Passwords are stored as salted scrypt hashes. Resume text is not saved to MongoDB. The PMKVY pathways page links to official sources and does not claim to mirror live course or centre availability.

Skill matches are keyword signals, not a measure of proficiency or a hiring prediction. Scanned image PDFs need OCR and are not supported.

## Run it

1. Install Node.js 20 or newer.
2. Run `npm install`, then `npm run dev`.
3. Open `http://localhost:3000`.

The guest workspace can be explored without an account. Guest resume analyses are temporary and are cleared on reload; signed-in analyses are stored in MongoDB. `.env.example` is a template; `.env.local` is the active, private configuration. Set `MONGODB_URI` and a long random `AUTH_SECRET` in `.env.local`, then restart the app. If your network DNS blocks Atlas SRV lookups, set `MONGODB_DNS_SERVERS=1.1.1.1,1.0.0.1` there to use Cloudflare DNS for the Node process. Google sign-in is optional: add `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`, then set `NEXT_PUBLIC_AUTH_ENABLED=true`. For AI-written summaries, add `GEMINI_API_KEY`. Keep secrets server-side; do not prefix them with `NEXT_PUBLIC_`.

For signed-in users, analysis summaries and skill results are also saved to the MongoDB `analyses` collection. PDF resumes uploaded by signed-in users are stored in the `resumes` collection and can be viewed, downloaded, replaced, or deleted from the profile menu. Uploads are limited to 4 MB to fit Vercel's serverless request limit. The application links to the Ministry of Skill Development and Entrepreneurship and Skill India Digital Hub for current PMKVY details. SkillPath is an independent student project, not a government service.
