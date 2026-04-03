"use client";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { apiFetch, API_BASE_URL } from "@/lib/api";
import { connectSocket } from "@/lib/socket";

type EventRoom = { id: string; name: string };
type Attachment = { id: string; original_name: string; url_path: string };
type Message = {
  id: string;
  message: string;
  time: string;
  mine: boolean;
  is_pinned: boolean;
  parent_message_id: string | null;
  thread_reply_count: number;
  read_by_count: number;
  mentions: string[];
  sender: { name: string } | null;
  attachments: Attachment[];
};

const mentionRegex = /(@[a-zA-Z0-9._-]+)/g;

export default function ChatPage() {
  const [rooms, setRooms] = useState<EventRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadMentions, setUnreadMentions] = useState(0);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [chatMsg, setChatMsg] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");

  const pinnedMessages = useMemo(() => messages.filter((msg) => msg.is_pinned), [messages]);
  const rootMessages = useMemo(() => messages.filter((msg) => !msg.parent_message_id), [messages]);

  const loadRooms = async () => {
    const data = await apiFetch<{ events: EventRoom[] }>("/events");
    setRooms(data.events || []);
    if (!activeRoom && data.events?.length) {
      setActiveRoom(data.events[0].id);
    }
  };

  const loadMessages = async (eventId: string) => {
    const data = await apiFetch<{ messages: Message[] }>(`/events/${eventId}/messages`);
    setMessages(data.messages || []);
    await apiFetch(`/events/${eventId}/messages/read`, { method: "POST", body: JSON.stringify({}) });
  };

  const loadUnreadMentions = async (eventId: string) => {
    const data = await apiFetch<{ unread_count: number }>(`/events/${eventId}/mentions/unread`);
    setUnreadMentions(data.unread_count || 0);
  };

  useEffect(() => {
    void loadRooms().catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!activeRoom) return;
    void loadMessages(activeRoom).catch((err) => setError(err.message));
    void loadUnreadMentions(activeRoom).catch(() => {});

    const socket = connectSocket();
    socket.emit("join_event", { eventId: activeRoom });
    socket.on("message_created", ({ eventId, message }) => {
      if (eventId === activeRoom) {
        setMessages((prev) => [...prev, message]);
      }
    });
    socket.on("message_pinned", ({ eventId, message_id, is_pinned }) => {
      if (eventId === activeRoom) {
        setMessages((prev) => prev.map((msg) => (msg.id === message_id ? { ...msg, is_pinned } : msg)));
      }
    });

    return () => {
      socket.emit("leave_event", { eventId: activeRoom });
      socket.off("message_created");
      socket.off("message_pinned");
    };
  }, [activeRoom]);

  const sendMessage = async () => {
    if (!activeRoom || !chatMsg.trim()) return;
    const payload = await apiFetch<{ chat_message: Message }>(`/events/${activeRoom}/messages`, {
      method: "POST",
      body: JSON.stringify({
        message: chatMsg,
        parent_message_id: replyTo,
      }),
    });
    setMessages((prev) => [...prev, payload.chat_message]);
    if (files.length) {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      await apiFetch(`/events/${activeRoom}/messages/${payload.chat_message.id}/attachments`, {
        method: "POST",
        body: formData,
      });
      await loadMessages(activeRoom);
      setFiles([]);
    }
    setReplyTo(null);
    setChatMsg("");
    await loadUnreadMentions(activeRoom);
  };

  const togglePin = async (messageId: string, pinned: boolean) => {
    if (!activeRoom) return;
    await apiFetch(`/events/${activeRoom}/messages/${messageId}/pin`, {
      method: "PATCH",
      body: JSON.stringify({ pinned }),
    });
  };

  const onPickFiles = (event: ChangeEvent<HTMLInputElement>) => {
    setFiles(event.target.files ? Array.from(event.target.files) : []);
  };

  const renderMessageText = (message: string) =>
    message.split(mentionRegex).map((part, index) =>
      part.startsWith("@") ? (
        <mark key={`${part}-${index}`} style={{ background: "rgba(124,92,252,0.2)", color: "var(--accent)" }}>
          {part}
        </mark>
      ) : (
        <span key={`${part}-${index}`}>{part}</span>
      )
    );

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Room list */}
      <div style={{ width: 240, borderRight: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '16px 16px 10px' }}>
          <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-1)' }}>
            Event Rooms {unreadMentions > 0 ? `(${unreadMentions} mentions)` : ""}
          </p>
        </div>
        {rooms.map(room => (
          <button key={room.id} onClick={() => setActiveRoom(room.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: activeRoom === room.id ? 'rgba(124,92,252,0.1)' : 'transparent', border: 'none', borderLeft: `2px solid ${activeRoom === room.id ? 'var(--accent)' : 'transparent'}`, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: activeRoom === room.id ? 'var(--accent)' : 'var(--text-1)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.name}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-1)', margin: 0 }}>#{rooms.find(r => r.id === activeRoom)?.name || "Select room"}</p>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', margin: 0 }}>4 members · Event coordination chat</p>
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>{pinnedMessages.length} pinned</span>
        </div>

        {error && <p style={{ color: "var(--overdue)", margin: 12 }}>{error}</p>}
        {replyTo && <p style={{ color: "var(--accent)", margin: "8px 20px", fontSize: "0.8rem" }}>Replying in thread · <button onClick={() => setReplyTo(null)} style={{ border: "none", background: "none", color: "var(--text-3)", cursor: "pointer" }}>cancel</button></p>}
        {!!pinnedMessages.length && (
          <div style={{ borderBottom: "1px solid var(--border)", padding: "8px 20px", background: "rgba(124,92,252,0.08)" }}>
            <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--accent)" }}>Pinned: {pinnedMessages[0].message.slice(0, 70)}</p>
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {rootMessages.map((m) => (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.mine ? 'flex-end' : 'flex-start', gap: 3 }}>
              {!m.mine && <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', paddingLeft: 4 }}>{m.sender?.name || "Member"}</span>}
              <div className={`chat-bubble ${m.mine ? 'mine' : 'theirs'}`}>{renderMessageText(m.message)}</div>
              {!!m.attachments.length && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {m.attachments.map((attachment) => (
                    <a key={attachment.id} href={`${API_BASE_URL.replace(/\/api$/, "")}${attachment.url_path}`} target="_blank" rel="noreferrer" style={{ fontSize: "0.72rem", color: "var(--accent)" }}>
                      {attachment.original_name}
                    </a>
                  ))}
                </div>
              )}
              <span style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>
                {m.time} · Seen by {m.read_by_count}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setReplyTo(m.id)} style={{ fontSize: "0.7rem", border: "none", background: "none", color: "var(--text-3)", cursor: "pointer" }}>
                  Reply ({m.thread_reply_count})
                </button>
                <button onClick={() => togglePin(m.id, !m.is_pinned)} style={{ fontSize: "0.7rem", border: "none", background: "none", color: "var(--text-3)", cursor: "pointer" }}>
                  {m.is_pinned ? "Unpin" : "Pin"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          <label style={{ color: "var(--text-3)", cursor: "pointer", fontSize: 18 }}>
            📎
            <input type="file" multiple style={{ display: "none" }} onChange={onPickFiles} />
          </label>
          <input className="input" style={{ flex: 1, borderRadius: 24 }} placeholder="Message this room... use @name to mention" value={chatMsg} onChange={e => setChatMsg(e.target.value)} />
          <button className="btn-primary px-4 py-2 text-sm" style={{ flexShrink: 0 }} onClick={() => void sendMessage()}>Send</button>
        </div>
      </div>
    </div>
  );
}
