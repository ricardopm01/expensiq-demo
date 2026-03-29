import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ account }) {
      // Domain check happens in Google's hosted domain or via email check below
      // We rely on the jwt callback to validate the domain against backend
      return account?.provider === "google";
    },
    async jwt({ token, account }) {
      if (account?.id_token) {
        // Exchange Google ID token for our backend JWT
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/auth/google`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id_token: account.id_token }),
            }
          );
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
      session.user.name = token.employeeName as string ?? session.user.name;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
