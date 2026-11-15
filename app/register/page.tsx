"use client";

import { FormEvent, useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, GraduationCap, Sparkles } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { status } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [college, setCollege] = useState("");
  const [studyYear, setStudyYear] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (status === "authenticated") router.replace("/"); }, [status, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const response = await fetch("/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, college, studyYear, password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "We couldn’t create your account.");
      const login = await signIn("credentials", { email, password, redirect: false, callbackUrl: "/" });
      if (login?.error || !login?.ok) throw new Error("Your account was created, but automatic sign-in failed. Please sign in with your new account.");
      router.replace("/");
    } catch (e) { setError(e instanceof Error ? e.message : "We couldn’t create your account. Please try again."); }
    finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-[#f4f3ed] px-5 py-8 md:px-10">
    <div className="mx-auto max-w-[1000px]"><Link href="/" className="inline-flex items-center gap-2 text-[11px] font-medium text-[#708078] hover:text-[#244f49]"><ArrowLeft size={14} />Back to SkillPath</Link>
      <div className="mt-7 grid overflow-hidden rounded-[28px] border border-[#e6e5dc] bg-white shadow-[0_16px_48px_rgba(35,55,47,0.07)] lg:grid-cols-[.85fr_1.15fr]">
        <section className="relative overflow-hidden bg-[#193a38] p-7 text-white md:p-9"><div aria-hidden="true" className="absolute -right-24 -top-16 size-[290px] rounded-full border border-white/10" /><div className="relative flex items-center gap-2"><Sparkles size={17} className="text-[#d9e9ae]" /><span className="text-[17px] font-bold tracking-[-.04em]">skillpath<span className="text-[#d9e9ae]">.</span></span></div><div className="relative mt-10 grid size-11 place-items-center rounded-xl bg-white/10 text-[#d9e9ae]"><GraduationCap size={20} /></div><h1 className="relative mt-5 text-[29px] font-semibold leading-tight tracking-[-.04em] md:text-[35px]">Make space for your next step.</h1><p className="relative mt-3 max-w-[350px] text-[12px] leading-[1.8] text-[#d1dfd7]">Create a student profile to keep your analyses and learning progress together.</p><div className="relative mt-8 rounded-2xl border border-white/10 bg-white/[.06] p-4"><div className="text-[10px] font-semibold tracking-[.1em] text-[#d9e9ae]">YOUR PROFILE</div><p className="mt-2 text-[11px] leading-relaxed text-[#d1dfd7]">Your college and study year help make this a student-focused workspace. We don’t use them to rate your skills.</p></div><p className="relative mt-8 text-[9px] leading-relaxed text-[#b7c8bf]">SkillPath is an independent student project, not a government service.</p></section>
        <section className="p-6 md:p-9"><div className="text-[10px] font-semibold tracking-[.16em] text-[#76887d]">CREATE ACCOUNT</div><h2 className="mt-2 text-[25px] font-semibold tracking-[-.04em] text-[#1b2c31]">Your student details</h2><p className="mt-1.5 text-[11px] text-[#7b8780]">Use your own details. Fields marked with * are required.</p>
          {error && <div role="alert" className="mt-4 rounded-xl border border-[#f1d4cb] bg-[#fff5f1] px-3.5 py-3 text-[11px] leading-relaxed text-[#9a4f3e]">{error}</div>}
          <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-[10px] font-medium text-[#53635a] sm:col-span-2">Full name *<input required minLength={2} maxLength={80} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="mt-1.5 w-full rounded-xl border border-[#e3e9e4] bg-[#fcfdfc] px-3.5 py-2.5 text-[12px] outline-none focus:border-[#7ca28e]" /></label>
            <label className="text-[10px] font-medium text-[#53635a] sm:col-span-2">Email address *<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="abc@gmail.com" className="mt-1.5 w-full rounded-xl border border-[#e3e9e4] bg-[#fcfdfc] px-3.5 py-2.5 text-[12px] outline-none focus:border-[#7ca28e]" /></label>
            <label className="text-[10px] font-medium text-[#53635a] sm:col-span-2">College or institution *<input required minLength={2} maxLength={140} autoComplete="organization" value={college} onChange={(e) => setCollege(e.target.value)} placeholder="College or university name" className="mt-1.5 w-full rounded-xl border border-[#e3e9e4] bg-[#fcfdfc] px-3.5 py-2.5 text-[12px] outline-none focus:border-[#7ca28e]" /></label>
            <label className="text-[10px] font-medium text-[#53635a]">Study year *<select required value={studyYear} onChange={(e) => setStudyYear(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#e3e9e4] bg-[#fcfdfc] px-3 py-2.5 text-[12px] outline-none focus:border-[#7ca28e]"><option value="">Choose year</option><option>1st year</option><option>2nd year</option><option>3rd year</option><option>4th year</option><option>Postgraduate</option><option>Other</option></select></label>
            <label className="text-[10px] font-medium text-[#53635a]">Password *<input required type="password" minLength={8} maxLength={128} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className="mt-1.5 w-full rounded-xl border border-[#e3e9e4] bg-[#fcfdfc] px-3 py-2.5 text-[12px] outline-none focus:border-[#7ca28e]" /></label>
            <div className="sm:col-span-2"><button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2f7068] px-4 py-3 text-[12px] font-semibold text-white transition hover:bg-[#245d57] disabled:cursor-wait disabled:opacity-60">{busy ? "Creating account…" : "Create account"}<ArrowRight size={14} /></button><p className="mt-2 text-[9px] leading-relaxed text-[#929c95]">Your password is stored as a secure hash. Don’t reuse a password you use elsewhere.</p></div>
          </form>
          <p className="mt-5 text-center text-[11px] text-[#7d8982]">Already registered? <Link href="/login" className="font-semibold text-[#397765] hover:underline">Sign in</Link></p>
        </section>
      </div>
    </div>
  </main>;
}
