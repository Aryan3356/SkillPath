"use client";

import { FormEvent, useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, GraduationCap, LockKeyhole, Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (status === "authenticated") router.replace("/"); }, [status, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const result = await signIn("credentials", { email, password, redirect: false, callbackUrl: "/" });
      if (result?.error || !result?.ok) setError("That email and password didn’t match. Check them or create an account first.");
      else router.replace("/");
    } catch { setError("Sign in is unavailable right now. Please try again."); }
    finally { setBusy(false); }
  }

  return <main className="grid min-h-screen bg-[#f4f3ed] lg:grid-cols-[1.05fr_.95fr]">
    <section className="relative hidden overflow-hidden bg-[#193a38] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
      <div aria-hidden="true" className="absolute -right-32 top-20 size-[470px] rounded-full border border-white/10" /><div aria-hidden="true" className="absolute -right-12 top-40 size-[310px] rounded-full border border-white/10" />
      <Link href="/" className="relative flex w-fit items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#d9e9ae] text-[#23443d]"><Sparkles size={19} /></span><span className="text-[19px] font-bold tracking-[-.04em]">skillpath<span className="text-[#d9e9ae]">.</span></span></Link>
      <div className="relative max-w-[520px]"><span className="text-[10px] font-semibold tracking-[.18em] text-[#d9e9ae]">A CLEARER WAY FORWARD</span><h1 className="mt-5 text-[42px] font-semibold leading-[1.08] tracking-[-.045em] xl:text-[54px]">Your skills have a next step.</h1><p className="mt-5 max-w-[430px] text-[14px] leading-[1.8] text-[#d1dfd7]">Sign in to keep your resume analysis, track your learning plan, and explore training pathways that fit your goals.</p><div className="mt-8 flex items-center gap-3"><div className="grid size-9 place-items-center rounded-full bg-white/10"><GraduationCap size={17} className="text-[#d9e9ae]" /></div><span className="text-[11px] text-[#d1dfd7]">A student project for planning your career journey</span></div></div>
      <div className="relative text-[10px] text-[#b7c8bf]">SkillPath is an independent student project, not a government service.</div>
    </section>
    <section className="flex min-h-screen items-center justify-center px-5 py-10 md:px-10">
      <div className="w-full max-w-[420px]"><Link href="/" className="inline-flex items-center gap-2 text-[11px] font-medium text-[#708078] hover:text-[#244f49]"><ArrowLeft size={14} />Back to SkillPath</Link>
        <div className="mt-8 rounded-[26px] border border-[#e6e5dc] bg-white p-6 shadow-[0_12px_40px_rgba(35,55,47,0.06)] md:p-8">
          <div className="grid size-10 place-items-center rounded-xl bg-[#eff5f0] text-[#477765]"><LockKeyhole size={18} /></div>
          <div className="mt-5 text-[10px] font-semibold tracking-[.16em] text-[#76887d]">STUDENT WORKSPACE</div><h2 className="mt-2 text-[27px] font-semibold tracking-[-.04em] text-[#1b2c31]">Welcome back</h2><p className="mt-1.5 text-[12px] leading-relaxed text-[#7b8780]">Sign in to continue with your saved analysis and learning plan.</p>
          {error && <div role="alert" className="mt-5 rounded-xl border border-[#f1d4cb] bg-[#fff5f1] px-3.5 py-3 text-[11px] leading-relaxed text-[#9a4f3e]">{error}</div>}
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block text-[11px] font-medium text-[#53635a]">Email address<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="abc@gmail.com" className="mt-1.5 w-full rounded-xl border border-[#e3e9e4] bg-[#fcfdfc] px-3.5 py-3 text-[12px] outline-none transition focus:border-[#7ca28e]" /></label>
            <label className="block text-[11px] font-medium text-[#53635a]">Password<input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" className="mt-1.5 w-full rounded-xl border border-[#e3e9e4] bg-[#fcfdfc] px-3.5 py-3 text-[12px] outline-none transition focus:border-[#7ca28e]" /></label>
            <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2f7068] px-4 py-3 text-[12px] font-semibold text-white transition hover:bg-[#245d57] disabled:cursor-wait disabled:opacity-60">{busy ? "Signing in…" : "Sign in"}<ArrowRight size={14} /></button>
          </form>
          {process.env.NEXT_PUBLIC_AUTH_ENABLED === "true" && <><div className="my-5 flex items-center gap-3 text-[10px] text-[#9aa39d]"><span className="h-px flex-1 bg-[#ecefea]" />or continue with<span className="h-px flex-1 bg-[#ecefea]" /></div><button onClick={() => signIn("google", { callbackUrl: "/" })} className="w-full rounded-xl border border-[#e3e9e4] py-2.5 text-[11px] font-medium text-[#52625a] hover:bg-[#f8faf8]">Continue with Google</button></>}
          <p className="mt-6 text-center text-[11px] text-[#7d8982]">New to SkillPath? <Link href="/register" className="font-semibold text-[#397765] hover:underline">Create your student account</Link></p>
        </div>
        <p className="mt-5 text-center text-[10px] leading-relaxed text-[#929c95]">Want to explore without an account? <Link href="/" className="font-medium text-[#65766b] hover:underline">Continue without signing in</Link></p>
      </div>
    </section>
  </main>;
}
