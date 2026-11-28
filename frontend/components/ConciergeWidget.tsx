"use client";

import { useEffect, useRef, useState } from "react";

interface ChatRoomCard {
  id: number;
  room_name: string;
  description: string;
  price_per_night: number;
  total_amount?: number;
  nights?: number;
  max_guests: number;
  available_rooms: number;
  image_url?: string | null;
  match_tag?: string;
}

interface ChatBookingSummary {
  room_id: number;
  room_name: string;
  guest_name: string;
  guest_email: string;
  check_in: string;
  check_out: string;
  nights: number;
  guests: number;
  price_per_night: number;
  total_amount: number;
  available_rooms: number;
  preferences?: string[];
}

interface ChatConfirmedBooking {
  id: number;
  room_id: number;
  room_name: string;
  guest_name: string;
  guest_email: string;
  check_in: string;
  check_out: string;
  guests: number;
  total_amount: number;
  status: string;
  preferences?: string[];
}

interface MessageItem {
  id: string;
  role: "user" | "assistant";
  text: string;
  suggestions?: string[];
  rooms?: ChatRoomCard[];
  booking_summary?: ChatBookingSummary | null;
  confirmed_booking?: ChatConfirmedBooking | null;
}

interface ConciergeWidgetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPrompt?: string | null;
  onClearInitialPrompt?: () => void;
  apiUrl?: string;
}

const ROOM_FALLBACKS = [
  "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80",
];

const PREFERENCE_OPTIONS = [
  "Poolside",
  "Romantic Date Night",
  "Family Retreat",
  "Spa & Wellness",
  "Private Dining",
];

const WELCOME_MESSAGE: MessageItem = {
  id: "welcome",
  role: "assistant",
  text: "Good day, and welcome to Azure Escape Resorts. I am Aurelia, your personal AI Concierge. Tap 'Customize dates & guests' to choose any stay duration, guest count, and poolside or date-night preferences — or simply type what you have in mind.",
  suggestions: [
    "Customize dates & guests",
    "Show all suites & prices",
    "Plan a romantic date night",
    "Poolside getaway",
  ],
};

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
}

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "session-ssr";
  const existing = window.localStorage.getItem("azure_concierge_session");
  if (existing) return existing;
  const created = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  window.localStorage.setItem("azure_concierge_session", created);
  return created;
}

