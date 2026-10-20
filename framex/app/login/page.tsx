import { signIn } from "@/auth";
import LoginCard from "@/components/LoginCard";

export default function LoginPage() {
  async function signInAction() {
    "use server";
    await signIn("google", { redirectTo: "/" });
  }

  return <LoginCard signInAction={signInAction} />;
}
