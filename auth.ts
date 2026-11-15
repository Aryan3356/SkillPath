import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { getMongoClientPromise, getMongoDatabaseName } from "@/lib/mongodb";
import { verifyPassword } from "@/lib/password";

const googleProvider = process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
  ? Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET })
  : null;
const demoSecret = "skillpath-demo-only-secret-change-before-enabling-auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET || (!process.env.MONGODB_URI || process.env.NODE_ENV === "development" ? demoSecret : undefined),
  adapter: process.env.MONGODB_URI ? MongoDBAdapter(getMongoClientPromise()) : undefined,
  providers: [
    Credentials({
      id: "credentials",
      name: "Email and password",
      credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
      async authorize(credentials) {
        if (!process.env.MONGODB_URI || typeof credentials.email !== "string" || typeof credentials.password !== "string") return null;
        try {
          const client = await getMongoClientPromise();
          const database = getMongoDatabaseName();
          const user = await client.db(database).collection("users").findOne<{ _id: { toString(): string }; name: string; email: string; college?: string; studyYear?: string; passwordHash?: string }>({ email: credentials.email.trim().toLowerCase() });
          if (!user?.passwordHash || !await verifyPassword(credentials.password, user.passwordHash)) return null;
          return { id: user._id.toString(), name: user.name, email: user.email, college: user.college, studyYear: user.studyYear };
        } catch {
          return null;
        }
      },
    }),
    ...(googleProvider ? [googleProvider] : []),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.college = user.college;
        token.studyYear = user.studyYear;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || "";
        session.user.college = typeof token.college === "string" ? token.college : undefined;
        session.user.studyYear = typeof token.studyYear === "string" ? token.studyYear : undefined;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
});
