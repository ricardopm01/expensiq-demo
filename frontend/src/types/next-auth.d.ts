import "next-auth";

declare module "next-auth" {
  interface Session {
    backendToken: string;
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
      employeeId: string;
    };
  }
}
