"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate, formatNaira } from "@/lib/utils";
import {
  MessageCircle,
  Send,
  ArrowLeft,
  Search,
  ShieldCheck,
  Package,
  Lock,
  ArrowRight,
} from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Derived shape — built client-side from the conversations + profiles + messages
// rows. The DB has buyer_id/seller_id (not participant_a/b) and no unread_count
// column; we compute "other_user" from whichever side isn't the current user,
// and unread_count from messages where is_read=false and sender_id != me.
type Conversation = {
  id: string;
  updated_at: string;
  order_id: string | null;
  other_user: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
  };
  last_message: {
    content: string;
    created_at: string;
    sender_id: string;
  } | null;
  unread_count: number;
  // Optional snapshot of the related order so the thread header can show
  // "Re: Order #WNP-XYZ · ₦12,500" without a second fetch per conversation.
  order_summary: {
    id: string;
    order_number: string;
    total: number;
    status: string;
  } | null;
};

// Raw shape returned by the conversations select. We DON'T inline the
// buyer/seller profile joins anymore because RLS on profiles blocks any
// user from reading another user's row, which made the join silently
// return null and broke the "other user" name in the UI. Instead we
// fetch the conversation rows here and then look up names from the
// public_profiles view (migration 012) in a second pass.
type ConversationRow = {
  id: string;
  updated_at: string;
  order_id: string | null;
  buyer_id: string;
  seller_id: string;
  messages: { content: string; created_at: string; sender_id: string; is_read: boolean }[];
  order?: { id: string; order_number: string; total: number; status: string } | null;
};

type PublicProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
};

