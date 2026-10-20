import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyAdminToken, COOKIE_NAME } from "@/lib/admin-auth";
import AdminDashboard from "@/components/AdminDashboard";

export default async function AdminPage() {
  const cookieStore = await cookies();
  if (!verifyAdminToken(cookieStore.get(COOKIE_NAME)?.value)) {
    redirect("/admin/login");
  }

  async function logoutAction() {
    "use server";
    const store = await cookies();
    store.delete(COOKIE_NAME);
    redirect("/admin/login");
  }

  return <AdminDashboard logoutAction={logoutAction} />;
}
