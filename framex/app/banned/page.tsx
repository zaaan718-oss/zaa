import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { getUserById } from "@/lib/db";
import BannedClient from "@/components/BannedClient";

export default async function BannedPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const dbUser = getUserById(session.user.id);
  if (!dbUser?.banned) {
    redirect("/");
  }

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <BannedClient
      username={dbUser.username}
      banReason={dbUser.banReason || "Tidak ada alasan spesifik yang dicantumkan."}
      appealStatus={dbUser.appealStatus}
      appealText={dbUser.appealText}
      signOutAction={signOutAction}
    />
  );
}
