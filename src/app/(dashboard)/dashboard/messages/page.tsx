"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import {
  MessageCircle,
  Send,
  ArrowLeft,
  Search,
} from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";

type Conversation = {
  id: string;
  updated_at: string;
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

  useEffect(() => {
    initPage();
    return () => {
      channelRef.current?.unsubscribe();
    };
  }, []);

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
        `id, updated_at, unread_count,
         other_user:profiles!other_user_id(id, full_name, avatar_url, role),
         last_message:messages(content, created_at, sender_id)`
      )
      .or(`participant_a.eq.${userId},participant_b.eq.${userId}`)
      .order("updated_at", { ascending: false });

    setConversations((data as unknown as Conversation[]) || []);
  }

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
    }
  }, [selectedConv, fetchMessages]);

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
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <MessageCircle size={36} className="mb-3 text-mist-dark" />
              <p className="text-sm font-medium text-midnight">No conversations yet</p>
              <p className="mt-1 text-xs text-slate-light">
                Start a conversation with a seller
              </p>
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
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-royal/10">
              <MessageCircle size={28} className="text-royal" />
            </div>
            <h3 className="font-[family-name:var(--font-sora)] text-lg font-semibold text-midnight">
              Select a conversation
            </h3>
            <p className="mt-1 text-sm text-slate-light">
              Choose a conversation from the list to start messaging
            </p>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="flex items-center gap-3 border-b border-mist px-4 py-3">
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
              <div>
                <p className="font-semibold text-midnight">
                  {selectedConv.other_user?.full_name}
                </p>
                <p className="text-xs text-slate-light capitalize">
                  {selectedConv.other_user?.role}
                </p>
              </div>
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
