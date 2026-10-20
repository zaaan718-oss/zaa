import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      plan: "free" | "pro" | "max";
      role: "user" | "developer" | "admin";
      banned: boolean;
      onboarded: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    username?: string;
    plan?: string;
    role?: string;
    banned?: boolean;
    onboarded?: boolean;
  }
}
