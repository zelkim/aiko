"use client";

import { useChat } from "@ai-sdk/react";
import { lastAssistantMessageIsCompleteWithApprovalResponses } from "ai";
import { useRef, useEffect, useState } from "react";
import { EventApprovalCard } from "./EventApprovalCard";
import { EventDisplayCard } from "./EventDisplayCard";
import { Send, LogOut } from "lucide-react";
import { signOut } from "@/lib/auth-client";

type ToolPart = {
  type: string;
  toolCallId: string;
  toolName: string;
  state: string;
  input: any;
  output?: any;
  approval?: { id: string; approved?: boolean };
};

function getToolParts(message: any): ToolPart[] {
  return (message.parts || [])
    .filter(
      (p: any) =>
        typeof p.type === "string" &&
        (p.type.startsWith("tool-") || p.type === "dynamic-tool")
    )
    .map((p: any) => ({
      ...p,
      toolName:
        p.type === "dynamic-tool"
          ? p.toolName
          : p.type.replace(/^tool-/, ""),
    }));
}

export function ChatLayout({
  user,
}: {
  user: { name: string; image?: string | null };
}) {
  const {
    messages,
    sendMessage,
    status,
    addToolApprovalResponse,
  } = useChat({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });

  const isWorking = status === "streaming" || status === "submitted";

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleConfirm = (approvalId: string) => {
    addToolApprovalResponse({ id: approvalId, approved: true });
  };

  const handleCancel = (approvalId: string) => {
    addToolApprovalResponse({
      id: approvalId,
      approved: false,
      reason: "User rejected the action.",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isWorking) return;
    sendMessage({ text: input });
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!input.trim() || isWorking) return;
      sendMessage({ text: input });
      setInput("");
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--background)', color: 'var(--foreground)' }}>

      {/* ── Top Header ── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.75rem 1.5rem',
        borderBottom: '1px solid var(--border)',
        background: 'var(--card)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>✦</span>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--primary)',
            letterSpacing: '0.02em',
          }}>aiko</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {user.image ? (
            <img src={user.image} alt={user.name} style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', outline: '2px solid var(--primary)', outlineOffset: 2 }} />
          ) : (
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'var(--primary)', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8rem', fontWeight: 800,
              outline: '2px solid oklch(0.67 0.24 340 / 0.4)',
              outlineOffset: 2,
            }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--muted-foreground)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-sans)' }}>
            {user.name}
          </span>
          <button
            onClick={() => signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/sign-in"; } } })}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: '0.78rem', color: 'var(--muted-foreground)',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px 8px', borderRadius: 6,
            }}
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1rem' }} ref={scrollRef}>
        <div style={{ maxWidth: 672, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 32 }}>
            {messages.length === 0 && (
              <div style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                marginTop: 'clamp(3rem, 12vh, 5rem)',
                gap: 8, userSelect: 'none', textAlign: 'center',
              }}>
                <div style={{
                  fontSize: '0.85rem',
                  letterSpacing: '0.3em',
                  color: 'oklch(0.60 0.16 340)',
                  fontWeight: 700,
                }}>˖ ✦ ˖</div>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(4.5rem, 15vw, 7.5rem)',
                  fontWeight: 700,
                  color: 'var(--primary)',
                  lineHeight: 1,
                  letterSpacing: '0.04em',
                }}>
                  aiko
                </div>
                <div style={{
                  fontSize: '0.65rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--muted-foreground)',
                  fontWeight: 700,
                  marginTop: 2,
                }}>
                  AI Kalendaryo Organizer
                </div>
                <div style={{
                  fontSize: '0.95rem',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 600,
                  color: 'oklch(0.72 0.17 340)',
                  marginTop: 8,
                }}>
                  AI ko, AI mo, AI ng kalendaryo ✦
                </div>
              </div>
            )}

            {messages.map((message) => {
              const isUser = message.role === "user";
              return (
              <div
                key={message.id}
                style={{
                  display: 'flex',
                  flexDirection: isUser ? 'row-reverse' : 'row',
                  alignItems: 'flex-end',
                  gap: 8,
                }}
              >
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: 4,
                  maxWidth: '78%',
                  alignItems: isUser ? 'flex-end' : 'flex-start',
                }}>
                  {/* Text bubbles */}
                  {message.parts
                    .filter((p): p is { type: "text"; text: string } => p.type === "text")
                    .map((part, i) => (
                      <div key={i} style={{
                        padding: '11px 17px',
                        borderRadius: isUser
                          ? '22px 22px 5px 22px'
                          : '5px 22px 22px 22px',
                        background: isUser ? 'var(--primary)' : 'var(--muted)',
                        color: isUser ? 'white' : 'var(--foreground)',
                        fontSize: '0.9rem',
                        fontFamily: 'var(--font-sans)',
                        fontWeight: 500,
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                        boxShadow: isUser
                          ? '0 2px 8px oklch(0.55 0.22 340 / 0.35)'
                          : '0 1px 4px oklch(0 0 0 / 0.25)',
                      }}>
                        {part.text}
                      </div>
                    ))}

                  {/* Render tool parts */}
                  {getToolParts(message).map((toolPart) => {
                    const { toolCallId, toolName, state, input: toolInput, output } = toolPart;

                    if (
                      toolName === "create_events" ||
                      toolName === "edit_event" ||
                      toolName === "delete_event"
                    ) {
                      if (state === "output-available") {
                        if (toolName === "create_events" && output?.success && toolInput?.events?.length) {
                          const displayEvents = (toolInput.events as any[]).map((e: any) => ({
                            summary: e.summary ?? "Event",
                            start: { dateTime: e.startDatetime ?? e.start?.dateTime ?? "" },
                            end: { dateTime: e.endDatetime ?? e.end?.dateTime ?? "" },
                          }));
                          return (
                            <EventDisplayCard
                              key={toolCallId}
                              title={`${displayEvents.length === 1 ? "Event" : `${displayEvents.length} events`} created`}
                              subtitle={output.message}
                              events={displayEvents}
                            />
                          );
                        }
                        return (
                          <div key={toolCallId} style={{
                            padding: '8px 12px', borderRadius: 12,
                            background: 'oklch(0.30 0.10 340 / 0.4)',
                            border: '1px solid oklch(0.55 0.20 340 / 0.3)',
                            fontSize: '0.75rem', color: 'var(--foreground)',
                          }}>
                            <strong>{toolName}</strong> completed.{" "}
                            {output?.success ? "✓ Done" : "✗ Failed"}
                            {output?.message && ` — ${output.message}`}
                          </div>
                        );
                      }
                      if (state === "output-error") {
                        return (
                          <div key={toolCallId} style={{
                            padding: '8px 12px', borderRadius: 12,
                            background: 'oklch(0.25 0.12 27 / 0.4)',
                            border: '1px solid oklch(0.50 0.20 27 / 0.3)',
                            fontSize: '0.75rem', color: 'var(--foreground)',
                          }}>
                            <strong>{toolName}</strong> failed.
                          </div>
                        );
                      }
                      if (state === "approval-responded") {
                        return (
                          <div key={toolCallId} style={{
                            padding: '8px 12px', borderRadius: 12,
                            background: 'oklch(0.30 0.10 60 / 0.3)',
                            border: '1px solid oklch(0.55 0.18 60 / 0.3)',
                            fontSize: '0.75rem', color: 'var(--muted-foreground)',
                          }}>
                            Executing {toolName}…
                          </div>
                        );
                      }
                      if (state === "approval-requested") {
                        return (
                          <EventApprovalCard
                            key={toolCallId}
                            toolName={toolName}
                            toolInput={toolInput}
                            onConfirm={() => handleConfirm(toolPart.approval!.id)}
                            onCancel={() => handleCancel(toolPart.approval!.id)}
                          />
                        );
                      }
                      return (
                        <div key={toolCallId} style={{
                          padding: '8px 12px', borderRadius: 12,
                          background: 'var(--muted)',
                          fontSize: '0.75rem', color: 'var(--muted-foreground)',
                        }}>
                          Preparing {toolName}…
                        </div>
                      );
                    }

                    if (toolName === "list_events") {
                      if (state === "output-available") {
                        const items = Array.isArray(output) ? output : [];
                        if (items.length > 0) {
                          const displayEvents = items.map((evt: any) => ({
                            id: evt.id,
                            summary: evt.summary ?? "(No title)",
                            start: evt.start ?? {},
                            end: evt.end ?? {},
                          }));
                          return (
                            <EventDisplayCard
                              key={toolCallId}
                              title={`${items.length} event${items.length === 1 ? "" : "s"} found`}
                              events={displayEvents}
                            />
                          );
                        }
                        return (
                          <div key={toolCallId} style={{
                            padding: '8px 12px', borderRadius: 12,
                            background: 'var(--muted)',
                            fontSize: '0.75rem', color: 'var(--muted-foreground)',
                          }}>
                            No events found for that time range.
                          </div>
                        );
                      }
                      return (
                        <div key={toolCallId} style={{
                          padding: '8px 12px', borderRadius: 12,
                          background: 'var(--muted)',
                          fontSize: '0.75rem', color: 'var(--muted-foreground)',
                        }}>
                          Checking calendar…
                        </div>
                      );
                    }

                    return (
                      <div key={toolCallId} style={{
                        padding: '8px 12px', borderRadius: 12,
                        background: 'var(--muted)',
                        fontSize: '0.75rem', color: 'var(--muted-foreground)',
                      }}>
                        Running {toolName}…
                      </div>
                    );
                  })}
                </div>
              </div>
              );
            })}

            {/* Typing indicator */}
            {isWorking && messages[messages.length - 1]?.role === "user" && (
              <div style={{ display: 'flex' }}>
                <div style={{
                  padding: '10px 16px',
                  borderRadius: '4px 20px 20px 20px',
                  background: 'var(--muted)',
                  display: 'flex', gap: 5, alignItems: 'center',
                  boxShadow: '0 1px 3px oklch(0 0 0 / 0.3)',
                }}>
                  {([0, 0.2, 0.4] as number[]).map((delay, i) => (
                    <span key={i} style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: 'var(--primary)',
                      display: 'inline-block',
                      animation: `aiko-bounce 1.2s ${delay}s ease-in-out infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      {/* Input bar */}
      <div style={{
        flexShrink: 0,
        padding: '0.875rem 1.25rem',
        borderTop: '1px solid var(--border)',
        background: 'var(--card)',
      }}>
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', gap: 8, maxWidth: 672, margin: '0 auto', alignItems: 'flex-end' }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            rows={1}
            onChange={(e) => { setInput(e.target.value); autoResize(); }}
            onKeyDown={handleKeyDown}
            placeholder="say something to aiko ✦"
            disabled={isWorking}
            style={{
              flex: 1,
              padding: '10px 18px',
              borderRadius: 22,
              border: '1.5px solid var(--border)',
              background: 'var(--input)',
              color: 'var(--foreground)',
              fontSize: '0.875rem',
              fontFamily: 'var(--font-sans)',
              outline: 'none',
              resize: 'none',
              lineHeight: 1.55,
              overflow: 'hidden',
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
          />
          <button
            type="submit"
            suppressHydrationWarning
            disabled={isWorking || !input.trim()}
            style={{
              width: 40, height: 40,
              borderRadius: '50%',
              background: input.trim() && !isWorking ? 'var(--primary)' : 'var(--muted)',
              color: input.trim() && !isWorking ? 'white' : 'var(--muted-foreground)',
              border: 'none',
              cursor: input.trim() && !isWorking ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            <Send size={16} />
          </button>
        </form>
      </div>

    </div>
  );
}
