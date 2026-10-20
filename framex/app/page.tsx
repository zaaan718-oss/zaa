import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { getUserById } from "@/lib/db";
import DashboardClient from "@/components/DashboardClient";

export default async function Home() {
  const session = await auth();
  let dbUser = null;

  if (session?.user?.id) {
    // Cek langsung ke database (bukan dari token session yang bisa basi) -
    // supaya begitu onboarding/role/plan/status ban berubah, halaman ini
    // langsung tahu tanpa perlu logout-login ulang.
    dbUser = getUserById(session.user.id);
    if (dbUser?.banned) {
      redirect("/banned");
    }
    if (dbUser && !dbUser.onboarded) {
      redirect("/onboarding");
    }
  }

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <DashboardClient
      firstName={session?.user?.name?.split(" ")[0] ?? "kamu"}
      email={session?.user?.email ?? ""}
      username={dbUser?.username ?? ""}
      plan={dbUser?.plan ?? "free"}
      role={dbUser?.role ?? "user"}
      signOutAction={signOutAction}
    />
  );
}
