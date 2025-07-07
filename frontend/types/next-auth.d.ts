import NextAuth, { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    access?: string;
    refresh?: string;
    user: {
      id: number;
      email?: string | null;
      username?: string | null;
      image?: string | null;
      hasMasterPermission?: boolean;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    access?: string;
    refresh?: string;
    username?: string;
    has_master_permission?: boolean;
  }
}

// JWT型の拡張
declare module "next-auth/jwt" {
  interface JWT {
    access?: string;
    refresh?: string;
    username?: string;
    email?: string | null;
  }
}
