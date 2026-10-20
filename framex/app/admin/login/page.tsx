import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createAdminToken, verifyAdminCredentials, verifyAdminToken, COOKIE_NAME } from "@/lib/admin-auth";

async function loginAction(formData: FormData) {
  "use server";
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!verifyAdminCredentials(username, password)) {
    redirect("/admin/login?error=1");
  }

  const token = createAdminToken();
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  redirect("/admin");
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const cookieStore = await cookies();
  if (verifyAdminToken(cookieStore.get(COOKIE_NAME)?.value)) {
    redirect("/admin");
  }

  const { error } = await searchParams;

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-yellow-500/20 bg-zinc-900/80 p-8">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold mb-1">
          FrameX <span className="text-yellow-400">Admin</span>
        </h1>
        <p className="text-sm text-zinc-500 mb-6">Halaman internal, bukan untuk publik.</p>

        <form action={loginAction} className="flex flex-col gap-3">
          <input
            name="username"
            placeholder="Username"
            required
            className="rounded-lg border border-zinc-700 bg-black/50 px-3.5 py-2.5 text-sm outline-none focus:border-yellow-400/60"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            required
            className="rounded-lg border border-zinc-700 bg-black/50 px-3.5 py-2.5 text-sm outline-none focus:border-yellow-400/60"
          />
          {error && <p className="text-xs text-red-400">Username atau password salah.</p>}
          <button
            type="submit"
            className="mt-2 rounded-lg bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-black hover:bg-yellow-300 transition"
          >
            Masuk
          </button>
        </form>
      </div>
    </main>
  );
}
