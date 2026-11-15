import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & { id: string; college?: string; studyYear?: string };
  }

  interface User {
    college?: string;
    studyYear?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    college?: string;
    studyYear?: string;
  }
}
