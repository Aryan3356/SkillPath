"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDown, ArrowRight, ArrowUpRight, BarChart3, BookOpen, Check, CheckCircle2, ChevronDown, CircleHelp, Clock3, Download, ExternalLink, FileText, GraduationCap, LayoutDashboard, LoaderCircle, LockKeyhole, LogOut, MapPin, Menu, Plus, Sparkles, Target, Trash2, Upload, UserRound, X } from "lucide-react";
import { roles } from "@/lib/roles";
import { buildLearningPlan, getLearningGuide, type LearningItem } from "@/lib/learning";
import { getPMKVYRecommendations, pmkvyProgramNotes, pmkvySources } from "@/lib/pmkvy";

type RoadmapItem = LearningItem;
type Report = { id?: string; targetRole: string; detectedSkills?: string[]; matchedSkills: string[]; missingSkills: string[]; readiness: number; roadmap: RoadmapItem[]; summary: string; createdAt: string; source?: string };
type Stored = { report: Report; fileName: string; updatedAt: string; userEmail?: string };
type ResumeDocument = { id: string; kind: "Resume"; fileName: string; size: number; createdAt?: string; updatedAt: string };

const initialReport: Report = {
  targetRole: "Full-stack Developer", detectedSkills: [], matchedSkills: [], missingSkills: [], readiness: 0,
  summary: "Upload a PDF resume to see your skills and get a learning plan for your target role.",
  roadmap: [], createdAt: new Date().toISOString(), source: "No resume uploaded",
};

function normalizeReport(value: unknown): Report {
  if (!value || typeof value !== "object") return initialReport;
  const raw = value as Partial<Report> & { roadmap?: Array<Partial<RoadmapItem>> };
  if (raw.source === "Sample analysis") return initialReport;
  const strings = (items: unknown): string[] => Array.isArray(items) ? items.filter((item): item is string => typeof item === "string") : [];
  const oldRoadmap = Array.isArray(raw.roadmap) ? raw.roadmap : [];
  const titles = oldRoadmap.map((item) => typeof item?.title === "string" ? item.title : "").filter(Boolean);
  const roadmapBase = buildLearningPlan(titles.length ? titles : strings(raw.missingSkills));
  const roadmap = roadmapBase.map((item, index) => {
    const oldItem = oldRoadmap[index];
    const oldSteps = Array.isArray(oldItem?.steps) ? oldItem.steps : null;
    const steps = oldSteps
      ? item.steps.map((step, stepIndex) => ({ ...step, title: typeof oldSteps[stepIndex]?.title === "string" ? oldSteps[stepIndex]!.title! : step.title, done: Boolean(oldSteps[stepIndex]?.done) }))
      : item.steps.map((step) => ({ ...step, done: Boolean(oldItem?.done) }));
    return {
      ...item,
      duration: typeof oldItem?.duration === "string" ? oldItem.duration : item.duration,
      done: steps.length > 0 && steps.every((step) => step.done),
      steps,
    };
  });
  const role = roles.some((item) => item.title === raw.targetRole) ? raw.targetRole! : initialReport.targetRole;
  return {
    ...initialReport,
    ...raw,
    targetRole: role,
    detectedSkills: strings(raw.detectedSkills),
    matchedSkills: strings(raw.matchedSkills),
    missingSkills: strings(raw.missingSkills),
    readiness: typeof raw.readiness === "number" && Number.isFinite(raw.readiness) ? Math.max(0, Math.min(100, raw.readiness)) : 0,
    summary: typeof raw.summary === "string" ? raw.summary : initialReport.summary,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
    source: typeof raw.source === "string" ? raw.source : (strings(raw.detectedSkills).length || strings(raw.matchedSkills).length ? "Resume analysis" : initialReport.source),
    roadmap,
  };
}