type Message = {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  conversation_id: string;
};

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showList, setShowList] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const searchParams = useSearchParams();
  const initialConvId = searchParams.get("conv");

  useEffect(() => {
    initPage();
    return () => {
      channelRef.current?.unsubscribe();
    };
  }, []);

  // After conversations load, if ?conv= was passed (from "Contact seller"),
  // auto-select that conversation and open the thread pane.
  useEffect(() => {
    if (!initialConvId || conversations.length === 0) return;
    const match = conversations.find((c) => c.id === initialConvId);
    if (match && (!selectedConv || selectedConv.id !== match.id)) {
      setSelectedConv(match);
      setShowList(false);
    }
  }, [initialConvId, conversations, selectedConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function initPage() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);
    await fetchConversations(user.id);
    setLoading(false);
  }

  async function fetchConversations(userId: string) {
    const supabase = createClient();

    const { data } = await supabase
      .from("conversations")
      .select(
        `id, updated_at, order_id, buyer_id, seller_id,
         messages(content, created_at, sender_id, is_read),
         order:orders(id, order_number, total, status)`
      )
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order("updated_at", { ascending: false });

    const rows = (data as unknown as ConversationRow[]) || [];

    // Collect every "other side" user id and fetch their public profile
    // in one go from the public_profiles view (migration 012). The view
    // bypasses the strict profiles RLS so we get the display name +
    // avatar without leaking email/phone.
    const otherIds = Array.from(
      new Set(
        rows.map((r) => (r.buyer_id === userId ? r.seller_id : r.buyer_id))
      )
    );

    let profilesById: Record<string, PublicProfile> = {};
    if (otherIds.length > 0) {
      const { data: profiles } = await supabase
        .from("public_profiles")
        .select("id, full_name, avatar_url, role")
        .in("id", otherIds);

      profilesById = Object.fromEntries(
        ((profiles as PublicProfile[]) ?? []).map((p) => [p.id, p])
      );
    }

    const shaped: Conversation[] = rows.map((row) => {
      const otherId = row.buyer_id === userId ? row.seller_id : row.buyer_id;
      const other = profilesById[otherId];
      const msgs = [...(row.messages || [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const last = msgs[0] || null;
      const unread = msgs.filter((m) => !m.is_read && m.sender_id !== userId).length;
      const orderSummary = row.order
        ? Array.isArray(row.order)
          ? row.order[0] ?? null
          : row.order
        : null;
      return {
        id: row.id,
        updated_at: row.updated_at,
        order_id: row.order_id,
        other_user: other
          ? {
              id: other.id,
              full_name: other.full_name ?? "Winipat user",
              avatar_url: other.avatar_url,
              role: other.role ?? "",
            }
          : {
              id: otherId,
              full_name: "Winipat user",
              avatar_url: null,
              role: "",
            },
        last_message: last
          ? { content: last.content, created_at: last.created_at, sender_id: last.sender_id }
          : null,
        unread_count: unread,
        order_summary: orderSummary,
      };
    });

    setConversations(shaped);
  }

  // Mark unread incoming messages as read whenever the buyer opens a
  // conversation. Without this, the unread badge sticks around forever
  // even after the message has clearly been read.
  const markConversationRead = useCallback(
    async (convId: string, userId: string) => {
      const supabase = createClient();
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("conversation_id", convId)
        .eq("is_read", false)
        .neq("sender_id", userId);

      // Optimistically clear the badge in local state too — no need to
      // re-fetch the whole conversation list.
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId ? { ...c, unread_count: 0 } : c
        )
      );
    },
    []
  );

  const fetchMessages = useCallback(
    async (convId: string) => {
      const supabase = createClient();
      const { data } = await supabase
        .from("messages")
        .select("id, content, created_at, sender_id, conversation_id")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });

      setMessages((data as unknown as Message[]) || []);

      // Subscribe to realtime
      channelRef.current?.unsubscribe();
      const channel = supabase
        .channel(`messages:${convId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${convId}`,
          },
          (payload) => {
            setMessages((prev) => [...prev, payload.new as Message]);
          }
        )
        .subscribe();
      channelRef.current = channel;
    },
    []
  );

  useEffect(() => {
    if (selectedConv) {
      fetchMessages(selectedConv.id);
      if (currentUserId && selectedConv.unread_count > 0) {
        markConversationRead(selectedConv.id, currentUserId);
      }
    }
  }, [selectedConv, fetchMessages, currentUserId, markConversationRead]);

  async function sendMessage() {
    if (!newMessage.trim() || !selectedConv || !currentUserId) return;
    setSending(true);

    const supabase = createClient();
    const content = newMessage.trim();
    setNewMessage("");

    await supabase.from("messages").insert({
      conversation_id: selectedConv.id,
      sender_id: currentUserId,
      content,
    });

    setSending(false);
  }

  const filteredConversations = conversations.filter((c) =>
    c.other_user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConv(conv);
    setShowList(false);
  };

  return (
    <div className="flex h-[calc(100dvh-10rem)] overflow-hidden rounded-[--radius-lg] border border-mist bg-white shadow-sm">
      {/* Conversation list */}
      <div
        className={`flex flex-col border-r border-mist ${
          showList ? "flex" : "hidden"
        } w-full md:flex md:w-80 lg:w-96 flex-shrink-0`}
      >
        <div className="border-b border-mist p-4">
          <h2 className="font-[family-name:var(--font-sora)] text-lg font-bold text-midnight mb-3">
            Messages
          </h2>
          <Input
            placeholder="Search conversations…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search size={16} />}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-1 p-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-[--radius-md] p-3 animate-pulse"
                >
                  <div className="h-10 w-10 rounded-full bg-mist flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-mist rounded-full w-3/4" />
                    <div className="h-3 bg-mist rounded-full w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-violet/10 text-violet mb-3">
                <MessageCircle size={20} aria-hidden="true" />
              </div>
              <p className="text-sm font-bold text-midnight">No conversations yet</p>
              <p className="mt-1 text-xs text-slate-light max-w-[220px]">
                Tap <strong className="text-midnight">Message</strong> on any product page to start a conversation with that seller.
              </p>
              <Link
                href="/dashboard/browse"
                className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-violet hover:underline"
              >
                Browse products
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <div className="space-y-0.5 p-2">
              {filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv)}
                  className={`w-full flex items-center gap-3 rounded-[--radius-md] p-3 text-left transition-colors duration-150 ${
                    selectedConv?.id === conv.id
                      ? "bg-royal/5 border border-royal/20"
                      : "hover:bg-cloud"
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar
                      src={conv.other_user?.avatar_url}
                      name={conv.other_user?.full_name || "User"}
                      size="md"
                    />
                    {conv.unread_count > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-royal text-[10px] font-bold text-white">
                        {conv.unread_count > 9 ? "9+" : conv.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-midnight truncate">
                        {conv.other_user?.full_name}
                      </p>
                      {conv.last_message && (
                        <span className="text-[10px] text-slate-lighter flex-shrink-0 ml-1">
                          {new Date(conv.last_message.created_at).toLocaleTimeString(
                            "en-NG",
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-light truncate">
                      {conv.last_message?.content || "No messages yet"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Message thread */}
      <div
        className={`flex-1 flex-col ${
          !showList ? "flex" : "hidden"
        } md:flex`}
      >
        {!selectedConv ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center p-8">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet/15 to-teal/15">
              <MessageCircle size={26} className="text-violet" aria-hidden="true" />
            </div>
            <h3 className="font-[family-name:var(--font-sora)] text-lg font-bold text-midnight">
              Pick a conversation
            </h3>
            <p className="mt-1 text-sm text-slate-light max-w-sm">
              {conversations.length === 0
                ? "When you message a seller from a product page, the thread shows up here."
                : "Choose a conversation from the list to open the thread."}
            </p>

            {/* Tiny trust strip — same promises as the rest of the buyer
                portal, but reframed for the messaging context. */}
            <ul className="mt-6 grid grid-cols-1 gap-2 max-w-xs text-left text-xs text-slate-light">
              <li className="flex items-start gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-dark shrink-0 mt-0.5" aria-hidden="true" />
                Messages are with KYC-verified sellers only.
              </li>
              <li className="flex items-start gap-2">
                <Lock className="h-3.5 w-3.5 text-violet shrink-0 mt-0.5" aria-hidden="true" />
                Never share payment info here — pay through Winipat checkout so escrow protects you.
              </li>
            </ul>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="border-b border-mist">
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => setShowList(true)}
                  className="md:hidden text-slate hover:text-royal transition-colors mr-1"
                >
                  <ArrowLeft size={18} />
                </button>
                <Avatar
                  src={selectedConv.other_user?.avatar_url}
                  name={selectedConv.other_user?.full_name || "User"}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-midnight truncate">
                    {selectedConv.other_user?.full_name}
                  </p>
                  <p className="text-xs text-slate-light capitalize">
                    {selectedConv.other_user?.role}
                  </p>
                </div>
              </div>

              {/* Order context strip — only shown when the conversation is
                  attached to a specific order (via the "Contact seller"
                  flow on the order page). Gives the thread a clear
                  subject so older conversations are not just disembodied. */}
              {selectedConv.order_summary && (
                <Link
                  href={`/dashboard/orders/${selectedConv.order_summary.id}`}
                  className="flex items-center gap-2.5 px-4 py-2 bg-violet/5 border-t border-violet/15 hover:bg-violet/8 transition-colors"
                >
                  <span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white text-violet">
                    <Package className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] uppercase tracking-wider font-bold text-violet">
                      About this order
                    </p>
                    <p className="text-xs text-midnight font-semibold truncate">
                      {selectedConv.order_summary.order_number} ·{" "}
                      {formatNaira(selectedConv.order_summary.total / 100)}
                    </p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-violet shrink-0" aria-hidden="true" />
                </Link>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-slate-light">
                    No messages yet. Say hello!
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwn = msg.sender_id === currentUserId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-xs rounded-[--radius-lg] px-4 py-2.5 lg:max-w-md ${
                          isOwn
                            ? "bg-royal text-white rounded-br-sm"
                            : "bg-cloud border border-mist text-slate rounded-bl-sm"
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                        <p
                          className={`mt-1 text-[10px] ${
                            isOwn ? "text-white/60" : "text-slate-lighter"
                          }`}
                        >
                          {new Date(msg.created_at).toLocaleTimeString("en-NG", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-mist p-3">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Type a message…"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  loading={sending}
                  className="flex-shrink-0"
                >
                  <Send size={16} />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