export default function ConciergeWidget({
  open,
  onOpenChange,
  initialPrompt,
  onClearInitialPrompt,
  apiUrl =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
}: ConciergeWidgetProps) {
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<MessageItem[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Interactive Stay Planner state (custom dates, flexible guests, preferences)
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [today, setToday] = useState("");
  const [planCheckIn, setPlanCheckIn] = useState("");
  const [planCheckOut, setPlanCheckOut] = useState("");
  const [planGuests, setPlanGuests] = useState(2);
  const [planPrefs, setPlanPrefs] = useState<string[]>([]);

  useEffect(() => {
    const t = addDaysISO(0);
    setToday(t);
    setPlanCheckIn(addDaysISO(1));
    setPlanCheckOut(addDaysISO(4)); // default 3 nights, freely adjustable

    const id = getOrCreateSessionId();
    setSessionId(id);

    async function hydrateHistory() {
      try {
        const res = await fetch(`${apiUrl}/api/chat/history/${id}`);
        if (!res.ok) return;
        const rows: { id: number; role: "user" | "assistant"; message: string }[] =
          await res.json();
        if (rows.length > 0) {
          setMessages([
            WELCOME_MESSAGE,
            ...rows.map((r) => ({
              id: `hist-${r.id}`,
              role: r.role,
              text: r.message,
            })),
          ]);
        }
      } catch {
        // Backend may not be running yet; keep welcome message
      }
    }

    void hydrateHistory();
  }, [apiUrl]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, sending, open, plannerOpen]);

  useEffect(() => {
    if (open && initialPrompt && sessionId) {
      const promptToSend = initialPrompt;
      onClearInitialPrompt?.();
      void sendMessage(promptToSend);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialPrompt, sessionId]);

  const planNights =
    planCheckIn && planCheckOut
      ? Math.round(
          (Date.parse(`${planCheckOut}T00:00:00Z`) -
            Date.parse(`${planCheckIn}T00:00:00Z`)) /
            (1000 * 60 * 60 * 24)
        )
      : 0;

  function togglePref(pref: string) {
    setPlanPrefs((prev) =>
      prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref]
    );
  }

  function handleChipClick(chip: string) {
    if (chip.toLowerCase().includes("customize dates")) {
      setPlannerOpen(true);
      return;
    }
    void sendMessage(chip);
  }

  function submitStayPlanner() {
    if (!planCheckIn || !planCheckOut || planNights <= 0) return;
    const prefText =
      planPrefs.length > 0 ? ` with ${planPrefs.join(", ")} preferences` : "";
    const composed = `Check-in ${planCheckIn} to ${planCheckOut} (${planNights} night${
      planNights > 1 ? "s" : ""
    }) for ${planGuests} guest${planGuests > 1 ? "s" : ""}${prefText}`;
    setPlannerOpen(false);
    void sendMessage(composed);
  }

  async function sendMessage(rawText: string) {
    const text = rawText.trim();
    if (!text || sending) return;

    const activeSession = sessionId || getOrCreateSessionId();
    if (!sessionId) setSessionId(activeSession);

    const userMsg: MessageItem = {
      id: `u-${Date.now()}`,
      role: "user",
      text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const response = await fetch(`${apiUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: activeSession,
          message: text,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Concierge is momentarily unavailable.");
      }

      const assistantMsg: MessageItem = {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: data.reply,
        suggestions: data.suggestions ?? [],
        rooms: data.rooms ?? [],
        booking_summary: data.booking_summary ?? null,
        confirmed_booking: data.confirmed_booking ?? null,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          text:
            err instanceof Error
              ? `My apologies — ${err.message} Please ensure the backend server is running.`
              : "My apologies — I could not reach the reservation desk. Please try again.",
          suggestions: ["Customize dates & guests", "Show all suites & prices"],
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function handleReset() {
    if (sessionId) {
      try {
        await fetch(`${apiUrl}/api/chat/history/${sessionId}`, {
          method: "DELETE",
        });
      } catch {
        // Ignore network errors on reset
      }
    }
    const freshId = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    if (typeof window !== "undefined") {
      window.localStorage.setItem("azure_concierge_session", freshId);
    }
    setSessionId(freshId);
    setPlannerOpen(false);
    setPlanPrefs([]);
    setMessages([WELCOME_MESSAGE]);
  }

  const lastMessage = messages[messages.length - 1];

  return (
    <>
      {/* Floating Luxury Concierge Trigger */}
      {!open && (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          aria-label="Open AI Concierge"
          className="group fixed bottom-6 right-6 z-50 flex items-center gap-3.5 rounded-full border border-gold/50 bg-forest/95 py-3 pl-3.5 pr-6 text-ivory shadow-[0_24px_60px_-15px_rgba(14,26,23,0.75)] backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-gold hover:shadow-[0_28px_70px_-15px_rgba(184,151,90,0.55)]"
        >
          <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#d7bf8c] to-[#9b7b3e] text-ink shadow-inner">
            <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-forest bg-emerald-400" />
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
              <path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z" />
            </svg>
          </span>
          <span className="text-left leading-tight">
            <span className="block text-[0.58rem] font-semibold uppercase tracking-[0.32em] text-gold-light">
              AI Concierge
            </span>
            <span className="block font-display text-xl font-normal tracking-wide text-ivory">
              Speak with Aurelia
            </span>
          </span>
        </button>
      )}

      {/* Concierge Drawer Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Aurelia AI Concierge"
          className="fixed bottom-4 right-4 z-50 flex h-[min(700px,calc(100svh-2rem))] w-[min(450px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[2rem] border border-gold/35 bg-ivory shadow-[0_40px_120px_-20px_rgba(14,26,23,0.65)] animate-rise"
        >
          {/* Header */}
          <div className="relative flex items-center justify-between bg-forest px-6 py-4 text-ivory">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-gold/10 via-transparent to-transparent" />
            <div className="relative flex items-center gap-3.5">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full border border-gold/50 bg-gradient-to-br from-[#d7bf8c]/25 to-transparent font-display text-xl text-gold-light">
                A
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-forest bg-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-2xl font-light tracking-wide text-ivory">
                    Aurelia
                  </h2>
                  <span className="rounded-full border border-gold/30 bg-gold/15 px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.22em] text-gold-light">
                    AI Concierge
                  </span>
                </div>
                <p className="text-[0.65rem] tracking-[0.12em] text-ivory/60">
                  Custom Stays &middot; Live PostgreSQL Availability
                </p>
              </div>
            </div>

            <div className="relative flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPlannerOpen((v) => !v)}
                title="Customize dates, guests & preferences"
                className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
                  plannerOpen
                    ? "bg-gold text-ink"
                    : "text-ivory/70 hover:bg-ivory/10 hover:text-ivory"
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleReset}
                title="Start a new conversation"
                className="flex h-9 w-9 items-center justify-center rounded-full text-ivory/65 transition hover:bg-ivory/10 hover:text-ivory"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                title="Close concierge"
                className="flex h-9 w-9 items-center justify-center rounded-full text-ivory/65 transition hover:bg-ivory/10 hover:text-ivory"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div
            ref={scrollRef}
            className="luxury-scroll flex-1 space-y-4 overflow-y-auto px-5 py-4"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3 text-[0.86rem] leading-6 ${
                    msg.role === "user"
                      ? "rounded-br-sm bg-forest text-ivory shadow-sm"
                      : "rounded-bl-sm border border-linen/90 bg-white text-ink shadow-[0_6px_24px_-12px_rgba(14,26,23,0.18)]"
                  }`}
                >
                  {msg.text}
                </div>

                {/* Suite Recommendation Cards */}
                {msg.rooms && msg.rooms.length > 0 && (
                  <div className="mt-3 w-full space-y-2.5">
                    {msg.rooms.map((room, idx) => (
                      <div
                        key={room.id}
                        className="overflow-hidden rounded-2xl border border-linen bg-white shadow-sm transition hover:border-gold/60"
                      >
                        <div className="flex">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={room.image_url || ROOM_FALLBACKS[idx % ROOM_FALLBACKS.length]}
                            alt={room.room_name}
                            className="h-32 w-24 shrink-0 object-cover"
                          />
                          <div className="flex flex-1 flex-col justify-between p-3">
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-display text-lg font-medium leading-tight text-ink">
                                  {room.room_name}
                                </h4>
                                <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[0.58rem] font-semibold text-emerald-800">
                                  {room.available_rooms} left
                                </span>
                              </div>
                              {room.match_tag && (
                                <span className="mt-1 inline-block rounded-full bg-gold/15 px-2 py-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-[#8f6e33]">
                                  {room.match_tag}
                                </span>
                              )}
                              <p className="mt-1 text-[0.72rem] text-muted">
                                Up to {room.max_guests} guests &middot;{" "}
                                {formatINR(room.price_per_night)}/night
                              </p>
                            </div>

                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-xs font-semibold text-ink">
                                {room.total_amount
                                  ? `${formatINR(room.total_amount)} (${room.nights}n)`
                                  : formatINR(room.price_per_night)}
                              </span>
                              <button
                                type="button"
                                disabled={sending}
                                onClick={() => sendMessage(`Select ${room.room_name}`)}
                                className="rounded-full bg-forest px-3.5 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-ivory transition hover:bg-gold disabled:opacity-40"
                              >
                                Select
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Structured Booking Summary Card */}
                {msg.booking_summary && (
                  <div className="mt-3 w-full overflow-hidden rounded-2xl border border-gold/40 bg-forest p-4 text-ivory shadow-lg">
                    <div className="flex items-center justify-between border-b border-ivory/15 pb-3">
                      <span className="text-[0.6rem] uppercase tracking-[0.3em] text-gold-light">
                        Reservation Folio
                      </span>
                      <span className="text-[0.65rem] text-ivory/70">
                        {msg.booking_summary.nights} night
                        {msg.booking_summary.nights > 1 ? "s" : ""}
                      </span>
                    </div>

                    <h4 className="mt-3 font-display text-2xl font-light text-ivory">
                      {msg.booking_summary.room_name}
                    </h4>

                    <dl className="mt-3 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <dt className="text-ivory/60">Guest</dt>
                        <dd>{msg.booking_summary.guest_name}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-ivory/60">Email</dt>
                        <dd className="max-w-[200px] truncate">
                          {msg.booking_summary.guest_email}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-ivory/60">Dates</dt>
                        <dd>
                          {formatDate(msg.booking_summary.check_in)} →{" "}
                          {formatDate(msg.booking_summary.check_out)}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-ivory/60">Guests</dt>
                        <dd>{msg.booking_summary.guests}</dd>
                      </div>
                      {msg.booking_summary.preferences &&
                        msg.booking_summary.preferences.length > 0 && (
                          <div className="flex justify-between gap-3">
                            <dt className="shrink-0 text-ivory/60">Preferences</dt>
                            <dd className="text-right text-gold-light">
                              {msg.booking_summary.preferences.join(" · ")}
                            </dd>
                          </div>
                        )}
                    </dl>

                    <div className="mt-4 flex items-end justify-between border-t border-ivory/15 pt-3">
                      <span className="text-[0.6rem] uppercase tracking-[0.25em] text-ivory/60">
                        Verified Total
                      </span>
                      <span className="font-display text-3xl text-gold-light">
                        {formatINR(msg.booking_summary.total_amount)}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        disabled={sending}
                        onClick={() => sendMessage("Confirm Reservation")}
                        className="btn-gold rounded-full py-2.5 text-center"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        disabled={sending}
                        onClick={() => sendMessage("Modify Details")}
                        className="rounded-full border border-ivory/30 py-2.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ivory transition hover:border-gold hover:text-gold-light disabled:opacity-40"
                      >
                        Modify
                      </button>
                    </div>
                  </div>
                )}

                {/* Confirmed Reservation Keepsake Card */}
                {msg.confirmed_booking && (
                  <div className="mt-3 w-full overflow-hidden rounded-2xl border border-gold bg-gradient-to-br from-[#fbf8f1] to-[#f1e7d2] p-4 text-ink shadow-md">
                    <div className="flex items-center justify-between">
                      <span className="text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-gold">
                        Booking Confirmed
                      </span>
                      <span className="rounded-full bg-forest px-2.5 py-0.5 text-[0.65rem] font-semibold text-gold-light">
                        #{msg.confirmed_booking.id}
                      </span>
                    </div>
                    <h4 className="mt-2 font-display text-2xl text-ink">
                      {msg.confirmed_booking.room_name}
                    </h4>
                    <p className="mt-1 text-xs text-muted">
                      {formatDate(msg.confirmed_booking.check_in)} –{" "}
                      {formatDate(msg.confirmed_booking.check_out)} &middot;{" "}
                      {msg.confirmed_booking.guests} guest
                      {msg.confirmed_booking.guests > 1 ? "s" : ""}
                    </p>
                    {msg.confirmed_booking.preferences &&
                      msg.confirmed_booking.preferences.length > 0 && (
                        <p className="mt-1.5 text-[0.7rem] font-medium text-[#8f6e33]">
                          Curated for: {msg.confirmed_booking.preferences.join(" · ")}
                        </p>
                      )}
                    <div className="mt-3 flex items-center justify-between border-t border-gold/30 pt-3">
                      <span className="text-xs text-muted">
                        {msg.confirmed_booking.guest_name}
                      </span>
                      <span className="font-display text-2xl font-medium text-forest">
                        {formatINR(msg.confirmed_booking.total_amount)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {sending && (
              <div className="flex w-fit items-center gap-2.5 rounded-2xl rounded-bl-sm border border-linen bg-white px-4 py-3 text-xs text-muted">
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold [animation-delay:300ms]" />
                </span>
                Aurelia is checking live availability…
              </div>
            )}
          </div>

          {/* Interactive Stay Planner Panel */}
          {plannerOpen && (
            <div className="border-t border-gold/30 bg-white px-5 py-4 shadow-[0_-12px_30px_-15px_rgba(14,26,23,0.18)]">
              <div className="flex items-center justify-between">
                <span className="text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-gold">
                  Customize Your Stay
                </span>
                <button
                  type="button"
                  onClick={() => setPlannerOpen(false)}
                  className="text-xs text-muted hover:text-ink"
                >
                  Close
                </button>
              </div>

              {/* Dates */}
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="rounded-xl border border-linen bg-ivory/60 px-3 py-2">
                  <span className="block text-[0.58rem] uppercase tracking-[0.22em] text-muted">
                    Check-in
                  </span>
                  <input
                    type="date"
                    value={planCheckIn}
                    min={today}
                    onChange={(e) => {
                      const nextIn = e.target.value;
                      setPlanCheckIn(nextIn);
                      if (planCheckOut && planCheckOut <= nextIn) {
                        const d = new Date(`${nextIn}T00:00:00`);
                        d.setDate(d.getDate() + 2);
                        setPlanCheckOut(d.toLocaleDateString("en-CA"));
                      }
                    }}
                    className="mt-1 w-full bg-transparent text-xs font-medium text-ink outline-none"
                  />
                </label>
                <label className="rounded-xl border border-linen bg-ivory/60 px-3 py-2">
                  <span className="block text-[0.58rem] uppercase tracking-[0.22em] text-muted">
                    Check-out {planNights > 0 ? `(${planNights}n)` : ""}
                  </span>
                  <input
                    type="date"
                    value={planCheckOut}
                    min={planCheckIn || today}
                    onChange={(e) => setPlanCheckOut(e.target.value)}
                    className="mt-1 w-full bg-transparent text-xs font-medium text-ink outline-none"
                  />
                </label>
              </div>

              {/* Guest Stepper */}
              <div className="mt-3 flex items-center justify-between rounded-xl border border-linen bg-ivory/60 px-3.5 py-2">
                <div>
                  <span className="block text-[0.58rem] uppercase tracking-[0.22em] text-muted">
                    Guests
                  </span>
                  <span className="text-xs font-semibold text-ink">
                    {planGuests} {planGuests === 1 ? "Guest" : "Guests"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPlanGuests((g) => Math.max(1, g - 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-linen bg-white text-sm text-ink transition hover:border-gold"
                  >
                    −
                  </button>
                  <span className="w-5 text-center text-xs font-semibold">
                    {planGuests}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPlanGuests((g) => Math.min(12, g + 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-linen bg-white text-sm text-ink transition hover:border-gold"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Preferences / Occasion Multi-Select */}
              <div className="mt-3">
                <span className="block text-[0.58rem] uppercase tracking-[0.22em] text-muted">
                  Preferences &amp; Occasion (optional)
                </span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {PREFERENCE_OPTIONS.map((pref) => {
                    const active = planPrefs.includes(pref);
                    return (
                      <button
                        key={pref}
                        type="button"
                        onClick={() => togglePref(pref)}
                        className={`rounded-full px-3 py-1 text-[0.68rem] font-medium transition ${
                          active
                            ? "bg-forest text-gold-light shadow-sm"
                            : "border border-linen bg-ivory/70 text-ink hover:border-gold"
                        }`}
                      >
                        {active ? "✓ " : ""}
                        {pref}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                disabled={sending || planNights <= 0}
                onClick={submitStayPlanner}
                className="btn-gold mt-3.5 w-full rounded-full py-2.5"
              >
                {planNights > 0
                  ? `Find Suites (${planNights} night${planNights > 1 ? "s" : ""}, ${planGuests} guest${planGuests > 1 ? "s" : ""})`
                  : "Select valid check-out date"}
              </button>
            </div>
          )}

          {/* Quick-Reply Suggestion Chips */}
          {!sending &&
            !plannerOpen &&
            lastMessage?.role === "assistant" &&
            lastMessage.suggestions &&
            lastMessage.suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 border-t border-linen/60 bg-sand/35 px-4 py-2.5">
                {lastMessage.suggestions.map((chip) => {
                  const isPlanner = chip.toLowerCase().includes("customize dates");
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleChipClick(chip)}
                      className={`rounded-full px-3 py-1.5 text-[0.7rem] font-medium transition ${
                        isPlanner
                          ? "border border-gold bg-forest text-gold-light hover:bg-gold hover:text-white"
                          : "border border-linen bg-white text-ink hover:border-gold hover:bg-forest hover:text-ivory"
                      }`}
                    >
                      {isPlanner ? "✦ " : ""}
                      {chip}
                    </button>
                  );
                })}
              </div>
            )}

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage(input);
            }}
            className="flex items-center gap-2 border-t border-linen bg-white px-4 py-3"
          >
            <button
              type="button"
              onClick={() => setPlannerOpen((v) => !v)}
              title="Customize dates, guests & preferences"
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition ${
                plannerOpen
                  ? "border-gold bg-forest text-gold-light"
                  : "border-linen text-muted hover:border-gold hover:text-ink"
              }`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type dates, guests, poolside, date night…"
              disabled={sending}
              className="flex-1 bg-transparent px-1.5 py-1.5 text-sm text-ink outline-none placeholder:text-muted/70"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Send message"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest text-gold-light transition hover:bg-gold hover:text-white disabled:opacity-35"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M22 2 11 13" />
                <path d="m22 2-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
