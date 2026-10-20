"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquare, ShieldCheck } from "lucide-react";

interface ConversationRow {
  username: string;
  name: string;
  avatar: string;
  lastMessage: string;
  lastAt: number;
  unread: number;
  pendingRequest: boolean;
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "baru saja";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}j`;
  return `${Math.floor(hr / 24)}h`;
}

export default function DmInboxPage() {
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dm")
      .then((r) => r.json())
      .then((data) => {
        const list: ConversationRow[] = data.conversations ?? [];
        // Permintaan izin yang nunggu persetujuan selalu di atas, biar gak
        // ketimbun percakapan lain yang baru keisi pesan.
        list.sort((a, b) => {
          if (a.pendingRequest !== b.pendingRequest) return a.pendingRequest ? -1 : 1;
          return b.lastAt - a.lastAt;
        });
        setConversations(list);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen text-white px-6 @lg:px-10 py-10">
      <div className="max-w-lg mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-yellow-400 transition mb-8"
        >
          <ArrowLeft size={15} />
          Kembali
        </Link>

        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold mb-8">
          Pesan <span className="text-yellow-400">Pribadi</span>
        </h1>

        {loading ? (
          <p className="text-sm text-zinc-600">Memuat...</p>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center text-center py-16 text-zinc-600">
            <MessageSquare size={28} className="mb-3" />
            <p className="text-sm">Belum ada percakapan.</p>
            <p className="text-xs mt-1">Klik username seseorang di chat global buat mulai DM.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {conversations.map((c) => (
              <Link
                key={c.username}
                href={`/dm/${c.username}`}
                className="flex items-center gap-3 rounded-xl border border-yellow-500/20 bg-zinc-900/60 p-3.5 hover:border-yellow-400/60 transition"
              >
                {c.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.avatar} alt="" className="h-11 w-11 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="h-11 w-11 rounded-full bg-zinc-800 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    {c.lastAt > 0 && (
                      <span className="text-[10px] text-zinc-600 shrink-0">{timeAgo(c.lastAt)}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    {c.pendingRequest ? (
                      <p className="text-xs truncate text-yellow-400 font-medium flex items-center gap-1">
                        <ShieldCheck size={12} className="shrink-0" />
                        Minta izin chat pribadi
                      </p>
                    ) : (
                      <p
                        className={`text-xs truncate ${
                          c.unread > 0 ? "text-zinc-200 font-medium" : "text-zinc-500"
                        }`}
                      >
                        {c.lastMessage}
                      </p>
                    )}
                    {c.pendingRequest ? (
                      <span className="shrink-0 h-2 w-2 rounded-full bg-yellow-400" />
                    ) : (
                      c.unread > 0 && (
                        <span className="shrink-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-yellow-400 px-1.5 text-[10px] font-bold text-black">
                          {c.unread > 9 ? "9+" : c.unread}
                        </span>
                      )
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
