import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getUserByUsername } from "@/lib/db";
import PublicProfileClient from "@/components/PublicProfileClient";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const session = await auth();
  const user = getUserByUsername(username);

  if (!user) notFound();

  const isMe = session?.user?.username === user.username;

  return (
    <PublicProfileClient
      username={user.username}
      name={user.name}
      bio={user.bio}
      avatar={user.avatar}
      plan={user.plan}
      role={user.role}
      createdAt={user.createdAt}
      isMe={isMe}
      privateAccount={!!user.privateAccount}
    />
  );
}
