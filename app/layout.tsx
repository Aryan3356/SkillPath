import type { Metadata } from "next";
// @ts-ignore Next.js handles global CSS imports at build time.
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "SkillPath — Your career, mapped",
  description: "A student-friendly PMKVY skill gap analyzer and learning roadmap.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><Providers>{children}</Providers></body></html>;
}