export default function Home() {
  const { data: session, status } = useSession();
  const [section, setSection] = useState("Overview");
  const [role, setRole] = useState(initialReport.targetRole);
  const [report, setReport] = useState<Report>(initialReport);
  const [fileName, setFileName] = useState("No resume uploaded");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [documents, setDocuments] = useState<ResumeDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState("");
  const [replaceDocumentId, setReplaceDocumentId] = useState<string | null>(null);
  const [documentBusyId, setDocumentBusyId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const libraryFileRef = useRef<HTMLInputElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const learningStepCount = report.roadmap.reduce((total, item) => total + (Array.isArray(item.steps) ? item.steps.length : 0), 0);
  const completedLearningSteps = report.roadmap.reduce((total, item) => total + (Array.isArray(item.steps) ? item.steps.filter((step) => step.done).length : 0), 0);
  const completion = learningStepCount ? Math.round(completedLearningSteps / learningStepCount * 100) : 0;
  const hasAnalysis = report.source !== "No resume uploaded";

  useEffect(() => {
    if (!profileMenuOpen) return;
    function closeOnOutsideClick(event: MouseEvent) {
      if (event.target instanceof Node && !profileMenuRef.current?.contains(event.target)) setProfileMenuOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setProfileMenuOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [profileMenuOpen]);

  function openProfileSection(nextSection: string) {
    setSection(nextSection);
    setProfileMenuOpen(false);
  }

  const loadDocuments = useCallback(async () => {
    if (!session?.user?.email) { setDocuments([]); return; }
    setDocumentsLoading(true);
    setDocumentsError("");
    try {
      const response = await fetch("/api/resumes", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load your documents.");
      setDocuments(Array.isArray(data.documents) ? data.documents : []);
    } catch (e) {
      setDocumentsError(e instanceof Error ? e.message : "Could not load your documents.");
    } finally { setDocumentsLoading(false); }
  }, [session?.user?.email]);

  async function saveDocument(file: File, replaceId?: string | null) {
    if (!session?.user?.email) return;
    const form = new FormData();
    form.set("file", file);
    if (replaceId) form.set("replaceId", replaceId);
    const response = await fetch("/api/resumes", { method: "POST", body: form });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not save this document.");
    await loadDocuments();
  }

  async function persistProgress(updated: Report) {
    if (!saved || !session?.user?.email) return;
    localStorage.setItem("skillpath-analysis-v1", JSON.stringify({ report: updated, fileName, updatedAt: new Date().toISOString(), userEmail: session.user.email } satisfies Stored));
    try {
      const response = await fetch("/api/history", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRole: updated.targetRole,
          roadmap: updated.roadmap.map((item) => ({ title: item.title, steps: item.steps.map((step) => step.done) })),
        }),
      });
      if (!response.ok) throw new Error();
    } catch {
      setError("Your changes are shown here but could not be synced to your account. Please try again.");
    }
  }

  async function deleteDocument(document: ResumeDocument) {
    if (!window.confirm(`Delete ${document.fileName}? Its saved resume analysis will also be removed.`)) return;
    setDocumentBusyId(document.id);
    setDocumentsError("");
    try {
      const response = await fetch(`/api/resumes/${document.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete this document.");
      setDocuments((current) => current.filter((item) => item.id !== document.id));
      if (fileName === document.fileName) resetReport();
    } catch (e) {
      setDocumentsError(e instanceof Error ? e.message : "Could not delete this document.");
    } finally { setDocumentBusyId(null); }
  }

  useEffect(() => {
    if (session?.user?.email) void loadDocuments();
    else setDocuments([]);
  }, [loadDocuments, session?.user?.email]);

  function changeRole(nextRole: string) {
    setRole(nextRole);
    const target = roles.find((item) => item.title === nextRole);
    if (!target) return;
    if (!hasAnalysis) {
      const updated = { ...initialReport, targetRole: nextRole };
      setReport(updated);
      void persistProgress(updated);
      return;
    }
    const known = new Set(report.detectedSkills ?? report.matchedSkills);
    const matchedSkills = target.skills.filter((skill) => known.has(skill.name)).map((skill) => skill.name);
    const missingSkills = target.skills.filter((skill) => !known.has(skill.name)).map((skill) => skill.name);
    const updated: Report = {
      ...report, targetRole: nextRole, matchedSkills, missingSkills,
      readiness: Math.round(matchedSkills.length / target.skills.length * 100),
      summary: `You already mention ${matchedSkills.length} of ${target.skills.length} skills for ${nextRole}. Focus on the gaps below and show what you can build with each one.`,
      roadmap: buildLearningPlan(missingSkills),
      createdAt: new Date().toISOString(), source: "SkillPath skill matcher",
    };
    setReport(updated);
    void persistProgress(updated);
  }

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.email) {
      localStorage.removeItem("skillpath-analysis-v1");
      setReport(initialReport); setRole(initialReport.targetRole); setFileName("No resume uploaded"); setSaved(false);
      return;
    }
    try {
      const raw = localStorage.getItem("skillpath-analysis-v1");
      if (raw) {
        const data: Stored = JSON.parse(raw);
        if (data.userEmail !== session.user.email) { localStorage.removeItem("skillpath-analysis-v1"); return; }
        const restored = normalizeReport(data.report);
        setReport(restored); setRole(restored.targetRole);
        setFileName(restored.source === "No resume uploaded" ? "No resume uploaded" : typeof data.fileName === "string" ? data.fileName : "Saved resume");
        setSaved(restored.source !== "No resume uploaded");
        if (restored.source === "No resume uploaded") localStorage.removeItem("skillpath-analysis-v1");
        else localStorage.setItem("skillpath-analysis-v1", JSON.stringify({ ...data, report: restored, userEmail: session.user.email ?? undefined }));
      }
    } catch { /* Use the sample analysis if stored data is unavailable. */ }
  }, [status, session?.user?.email]);

  useEffect(() => {
    if (!session?.user?.email) return;
    fetch("/api/history").then((r) => r.json()).then((data) => {
      const newest = data.analyses?.[0] as unknown;
      if (newest) {
        const restored = normalizeReport(newest);
        setReport(restored); setRole(restored.targetRole); setSaved(true);
        localStorage.setItem("skillpath-analysis-v1", JSON.stringify({ report: restored, fileName: "Saved resume", updatedAt: new Date().toISOString(), userEmail: session.user.email ?? undefined } satisfies Stored));
      }
    }).catch(() => undefined);
  }, [session?.user?.email]);

  async function analyze(file: File, documentOptions?: { replaceId?: string | null }) {
    setError("");
    if (!file.name.toLowerCase().endsWith(".pdf") || file.type && file.type !== "application/pdf") { setError("Please choose a PDF resume."); return; }
    if (file.size > 4 * 1024 * 1024) { setError("The PDF is larger than 4 MB. Please choose a smaller file."); return; }
    setBusy(true); setFileName(file.name);
    try {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
      let text = "";
      for (let pageNo = 1; pageNo <= Math.min(pdf.numPages, 8); pageNo++) {
        const page = await pdf.getPage(pageNo);
        const content = await page.getTextContent();
        text += content.items.map((item) => "str" in item ? item.str : "").join(" ") + "\n";
      }
      if (text.trim().length < 30) throw new Error("This PDF doesnâ€™t contain selectable text. Try an exported PDF instead of a scan.");
      const response = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, targetRole: role }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Analysis failed. Please try again.");
      const normalized = normalizeReport(data);
      setReport(normalized); setSaved(Boolean(session?.user?.email));
      if (session?.user?.email) localStorage.setItem("skillpath-analysis-v1", JSON.stringify({ report: normalized, fileName: file.name, updatedAt: new Date().toISOString(), userEmail: session.user.email ?? undefined } satisfies Stored));
      else localStorage.removeItem("skillpath-analysis-v1");
      if (session?.user?.email) {
        try { await saveDocument(file, documentOptions?.replaceId); }
        catch (e) {
          const message = e instanceof Error ? e.message : "Could not save the uploaded document.";
          setDocumentsError(message);
          setError(`Your analysis is ready, but the resume file could not be saved: ${message}`);
        }
      }
      setSection("Overview");
    } catch (e) { setError(e instanceof Error ? e.message : "We couldnâ€™t read this PDF. Please try another file."); }
    finally { setBusy(false); }
  }

  async function toggleRoadmap(index: number) {
    const item = report.roadmap[index];
    const done = !item.done;
    const updated = { ...report, roadmap: report.roadmap.map((current, i) => i === index ? { ...current, done, steps: current.steps.map((step) => ({ ...step, done })) } : current) };
    setReport(updated);
    void persistProgress(updated);
  }

  function toggleRoadmapStep(index: number, stepIndex: number) {
    const updated = { ...report, roadmap: report.roadmap.map((item, i) => {
      if (i !== index) return item;
      const steps = item.steps.map((step, j) => j === stepIndex ? { ...step, done: !step.done } : step);
      return { ...item, steps, done: steps.every((step) => step.done) };
    }) };
    setReport(updated);
    void persistProgress(updated);
  }

  function resetReport() {
    setReport(initialReport); setRole(initialReport.targetRole); setFileName("No resume uploaded"); setSaved(false); setSection("Overview");
    localStorage.removeItem("skillpath-analysis-v1");
  }

  const navItems = [
    { title: "Overview", icon: LayoutDashboard },
    { title: "My skills", icon: Target },
    { title: "Learning plan", icon: BookOpen },
    { title: "PMKVY pathways", icon: GraduationCap },
  ];
  const matchedPercent = report.readiness;
  const roleInfo = roles.find((item) => item.title === report.targetRole) ?? roles[0];
  const skillChartData = useMemo(() => {
    const categories = [...new Set(roleInfo.skills.map((skill) => skill.category))];
    return categories.map((category) => ({
      category,
      required: roleInfo.skills.filter((skill) => skill.category === category).length,
      matched: roleInfo.skills.filter((skill) => skill.category === category && report.matchedSkills.includes(skill.name)).length,
    }));
  }, [roleInfo, report.matchedSkills]);
  const firstName = session?.user?.name?.split(" ")[0] || "Student";

  return <main className="min-h-screen lg:flex">
    <aside className={`${mobileMenu ? "fixed inset-y-0 left-0 z-50 flex" : "hidden"} w-[252px] shrink-0 flex-col border-r border-[#e9eeeb] bg-white px-5 py-6 lg:sticky lg:top-0 lg:flex lg:h-screen`}>
      <div className="flex items-center gap-3 px-2"><div className="grid size-9 place-items-center rounded-xl bg-[#397765] text-white"><Sparkles size={19} /></div><div><div className="text-[17px] font-bold tracking-[-.04em]">skillpath<span className="text-[#397765]">.</span></div><div className="text-[10px] tracking-[.1em] text-[#8b9691]">CAREER COMPANION</div></div><button onClick={() => setMobileMenu(false)} className="ml-auto text-[#88938e] lg:hidden"><X size={18} /></button></div>
      <div className="mt-10 px-2 text-[10px] font-semibold uppercase tracking-[.13em] text-[#9da8a3]">Workspace</div>
      <nav className="mt-3 space-y-1">
        {navItems.map(({ title, icon: Icon }) => <button key={title} onClick={() => { setSection(title); setMobileMenu(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition ${section === title ? "bg-[#edf4ef] text-[#2f6d59]" : "text-[#707d77] hover:bg-[#f6f8f6]"}`}><Icon size={17} strokeWidth={1.8} />{title}{title === "Learning plan" && <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[10px] text-[#76827d]">{report.roadmap.length}</span>}</button>)}
      </nav>
      <div className="mt-8 px-2 text-[10px] font-semibold uppercase tracking-[.13em] text-[#9da8a3]">Your target</div>
      <div className="mt-3 rounded-2xl border border-[#e9eeeb] bg-[#fbfcfb] p-3.5"><div className="flex items-center justify-between"><span className="text-[11px] text-[#85918b]">Working towards</span><button onClick={() => setSection("My skills")} aria-label="Change target role" className="text-[#89958f]"><ArrowUpRight size={14} /></button></div><div className="mt-2 text-[13px] font-semibold">{report.targetRole}</div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e9eeeb]"><div className="h-full rounded-full bg-[#76a58e]" style={{ width: `${matchedPercent}%` }} /></div><div className="mt-1.5 flex justify-between text-[10px] text-[#86918c]"><span>Skill coverage</span><span>{matchedPercent}%</span></div></div>
      <div className="mt-auto rounded-2xl bg-[#f3f6ed] p-4"><div className="grid size-8 place-items-center rounded-xl bg-white text-[#65845b]"><CircleHelp size={17} /></div><div className="mt-3 text-[12px] font-semibold">A small step counts.</div><p className="mt-1 text-[11px] leading-[1.6] text-[#758075]">Pick one skill and spend 20 minutes on it today.</p><button onClick={() => setSection("Learning plan")} className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-[#54764b]">See your plan <ArrowRight size={13} /></button></div>
      <div className="mt-5 flex items-center gap-2.5 border-t border-[#edf0ee] pt-4"><div className="grid size-8 shrink-0 place-items-center rounded-full bg-[#e8f1ec] text-[#4b7864]">{session ? <span className="text-[11px] font-semibold">{firstName.slice(0, 1).toUpperCase()}</span> : <UserRound size={16} />}</div><div className="min-w-0 flex-1"><div className="truncate text-[12px] font-semibold">{session?.user?.name || "Guest workspace"}</div><div className="truncate text-[10px] text-[#8a9690]">{session?.user?.email || "Progress saved in this browser"}</div>{session?.user?.college && <div className="mt-0.5 truncate text-[9px] text-[#9aa39e]">{session.user.college}{session.user.studyYear ? ` Â· ${session.user.studyYear}` : ""}</div>}</div></div>
    </aside>

    {mobileMenu && <button aria-label="Close menu" onClick={() => setMobileMenu(false)} className="fixed inset-0 z-40 bg-black/20 lg:hidden" />}

    <section className="min-w-0 flex-1">
      <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void analyze(file); e.currentTarget.value = ""; }} />
      <input ref={libraryFileRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void analyze(file, { replaceId: replaceDocumentId }); setReplaceDocumentId(null); e.currentTarget.value = ""; }} />
      <header className="sticky top-0 z-30 flex h-[66px] items-center justify-between border-b border-[#e9eeeb] bg-white/95 px-5 backdrop-blur md:px-9">
        <div className="flex items-center gap-3"><button className="text-[#718079] lg:hidden" onClick={() => setMobileMenu(true)} aria-label="Open menu"><Menu size={20} /></button><div className="text-[12px] text-[#97a19d]">Workspace <span className="px-1.5">/</span><span className="font-medium text-[#40514a]">{section}</span></div></div>
        <div className="flex items-center gap-2">{status === "loading" ? <span className="text-[11px] text-[#919b96]">Loadingâ€¦</span> : session ? <div className="hidden items-center gap-2 rounded-full border border-[#e9eeeb] px-3 py-1.5 sm:flex"><div className="size-1.5 rounded-full bg-[#64a27d]" /><span className="text-[11px] text-[#62716a]">Synced to your account</span></div> : null}
          {!session && <><Link href="/login" className="rounded-lg border border-[#dfe6e1] px-3 py-2 text-[11px] font-medium text-[#56665f] hover:bg-[#f6f8f6]">Sign in</Link><Link href="/register" className="rounded-lg bg-[#397765] px-3 py-2 text-[11px] font-semibold text-white hover:bg-[#2e6958]">Sign up</Link></>}
          <div className="relative" ref={profileMenuRef}>
            <button type="button" onClick={() => setProfileMenuOpen((open) => !open)} aria-label="Open profile menu" aria-haspopup="menu" aria-expanded={profileMenuOpen} className="flex size-9 items-center justify-center rounded-full bg-[#e9f1ec] text-[#4f7966] ring-1 ring-transparent transition hover:bg-[#dfeae3] focus:outline-none focus:ring-2 focus:ring-[#8cac99]">
              {session ? <span className="text-[12px] font-semibold">{firstName.slice(0, 1).toUpperCase()}</span> : <UserRound size={16} />}
            </button>
            {profileMenuOpen && <div role="menu" aria-label="Profile menu" className="absolute right-0 top-[calc(100%+10px)] z-50 w-[280px] overflow-hidden rounded-2xl border border-[#e7ece8] bg-white p-2 shadow-[0_18px_50px_rgba(35,54,43,.14)]">
              <div className="flex items-center gap-3 rounded-xl bg-[#f7f9f7] p-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[#e6efe9] text-[13px] font-semibold text-[#4f7966]">{session ? firstName.slice(0, 1).toUpperCase() : <UserRound size={17} />}</div>
                <div className="min-w-0"><div className="truncate text-[12px] font-semibold text-[#34443c]">{session?.user?.name || "Guest workspace"}</div><div className="mt-0.5 truncate text-[10px] text-[#839087]">{session?.user?.email || "Sign in to save your progress"}</div>{session?.user?.college && <div className="mt-1 truncate text-[10px] text-[#929d96]">{session.user.college}{session.user.studyYear ? ` · ${session.user.studyYear}` : ""}</div>}</div>
              </div>
              <div className="my-2 border-t border-[#edf0ee]" />
              <button role="menuitem" onClick={() => openProfileSection("Learning plan")} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[12px] font-medium text-[#526259] transition hover:bg-[#f4f7f4]"><BookOpen size={16} className="text-[#72917d]" /><span className="flex-1">My progress</span><span className="text-[10px] text-[#8b9790]">{completion}%</span></button>
              <button role="menuitem" onClick={() => openProfileSection("My skills")} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[12px] font-medium text-[#526259] transition hover:bg-[#f4f7f4]"><Target size={16} className="text-[#72917d]" />My skills</button>
              <button role="menuitem" onClick={() => openProfileSection("My resume")} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[12px] font-medium text-[#526259] transition hover:bg-[#f4f7f4]"><FileText size={16} className="text-[#72917d]" /><span className="flex-1">My resume</span><span className="text-[10px] text-[#8b9790]">{documents.length}</span></button>
              {!session ? <><div className="my-2 border-t border-[#edf0ee]" /><Link role="menuitem" onClick={() => setProfileMenuOpen(false)} href="/login" className="block rounded-xl px-3 py-2.5 text-[12px] font-medium text-[#526259] hover:bg-[#f4f7f4]">Sign in to your account</Link><Link role="menuitem" onClick={() => setProfileMenuOpen(false)} href="/register" className="block rounded-xl px-3 py-2.5 text-[12px] font-semibold text-[#397765] hover:bg-[#f4f7f4]">Create an account</Link></> : <><div className="my-2 border-t border-[#edf0ee]" /><button role="menuitem" onClick={() => { setProfileMenuOpen(false); void signOut({ callbackUrl: "/" }); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[12px] font-medium text-[#9a594c] transition hover:bg-[#fff5f2]"><LogOut size={16} />Sign out</button></>}
            </div>}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1250px] px-5 py-7 md:px-9 md:py-9">
        {error && <div role="alert" className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-[#f1d4cb] bg-[#fff5f1] px-4 py-3 text-[12px] text-[#9a4f3e]"><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss error" className="text-[#9a4f3e]"><X size={15} /></button></div>}
        {section === "Overview" && <>
          <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="text-[11px] font-medium uppercase tracking-[.14em] text-[#799087]">CAREER SNAPSHOT</div><h1 className="mt-2 text-[27px] font-semibold tracking-[-.04em] md:text-[31px]">Your next role, mapped. </h1><p className="mt-1.5 text-[13px] text-[#7c8882]">A clearer picture of where you are, and what to work on next.</p></div><button onClick={() => fileRef.current?.click()} disabled={busy} className="flex items-center gap-2 rounded-xl bg-[#397765] px-4 py-2.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#2e6958] disabled:opacity-60"><Upload size={15} />{busy ? "Analyzingâ€¦" : "Update resume"}</button></div>

          <article className="relative isolate mt-6 overflow-hidden rounded-[26px] bg-[#193a38] p-5 text-white shadow-[0_16px_45px_rgba(25,58,56,0.16)] md:p-7">
            <div aria-hidden="true" className="absolute -right-20 -top-28 -z-10 size-[310px] rounded-full border border-white/10" />
            <div aria-hidden="true" className="absolute -right-8 -top-16 -z-10 size-[210px] rounded-full border border-white/10" />
            <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
              <div><div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[10px] font-medium tracking-[.08em] text-[#dce9dc]"><span className="size-1.5 rounded-full bg-[#c8df8d]" />CURRENT TARGET Â· {roleInfo.short.toUpperCase()}</div>
                <h2 className="mt-4 max-w-[560px] text-[25px] font-semibold leading-tight tracking-[-.035em] md:text-[30px]">Make your next move with a clear plan.</h2>
                <p className="mt-2 max-w-[540px] text-[12px] leading-relaxed text-[#d0ded8]">{hasAnalysis ? `We found ${report.matchedSkills.length} of ${roleInfo.skills.length} role skills in your resume. Build on what you know and choose one gap to work on next.` : "No resume has been analyzed yet. Upload a PDF to see your skills and possible gaps."}</p>
                <div className="mt-5 flex flex-wrap gap-2"><button onClick={() => setSection("My skills")} className="rounded-xl bg-[#d9e9ae] px-3.5 py-2.5 text-[11px] font-semibold text-[#253d32] transition hover:bg-[#e6f1c9]">{hasAnalysis ? "Review skill gaps" : "Upload a resume"} <ArrowRight className="ml-1 inline" size={13} /></button><button onClick={() => setSection("PMKVY pathways")} className="rounded-xl border border-white/20 px-3.5 py-2.5 text-[11px] font-medium text-white transition hover:bg-white/10">Explore PMKVY pathways</button></div>
              </div>
              <div className="mx-auto flex items-center gap-4 md:mx-0 md:pr-3"><div aria-label={`Skill coverage ${matchedPercent} percent`} className="grid size-[112px] place-items-center rounded-full p-[7px]" style={{ background: `conic-gradient(#d9e9ae ${matchedPercent}%, rgba(255,255,255,.15) 0)` }}><div className="grid size-full place-items-center rounded-full bg-[#193a38]"><div className="text-center"><div className="text-[27px] font-semibold tracking-[-.05em]">{matchedPercent}%</div><div className="mt-0.5 text-[9px] tracking-[.08em] text-[#cbd8d2]">SKILL COVERAGE</div></div></div></div><div className="text-[10px] leading-relaxed text-[#cbd8d2] md:hidden">Based on {report.matchedSkills.length} matched skills</div></div>
            </div>
          </article>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Skill coverage" value={`${matchedPercent}%`} note={hasAnalysis ? `${report.matchedSkills.length} of ${roleInfo.skills.length} keywords found` : "Upload a resume to calculate"} icon={<Target size={16} />} positive />
            <StatCard label="Skills matched" value={String(report.matchedSkills.length).padStart(2, "0")} note={hasAnalysis ? "Found in your resume" : "No resume analyzed yet"} icon={<CheckCircle2 size={16} />} />
            <StatCard label="Skills to build" value={String(report.missingSkills.length).padStart(2, "0")} note={hasAnalysis ? "A starting point, not a checklist" : "Gaps appear after analysis"} icon={<ArrowUpRight size={16} />} />
            <StatCard label="Plan progress" value={`${completion}%`} note={hasAnalysis ? `${report.roadmap.filter((i) => i.done).length} of ${report.roadmap.length} learning plans completed` : "Plan appears after analysis"} icon={<BookOpen size={16} />} />
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_1fr]">
            <article className="rounded-2xl border border-[#e8eeea] bg-white p-5 md:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-[13px] font-semibold"><span className="grid size-7 place-items-center rounded-lg bg-[#eff5f0] text-[#58816d]"><BarChart3 size={15} /></span>Skills by category</div><p className="mt-1 ml-9 text-[11px] text-[#8a9690]">{hasAnalysis ? `Your resume compared with ${roleInfo.short} requirements` : "Upload a resume to see skills by category"}</p></div><div className="flex items-center gap-3 text-[10px] text-[#7f8a85]"><span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-[#dfe8e1]" />Role</span><span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-[#65947a]" />Found</span></div></div>
              {hasAnalysis ? (<div className="mt-5 h-[205px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={skillChartData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }} barCategoryGap={10}><CartesianGrid horizontal={false} stroke="#eff2f0" /><XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#9aa39f", fontSize: 10 }} /><YAxis type="category" dataKey="category" width={94} axisLine={false} tickLine={false} tick={{ fill: "#849089", fontSize: 10 }} /><Tooltip contentStyle={{ border: "1px solid #e6ece8", borderRadius: 10, fontSize: 11 }} /><Bar dataKey="required" name="Role skills" fill="#e2e9e3" radius={[0, 4, 4, 0]} barSize={9} /><Bar dataKey="matched" name="Found in resume" fill="#65947a" radius={[0, 4, 4, 0]} barSize={9} /></BarChart></ResponsiveContainer></div>) : <div className="mt-5 grid h-[205px] place-items-center rounded-xl bg-[#fafbfa] text-[12px] text-[#8a9690]">No resume skills to chart yet</div>}<div className="mt-1 flex items-center gap-2 border-t border-[#f0f2f0] pt-4"><div className="grid size-7 place-items-center rounded-full bg-[#edf4ef] text-[#5e896f]"><CircleHelp size={14} /></div><span className="text-[11px] text-[#78847e]">A keyword match doesnâ€™t measure proficiency; use it as a prompt to review your resume.</span></div>
            </article>
            <article className="rounded-2xl border border-[#e8eeea] bg-white p-5 md:p-6"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-[13px] font-semibold"><span className="grid size-7 place-items-center rounded-lg bg-[#f3f2e9] text-[#8b845e]"><BookOpen size={15} /></span>Your learning plan</div><button onClick={() => setSection("Learning plan")} className="text-[11px] font-medium text-[#59806b]">View all <ArrowRight className="ml-1 inline" size={13} /></button></div><p className="mt-1 ml-9 text-[11px] text-[#8a9690]">Small steps towards {roleInfo.short}</p>
              {report.roadmap.length ? (<div className="mt-5 space-y-3">{report.roadmap.slice(0, 3).map((item, index) => <button key={`${item.title}-${index}`} onClick={() => void toggleRoadmap(index)} className="flex w-full items-center gap-3 rounded-xl border border-[#edf0ee] p-3 text-left transition hover:border-[#d7e3da] hover:bg-[#fbfcfb]"><span className={`grid size-7 shrink-0 place-items-center rounded-full border ${item.done ? "border-[#d3e6d9] bg-[#e9f3ed] text-[#5b8a6e]" : "border-[#e7ece8] text-[#9ba69f]"}`}>{item.done ? <Check size={14} /> : <span className="text-[10px]">0{index + 1}</span>}</span><span className="min-w-0 flex-1"><span className={`block truncate text-[12px] font-medium ${item.done ? "text-[#77847d] line-through decoration-[#b6c5bb]" : "text-[#34443c]"}`}>{item.title}</span><span className="mt-1 flex items-center gap-1 text-[10px] text-[#909b95]"><Clock3 size={11} />{item.duration}</span></span><ArrowUpRight size={14} className="text-[#a0aaa4]" /></button>)}</div>) : <p className="mt-5 rounded-xl bg-[#fafbfa] p-3 text-[11px] leading-relaxed text-[#89958e]">{hasAnalysis ? "No learning steps are needed for the resume skills found so far." : "Upload a resume to generate a learning plan."}</p>}
              {report.roadmap.length ? <button onClick={() => setSection("Learning plan")} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#f5f7f4] py-2.5 text-[11px] font-semibold text-[#607267] hover:bg-[#edf3ed]">Continue learning <ArrowRight size={13} /></button> : <button onClick={() => fileRef.current?.click()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#f5f7f4] py-2.5 text-[11px] font-semibold text-[#607267] hover:bg-[#edf3ed]">Upload resume <Upload size={13} /></button>}
            </article>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1.45fr_1fr]">
            <article className="rounded-2xl border border-[#e8eeea] bg-white p-5 md:p-6"><div className="flex items-center justify-between"><div><div className="text-[13px] font-semibold">Your skills at a glance</div><p className="mt-1 text-[11px] text-[#8a9690]">Skills mentioned in {fileName}</p></div><button onClick={() => setSection("My skills")} className="text-[11px] font-medium text-[#59806b]">Explore skills <ArrowRight className="ml-1 inline" size={13} /></button></div><div className="mt-4 flex flex-wrap gap-2">{report.matchedSkills.slice(0, 8).map((skill) => <span key={skill} className="flex items-center gap-1.5 rounded-lg bg-[#f0f5f1] px-2.5 py-1.5 text-[11px] text-[#527661]"><Check size={12} />{skill}</span>)}{report.matchedSkills.length === 0 && <span className="text-[12px] text-[#88948e]">Upload a resume to see your skills here.</span>}</div><div className="mt-5 border-t border-[#f0f2f0] pt-4"><div className="mb-2.5 flex items-center justify-between text-[10px]"><span className="text-[#7c8982]">{hasAnalysis ? "Skills that could strengthen your profile" : "Possible skill gaps"}</span><span className="text-[#94a099]">{hasAnalysis ? `${report.missingSkills.length} to explore` : "Not analyzed"}</span></div><div className="flex flex-wrap gap-2">{hasAnalysis && report.missingSkills.slice(0, 5).map((skill) => <span key={skill} className="rounded-lg border border-dashed border-[#dfe7e1] px-2.5 py-1.5 text-[11px] text-[#7e8d84]">+ {skill}</span>)}</div></div></article>
            <article className="rounded-2xl border border-[#e8eeea] bg-white p-5 md:p-6"><div className="flex items-center gap-2 text-[13px] font-semibold"><span className="grid size-7 place-items-center rounded-lg bg-[#f7f2e8] text-[#9d8753]"><Sparkles size={15} /></span>A note for you</div><p className="mt-4 text-[13px] leading-[1.75] text-[#64716a]">{report.summary}</p><div className="mt-4 flex items-center gap-2 border-t border-[#f0f2f0] pt-3 text-[10px] text-[#9aa39e]"><LockKeyhole size={12} />{report.source?.includes("Gemini") ? "AI suggestions Â· review before you act" : hasAnalysis ? "Based on the skills in your resume" : "Waiting for a resume analysis"}</div></article>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1.45fr_1fr]">
            <article onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); const file = e.dataTransfer.files[0]; if (file) void analyze(file); }} className={`rounded-2xl border border-dashed p-5 transition md:p-6 ${dragging ? "border-[#6c9b7f] bg-[#eff6f0]" : "border-[#dce5de] bg-[#fbfcfb]"}`}><div className="flex items-center gap-4"><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-[#6b8d77] shadow-sm"><FileText size={20} /></div><div className="min-w-0 flex-1"><div className="text-[13px] font-semibold">{hasAnalysis ? "Refresh your resume analysis" : "Upload your resume"}</div><p className="mt-1 text-[11px] leading-relaxed text-[#85918a]">Drop a PDF here or choose a file. PDF parsing happens in your browser.</p></div><button onClick={() => fileRef.current?.click()} disabled={busy} className="shrink-0 rounded-lg border border-[#dfe7e1] bg-white px-3 py-2 text-[11px] font-semibold text-[#557562] hover:bg-[#f5f8f5]">Choose PDF</button></div>{error && <div role="alert" className="mt-3 rounded-lg bg-[#fff3ef] px-3 py-2 text-[11px] text-[#a25440]">{error}</div>}<div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-[#98a29c]"><span>PDF up to 4 MB</span><span>Text PDFs work best</span><span>Resume text is sent to Gemini only when configured</span></div></article>
            <article className="rounded-2xl border border-[#e8eeea] bg-white p-5 md:p-6"><div className="flex items-center justify-between"><div className="text-[13px] font-semibold">Target role</div><span className="rounded-full bg-[#f1f5f1] px-2.5 py-1 text-[10px] text-[#69806f]">Student view</span></div><p className="mt-1 text-[11px] text-[#8a9690]">Pick a role to see the skills it usually needs.</p><div className="relative mt-4"><select value={role} onChange={(e) => changeRole(e.target.value)} className="w-full appearance-none rounded-xl border border-[#e7ece8] bg-[#fbfcfb] px-3.5 py-3 pr-9 text-[12px] font-medium text-[#44544b] outline-none focus:border-[#8cac99]">{roles.map((item) => <option key={item.title} value={item.title}>{item.title}</option>)}</select><ChevronDown size={15} className="pointer-events-none absolute right-3 top-3.5 text-[#8e9993]" /></div><div className="mt-3 flex items-center justify-between text-[10px] text-[#88948e]"><span>{roles.find((item) => item.title === role)?.description}</span><button onClick={() => fileRef.current?.click()} className="ml-2 shrink-0 font-semibold text-[#58806b]">Re-check resume â†—</button></div></article>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#e8eeea] pt-4 text-[10px] text-[#97a19b]"><span>SkillPath is a student project for exploration. Suggestions are a starting point, not a hiring guarantee.</span><button onClick={resetReport} className="text-[#76847b] hover:text-[#446a55]">Reset analysis</button></div>
        </>}

        {section === "My skills" && <SkillsPage role={role} setRole={changeRole} report={report} hasAnalysis={hasAnalysis} fileName={fileName} onUpload={() => fileRef.current?.click()} onNavigate={setSection} />}
        {section === "Learning plan" && <PlanPage report={report} onToggle={toggleRoadmap} onToggleStep={toggleRoadmapStep} completion={completion} hasAnalysis={hasAnalysis} onUpload={() => fileRef.current?.click()} onNavigate={setSection} />}
        {section === "My resume" && <>
          <PageHeading eyebrow="RESUME LIBRARY" title="Manage your resume." subtitle="View, replace, download, or delete the resume saved to your account." />
          {!session?.user?.email ? <article className="mt-6 rounded-2xl border border-[#e8eeea] bg-white p-6"><p className="text-[13px] font-medium text-[#425349]">Sign in to manage your resume.</p><p className="mt-1 text-[11px] text-[#859189]">Uploaded documents are saved to your account, not in the guest workspace.</p><Link href="/login" className="mt-4 inline-flex rounded-lg bg-[#397765] px-4 py-2.5 text-[11px] font-semibold text-white">Sign in</Link></article> : <>
            <article className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-[#e8eeea] bg-white p-4 md:p-5"><div className="min-w-0 flex-1"><div className="text-[12px] font-semibold text-[#435249]">Resume PDF</div><p className="mt-1 text-[10px] text-[#929d96]">Up to 4 MB · uploading also refreshes your skill analysis</p></div><button disabled={busy} onClick={() => { setReplaceDocumentId(null); libraryFileRef.current?.click(); }} className="rounded-lg bg-[#397765] px-3.5 py-2.5 text-[11px] font-semibold text-white hover:bg-[#2e6958] disabled:opacity-50"><Upload size={13} className="mr-1.5 inline" />Upload resume</button></article>
            {documentsError && <div role="alert" className="mt-4 flex items-center justify-between rounded-xl border border-[#f1d4cb] bg-[#fff5f1] px-4 py-3 text-[11px] text-[#9a4f3e]"><span>{documentsError}</span><button onClick={() => void loadDocuments()} className="font-semibold underline">Retry</button></div>}
            <div className="mt-5 space-y-3">{documentsLoading ? <div className="rounded-2xl border border-[#e8eeea] bg-white p-5 text-[12px] text-[#839087]">Loading your resume…</div> : documents.length ? documents.map((document) => <article key={document.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#e8eeea] bg-white p-4 md:p-5"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eff5f0] text-[#58816d]"><FileText size={18} /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="rounded-full bg-[#f0f5f1] px-2 py-0.5 text-[9px] font-semibold text-[#60806b]">Resume</span><span className="text-[10px] text-[#98a29c]">{(document.size / (1024 * 1024)).toFixed(2)} MB</span></div><div className="mt-1 truncate text-[12px] font-semibold text-[#435249]">{document.fileName}</div><div className="mt-1 text-[10px] text-[#929d96]">Updated {new Date(document.updatedAt).toLocaleDateString()}</div></div><a href={`/api/resumes/${document.id}`} target="_blank" rel="noreferrer" className="rounded-lg border border-[#e2e9e3] px-3 py-2 text-[10px] font-medium text-[#557562] hover:bg-[#f5f8f5]">View</a><a href={`/api/resumes/${document.id}?download=1`} className="rounded-lg border border-[#e2e9e3] px-3 py-2 text-[10px] font-medium text-[#557562] hover:bg-[#f5f8f5]"><Download size={12} className="mr-1 inline" />Download</a><button disabled={busy} onClick={() => { setReplaceDocumentId(document.id); libraryFileRef.current?.click(); }} className="rounded-lg border border-[#e2e9e3] px-3 py-2 text-[10px] font-medium text-[#557562] hover:bg-[#f5f8f5] disabled:opacity-50">Replace</button><button disabled={documentBusyId === document.id} onClick={() => void deleteDocument(document)} className="rounded-lg px-3 py-2 text-[10px] font-medium text-[#a45d50] hover:bg-[#fff5f2] disabled:opacity-50"><Trash2 size={13} className="mr-1 inline" />{documentBusyId === document.id ? "Deleting…" : "Delete"}</button></article>) : <div className="rounded-2xl border border-dashed border-[#dce5de] bg-white p-7 text-center"><div className="mx-auto grid size-10 place-items-center rounded-xl bg-[#f3f6f3] text-[#78917f]"><FileText size={18} /></div><p className="mt-3 text-[13px] font-semibold text-[#435249]">No resume uploaded yet</p><p className="mt-1 text-[11px] text-[#89958e]">Upload a PDF to analyze and manage your resume here.</p></div>}</div>
          </>}
        </>}
        {section === "PMKVY pathways" && <PMKVYPage report={report} hasAnalysis={hasAnalysis} />}
      </div>
    </section>
  </main>;
}

function StatCard({ label, value, note, icon, positive = false }: { label: string; value: string; note: string; icon: React.ReactNode; positive?: boolean }) {
  return <article className="rounded-2xl border border-[#e8eeea] bg-white p-4.5"><div className="flex items-center justify-between"><span className="text-[11px] text-[#829087]">{label}</span><span className="grid size-7 place-items-center rounded-lg bg-[#f3f6f3] text-[#708979]">{icon}</span></div><div className="mt-2 text-[27px] font-semibold tracking-[-.04em]">{value}</div><div className="mt-1 flex items-center gap-1 text-[10px] text-[#89958e]">{positive && <ArrowUpRight size={12} className="text-[#6da17d]" />}{note}</div></article>;
}

function SkillsPage({ role, setRole, report, fileName, onUpload, hasAnalysis, onNavigate }: { role: string; setRole: (role: string) => void; report: Report; fileName: string; onUpload: () => void; hasAnalysis: boolean; onNavigate: (section: string) => void }) {
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const guide = selectedSkill ? getLearningGuide(selectedSkill) : null;
  const selected = roles.find((item) => item.title === role) ?? roles[0];
  const matched = new Set(report.targetRole === role ? report.matchedSkills : []);
  const required = selected.skills;
  return <><PageHeading eyebrow="YOUR SKILLS" title="See what you already bring." subtitle="A resume gives us clues, not the whole picture. Add context where it helps." />
    <article className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-[#e8eeea] bg-white p-5"><div className="grid size-10 place-items-center rounded-xl bg-[#eff5f0] text-[#58816d]"><Target size={18} /></div><div className="min-w-[220px] flex-1"><div className="text-[12px] font-semibold">Compare against a role</div><div className="mt-1 text-[11px] text-[#89958e]">The skills below update when you change your target.</div></div><select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-lg border border-[#e7ece8] bg-white px-3 py-2 text-[12px] text-[#4b5b52] outline-none">{roles.map((item) => <option key={item.title}>{item.title}</option>)}</select><button onClick={() => onNavigate("Learning plan")} className="rounded-lg bg-[#edf4ef] px-3 py-2 text-[11px] font-semibold text-[#4f7966] hover:bg-[#e3eee6]">Open learning plan <ArrowRight size={12} className="ml-1 inline" /></button></article>
    <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><article className="rounded-2xl border border-[#e8eeea] bg-white p-5 md:p-6"><div className="flex items-center justify-between"><div><div className="text-[13px] font-semibold">Skills for {selected.short}</div><p className="mt-1 text-[11px] text-[#8a9690]">{hasAnalysis ? `${matched.size} of ${required.length} guide skills found in your resume` : "Upload a resume to compare skills with this role"}</p></div><span className="rounded-full bg-[#f0f5f1] px-2.5 py-1 text-[10px] text-[#60806b]">{hasAnalysis ? `${Math.round(matched.size / required.length * 100)}% match` : "Not analyzed"}</span></div>{!hasAnalysis && <p className="mt-5 rounded-xl bg-[#fafbfa] p-3 text-[11px] leading-relaxed text-[#89958e]">These are typical skills for this role, not skills detected in your profile. Upload your resume to compare.</p>}<div className="mt-5 space-y-2">{required.map((skill) => <div key={skill.name} className="flex items-center gap-3 rounded-xl border border-[#edf0ee] p-3"><span className={`grid size-7 place-items-center rounded-full ${matched.has(skill.name) ? "bg-[#e8f2eb] text-[#5f9170]" : "bg-[#f4f5f2] text-[#a4aca6]"}`}>{matched.has(skill.name) ? <Check size={14} /> : <Plus size={13} />}</span><span className="min-w-0 flex-1"><span className="block text-[12px] font-medium text-[#435249]">{skill.name}</span><span className="mt-0.5 block text-[10px] text-[#929d96]">{skill.category}</span></span><span className="rounded-md bg-[#f6f7f5] px-2 py-1 text-[9px] text-[#858f89]">{skill.level}</span>{matched.has(skill.name) ? <span className="w-[86px] text-right text-[10px] text-[#649073]">In your resume</span> : <button onClick={() => setSelectedSkill(skill.name)} className="w-[86px] text-right text-[10px] font-medium text-[#4e806d] hover:underline">{hasAnalysis ? "Why it matters" : "Learn more"}</button>}</div>)}</div></article><div className="space-y-5"><article className="rounded-2xl border border-[#e8eeea] bg-white p-5 md:p-6"><div className="text-[13px] font-semibold">{selectedSkill ? `Why ${selectedSkill} matters` : "A note about skill matching"}</div><p className="mt-3 text-[12px] leading-[1.8] text-[#75827a]">{guide?.why || (hasAnalysis ? "We look for skill names in your resume. A match does not measure proficiency, and a missing skill may simply be described differently." : "Upload a resume first. No skills have been marked as found or missing yet.")}</p>{guide ? <div className="mt-4 space-y-3 rounded-xl bg-[#f4f7f3] p-3 text-[11px] leading-relaxed text-[#6d7f71]"><div><span className="font-semibold">Learning objective</span><p className="mt-1">{guide.objective}</p></div><div><span className="font-semibold">Mini project</span><p className="mt-1">{guide.project}</p></div><a href={guide.resource.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold underline decoration-[#b6cbb9] underline-offset-2">{guide.resource.label} <ArrowUpRight size={12} /></a><button onClick={() => setSelectedSkill(null)} className="block text-[10px] text-[#60776a] underline">Close skill guide</button></div> : <div className="mt-4 rounded-xl bg-[#f4f7f3] p-3 text-[11px] leading-relaxed text-[#6d7f71]">Tip: Add projects and coursework to your resume so the tools you used are easier to spot.</div>}</article><article className="rounded-2xl border border-[#e8eeea] bg-white p-5 md:p-6"><div className="flex items-center gap-2 text-[13px] font-semibold"><FileText size={15} className="text-[#6c8875]" />{hasAnalysis ? "Resume on file" : "No resume uploaded"}</div><div className="mt-3 flex items-center gap-3 rounded-xl bg-[#fafbfa] p-3"><div className="grid size-9 place-items-center rounded-lg bg-white text-[#78917f]"><FileText size={17} /></div><span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-medium">{fileName}</span><span className="mt-1 block text-[10px] text-[#929d96]">{hasAnalysis ? `Analyzed ${String(report.createdAt).slice(0, 10)} ? ${report.source || "SkillPath matcher"}` : "Upload a PDF to start your analysis"}</span></span>{hasAnalysis && <CheckCircle2 size={16} className="text-[#71a082]" />}</div><button onClick={onUpload} className="mt-3 w-full rounded-lg border border-[#e2e9e3] py-2 text-[11px] font-medium text-[#5e7967]">Update resume</button></article></div></div>
  </>;
}

function PlanPage({ report, onToggle, onToggleStep, completion, hasAnalysis, onUpload, onNavigate }: { report: Report; onToggle: (index: number) => void; onToggleStep: (index: number, stepIndex: number) => void; completion: number; hasAnalysis: boolean; onUpload: () => void; onNavigate: (section: string) => void }) {
  return <><PageHeading eyebrow="ONE STEP AT A TIME" title="Your learning plan." subtitle="A flexible route to practice the skills your target role asks for. Make it your own." />
    <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_.9fr]"><section className="space-y-4"><div className="rounded-2xl border border-[#e8eeea] bg-white p-5"><div className="flex items-center justify-between"><div><div className="text-[13px] font-semibold">Suggested next steps</div><p className="mt-1 text-[11px] text-[#89958e]">For {report.targetRole}</p></div><span className="rounded-full bg-[#eef5ef] px-2.5 py-1 text-[10px] text-[#62816b]">{completion}% complete</span></div><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#edf0ec]"><div className="h-full rounded-full bg-[#79a38a] transition-all" style={{ width: `${completion}%` }} /></div><p className="mt-2 text-[10px] text-[#89958e]">Progress is based on the learning steps you mark complete.</p></div>
      {report.roadmap.map((item, index) => <article key={`${item.title}-${index}`} className="rounded-2xl border border-[#e8eeea] bg-white p-5 md:p-6"><div className="flex items-start gap-3"><span className={`grid size-8 shrink-0 place-items-center rounded-full ${item.done ? "bg-[#eaf3ec] text-[#5f8a6d]" : "bg-[#f3f5f2] text-[#87948b]"}`}>{item.done ? <Check size={15} /> : <span className="text-[11px]">{index + 1}</span>}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-[14px] font-semibold text-[#35483e]">{item.title}</h2><span className="flex items-center gap-1 text-[10px] text-[#929e96]"><Clock3 size={11} />{item.duration}</span></div><p className="mt-1.5 text-[11px] leading-relaxed text-[#7c8981]">{item.objective}</p></div></div>
        <div className="mt-4 rounded-xl bg-[#f7f9f6] p-3.5"><div className="text-[10px] font-semibold uppercase tracking-[.08em] text-[#7b897e]">Practice project</div><p className="mt-1.5 text-[11px] leading-relaxed text-[#69786e]">{item.project}</p></div>
        <div className="mt-4"><div className="mb-2 text-[11px] font-semibold text-[#53645a]">Learning steps</div><div className="space-y-1">{item.steps.map((step, stepIndex) => <button key={`${step.title}-${stepIndex}`} onClick={() => onToggleStep(index, stepIndex)} className="flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-[#fafbfa]"><span className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded border ${step.done ? "border-[#8aaa91] bg-[#eaf3ec] text-[#598169]" : "border-[#dfe6e0] text-transparent"}`}><Check size={11} /></span><span className={`text-[11px] leading-relaxed ${step.done ? "text-[#8a958e] line-through" : "text-[#65736a]"}`}>{step.title}</span></button>)}</div></div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#eff2ef] pt-3"><a href={item.resources[0]?.url || "https://developer.mozilla.org/"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#58806b] hover:underline">{item.resources[0]?.label || "Learning resource"}<ExternalLink size={11} /></a><button onClick={() => onToggle(index)} className="rounded-lg border border-[#e2e9e3] px-3 py-1.5 text-[10px] font-medium text-[#62796a] hover:bg-[#f5f8f5]">{item.done ? "Reopen steps" : "Mark all complete"}</button></div>
      </article>)}
      {!report.roadmap.length && <div className="rounded-2xl border border-[#e8eeea] bg-white p-5"><p className="text-[12px] text-[#839087]">{hasAnalysis ? "No learning steps were suggested for the skills found in this analysis." : "Upload a PDF resume to build a learning plan around your target role."}</p>{!hasAnalysis && <button onClick={onUpload} className="mt-4 rounded-lg bg-[#397765] px-3.5 py-2.5 text-[11px] font-semibold text-white hover:bg-[#2e6958]"><Upload size={13} className="mr-1.5 inline" />Upload resume</button>}<button onClick={() => onNavigate("My skills")} className="ml-2 mt-4 rounded-lg border border-[#dfe7e1] px-3.5 py-2.5 text-[11px] font-semibold text-[#557562] hover:bg-[#f5f8f5]">Explore role skills</button></div>}</section>
      <div className="space-y-5"><article className="rounded-2xl border border-[#e8eeea] bg-white p-5 md:p-6"><div className="flex items-center gap-2 text-[13px] font-semibold"><span className="grid size-7 place-items-center rounded-lg bg-[#f7f2e8] text-[#9d8753]"><Sparkles size={15} /></span>Your starting point</div><p className="mt-4 text-[12px] leading-[1.8] text-[#728077]">{report.summary}</p><div className="mt-4 flex items-center gap-2 border-t border-[#f0f2f0] pt-3 text-[10px] text-[#9aa39e]"><LockKeyhole size={12} />{report.source?.includes("Gemini") ? "Gemini suggestions Â· check resources before enrolling" : "General suggestions for practice"}</div></article><article className="rounded-2xl border border-[#e8eeea] bg-[#f6f8f3] p-5 md:p-6"><div className="flex items-center gap-2 text-[13px] font-semibold"><CircleHelp size={16} className="text-[#73896f]" />Make this plan work for you</div><ul className="mt-3 space-y-2.5 text-[11px] leading-relaxed text-[#788579]"><li>â€¢ Set aside a little time each week, even 20 minutes.</li><li>â€¢ Try building something small with each new skill.</li><li>â€¢ Mark steps complete when you feel comfortable, not just when a video ends.</li></ul></article></div></div>
  </>;
}

function PMKVYPage({ report, hasAnalysis }: { report: Report; hasAnalysis: boolean }) {
  const [location, setLocation] = useState("");
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState("");
  const officialHub = pmkvySources.skillIndia;
  const coursesUrl = pmkvySources.courses;
  const schemePage = pmkvySources.guidelines;
  const roleName = report.targetRole;
  const recommendations = hasAnalysis ? getPMKVYRecommendations(roleName, report.missingSkills) : [];
  return <><PageHeading eyebrow="TRAINING & SCHEME INFORMATION" title="Connect your next step to PMKVY." subtitle="Explore training routes related to your target role, then confirm current courses and centres on the official portal." />
    <div className="mt-6 rounded-2xl border border-[#dfe9e1] bg-[#f0f6f1] p-5 md:p-6"><div className="flex flex-wrap items-start gap-4"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-[#58816d]"><GraduationCap size={19} /></div><div className="min-w-[220px] flex-1"><div className="text-[13px] font-semibold">A starting point for {roleName}</div><p className="mt-1 text-[11px] leading-relaxed text-[#728278]">SkillPath maps your possible missing skills to PMKVY training routes and relevant SIDH search areas. Suggestions are not confirmation of an active course, batch, or eligibility.</p><p className="mt-2 text-[10px] leading-relaxed text-[#7d8b81]">{!hasAnalysis ? "Upload a resume to get skill suggestions for your selected role." : report.missingSkills.length ? <>Your resume scan did not detect: <strong>{report.missingSkills.slice(0, 5).join(", ")}</strong>. Use these as learning prompts and check the exact job-role curriculum.</> : "No role-skill keywords were flagged as missing in this scan. Review the official catalogue for the exact role and course."}</p></div><a href={coursesUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2.5 text-[10px] font-semibold text-[#527863] hover:bg-[#f8faf8]">Explore SIDH courses <ExternalLink size={12} /></a></div></div>
    {!hasAnalysis && <div className="mt-5 rounded-2xl border border-dashed border-[#dce5de] bg-white p-5 text-[12px] text-[#7d8982]">Upload a resume to see PMKVY training-route suggestions matched to possible skill gaps.</div>}
    {hasAnalysis && recommendations.length > 0 && <section className="mt-5 rounded-2xl border border-[#e8eeea] bg-white p-5 md:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-[13px] font-semibold">Training routes for your possible skill gaps</div><p className="mt-1 text-[11px] text-[#89958e]">Matched to {roleName} using your resume analysis. These are programme routes and search areas, not confirmed open courses.</p></div><a href={schemePage} target="_blank" rel="noreferrer" className="text-[10px] font-semibold text-[#58806b] hover:underline">Official PMKVY 4.0 guidelines <ExternalLink size={11} className="ml-1 inline" /></a></div><div className="mt-4 grid gap-3 md:grid-cols-2">{recommendations.map((item) => <article key={`${item.occupation}-${item.skill}`} className="rounded-xl border border-[#edf0ee] bg-[#fcfdfc] p-4"><div className="flex items-center justify-between gap-2"><span className="rounded-full bg-[#f0f5f1] px-2.5 py-1 text-[9px] font-semibold text-[#60806b]">Possible gap: {item.skill}</span><span className="text-[9px] text-[#929d96]">{item.occupation}</span></div><h3 className="mt-3 text-[12px] font-semibold text-[#435249]">{item.program}</h3><p className="mt-1 text-[10px] text-[#75827a]">Look for: {item.area}</p><p className="mt-2 text-[10px] leading-relaxed text-[#87938c]">{item.eligibleFor}. Check the actual job role, course content, eligibility, fees, and active batch on the official portal.</p><a href={coursesUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-[#58806b] hover:underline">Search official SIDH courses <ExternalLink size={11} /></a></article>)}</div><p className="mt-4 border-t border-[#edf0ee] pt-3 text-[9px] leading-relaxed text-[#99a39d]">Mapping basis: PMKVY 4.0 Short-Term Training supports NSQF-aligned skill courses; the skill-to-search-area mapping is SkillPath guidance, not an official PMKVY occupational qualification. Source checked {pmkvyProgramNotes.verifiedOn}.</p></section>}
    {hasAnalysis && recommendations.length === 0 && <div className="mt-5 rounded-2xl border border-[#e8eeea] bg-white p-5 text-[12px] text-[#7d8982]">No possible gaps were found for this target role, so there are no personalized training-route suggestions to show.</div>}
    <div className="mt-5 grid gap-4 lg:grid-cols-3"><SchemeCard title="Short-Term Training (STT)" tag="Build or upgrade skills" body={pmkvyProgramNotes.shortTermTraining} fit="Current course, location, and eligibility details must be confirmed on the official portal." /><SchemeCard title="Recognition of Prior Learning (RPL)" tag="Prior experience" body={pmkvyProgramNotes.recognitionPriorLearning} fit="RPL is not an automatic match for an undetected resume skill; the learner must meet the role assessment criteria." /><SchemeCard title="Special Projects" tag="Specific groups / needs" body={pmkvyProgramNotes.specialProjects} fit="Check the current official scheme notice for project availability and eligibility." /></div>
    <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_.9fr]"><article className="rounded-2xl border border-[#e8eeea] bg-white p-5 md:p-6"><div className="flex items-center gap-2 text-[13px] font-semibold"><MapPin size={16} className="text-[#64836f]" />Find a training centre</div><p className="mt-1 text-[11px] leading-relaxed text-[#89958e]">Use the official Skill India Digital Hub to check currently listed centres, courses, and batches near you.</p><label htmlFor="city" className="mt-4 block text-[10px] font-medium text-[#718078]">Your city or district</label><div className="mt-1.5 flex gap-2"><input id="city" value={location} onChange={(e) => { setLocation(e.target.value); setSearched(false); setSearchError(""); }} placeholder="e.g. Jaipur, Rajasthan" className="min-w-0 flex-1 rounded-xl border border-[#e4eae5] px-3 py-2.5 text-[12px] outline-none focus:border-[#8cac99]" /><a href={officialHub} target="_blank" rel="noreferrer" onClick={(event) => { if (!location.trim()) { event.preventDefault(); setSearchError("Enter your city or district first."); return; } setSearchError(""); setSearched(true); }} className="flex shrink-0 items-center gap-2 rounded-xl bg-[#397765] px-3.5 py-2.5 text-[11px] font-semibold text-white hover:bg-[#2e6958]">Open official hub <ExternalLink size={13} /></a></div>{searchError && <p role="alert" className="mt-2 text-[11px] text-[#a25440]">{searchError}</p>}<div className="mt-3 rounded-xl bg-[#f7f9f7] p-3 text-[10px] leading-relaxed text-[#859189]">{searched && location.trim() ? `Search for ?${location.trim()}? after the official hub opens, then confirm course, batch dates, eligibility, and any fees directly.` : "This student prototype does not mirror live centre or batch listings. The official hub has the latest information."}</div></article>
      <article className="rounded-2xl border border-[#e8eeea] bg-white p-5 md:p-6"><div className="text-[13px] font-semibold">Before you enrol</div><ul className="mt-3 space-y-2.5 text-[11px] leading-relaxed text-[#77847c]"><li className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#72957a]" />Check the exact job role and course curriculum.</li><li className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#72957a]" />Confirm the centre and active batch on the official portal.</li><li className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#72957a]" />Review the published eligibility criteria before applying.</li></ul><div className="mt-4 border-t border-[#edf0ee] pt-3 text-[10px] leading-relaxed text-[#929c96]">PMKVY details are subject to current Ministry guidance. SkillPath is an independent student project, not a government portal.</div><a href={schemePage} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#58806b]">Official PMKVY 4.0 scheme details <ExternalLink size={12} /></a></article></div>
  </>;
}

function SchemeCard({ title, tag, body, fit }: { title: string; tag: string; body: string; fit: string }) {
  return <article className="rounded-2xl border border-[#e8eeea] bg-white p-5"><div className="flex items-start justify-between gap-2"><div className="grid size-8 place-items-center rounded-lg bg-[#f0f5f1] text-[#64836f]"><GraduationCap size={16} /></div><span className="rounded-full bg-[#f5f6f2] px-2 py-1 text-[9px] text-[#7f897c]">{tag}</span></div><h2 className="mt-3 text-[13px] font-semibold">{title}</h2><p className="mt-2 text-[11px] leading-[1.65] text-[#78857d]">{body}</p><div className="mt-3 border-t border-[#eff2ef] pt-3 text-[10px] leading-relaxed text-[#70816f]">{fit}</div></article>;
}

function PageHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return <div><div className="text-[10px] font-semibold tracking-[.15em] text-[#819188]">{eyebrow}</div><h1 className="mt-2 text-[27px] font-semibold tracking-[-.04em] md:text-[31px]">{title}</h1><p className="mt-1.5 text-[13px] text-[#7c8882]">{subtitle}</p></div>;
}

