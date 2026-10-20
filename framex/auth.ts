import NextAuth from "next-auth";
import authConfig from "./auth.config";
import { upsertUserFromGoogle, getUserByGoogleId } from "@/lib/db";
import { writeBackupSnapshot } from "@/lib/backup";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    async signIn({ user, account }) {
      if (!account || account.provider !== "google" || !account.providerAccountId) {
        return true;
      }

      upsertUserFromGoogle({
        googleId: account.providerAccountId,
        email: user.email ?? "",
        name: user.name ?? "Pengguna",
        avatar: user.image ?? "",
      });

      writeBackupSnapshot(); // gabungin semua data jadi 1 file tiap ada yang login

      // User yang di-ban TETAP dibiarkan login (dapat session) - biar mereka
      // bisa diarahkan ke halaman /banned yang nunjukin alasan & form banding,
      // bukan ditolak login begitu aja tanpa penjelasan.
      return true;
    },

    async jwt({ token, account }) {
      const googleId = account?.providerAccountId ?? token.sub;
      if (googleId) {
        const dbUser = getUserByGoogleId(googleId);
        if (dbUser) {
          token.uid = dbUser.id;
          token.username = dbUser.username;
          token.plan = dbUser.plan;
          token.role = dbUser.role;
          token.banned = !!dbUser.banned;
          token.onboarded = !!dbUser.onboarded;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? "";
        session.user.username = (token.username as string) ?? "";
        session.user.plan = (token.plan as "free" | "pro" | "max") ?? "free";
        session.user.role = (token.role as "user" | "developer" | "admin") ?? "user";
        session.user.banned = !!token.banned;
        session.user.onboarded = !!token.onboarded;
      }
      return session;
    },
  },
});
