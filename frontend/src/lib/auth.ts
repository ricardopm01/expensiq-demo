import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === "true";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    ...(DEV_MODE ? [
      Credentials({
        credentials: { email: {}, role: {} },
        async authorize(credentials) {
          const res = await fetch(`${API_URL}/api/v1/auth/dev-login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: credentials.email, role: credentials.role }),
          });
          if (!res.ok) return null;
          const data = await res.json();
          return { id: data.employee_id, name: data.name, email: data.email, backendToken: data.access_token, role: data.role };
        },
      }),
    ] : [
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
    ]),
  ],
  callbacks: {
    async signIn({ account }) {
      return account?.provider === "google" || account?.provider === "credentials";
    },
    async jwt({ token, account, user }) {
      // Credentials provider — token already in user object
      if (account?.provider === "credentials" && user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.backendToken = (user as any).backendToken;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.role = (user as any).role;
        token.employeeId = user.id;
        token.employeeName = user.name;
        return token;
      }
      // Google provider — exchange Google ID token for backend JWT
      if (account?.id_token) {
        try {
          const res = await fetch(`${API_URL}/api/v1/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_token: account.id_token }),
          });
          if (res.ok) {
            const data = await res.json();
            token.backendToken = data.access_token;
            token.role = data.role;
            token.employeeId = data.employee_id;
            token.employeeName = data.name;
          }
        } catch (e) {
          console.error("Backend auth failed", e);
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.backendToken = token.backendToken as string;
      session.user.role = token.role as string;
      session.user.employeeId = token.employeeId as string;
      session.user.name = (token.employeeName as string) ?? session.user.name;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET || "dev-secret-change-in-production",
});
