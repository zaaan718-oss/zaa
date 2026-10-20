import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// File ini SENGAJA gak menyentuh database (better-sqlite3 gak jalan di Edge runtime,
// tempat middleware.ts dieksekusi). Logic yang butuh DB (plan, username, banned)
// ada di auth.ts, dipakai oleh API routes & Server Components (Node runtime).
export default {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig;
