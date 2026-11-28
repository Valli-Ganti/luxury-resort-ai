"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ConciergeWidget from "@/components/ConciergeWidget";
import Footer from "@/components/Footer";

interface Resort {
  id: number;
  name: string;
  location: string;
  description: string;
  rating: number;
  currency: string;
  amenities: string[];
}

interface Room {
  id: number;
  room_name: string;
  description: string;
  price_per_night: number;
  max_guests: number;
  total_rooms: number;
  image_url: string | null;
  is_active: boolean;
}

interface BookingResponse {
  id: number;
  room_id: number;
  guest_name: string;
  guest_email: string;
  check_in: string;
  check_out: string;
  guests: number;
  total_amount: number;
  status: string;
}

interface AvailabilityResponse {
  room_id: number;
  room_name: string;
  available: boolean;
  total_rooms: number;
  booked_rooms: number;
  available_rooms: number;
  message: string;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const IMG = (id: string, w = 1600) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

const HERO_IMAGE = IMG("photo-1540541338287-41700207dee6", 2400);
const ABOUT_IMAGE_MAIN = IMG("photo-1571896349842-33c89424de2d", 1200);
const ABOUT_IMAGE_SMALL = IMG("photo-1544161515-4ab6ce6db874", 800);
const BOOKING_IMAGE = IMG("photo-1520250497591-112f2f40a3f4", 1400);

const ROOM_FALLBACKS = [
  IMG("photo-1590490360182-c33d57733427", 1000),
  IMG("photo-1611892440504-42a792e24d32", 1000),
  IMG("photo-1578683010236-d716f9a3f461", 1000),
  IMG("photo-1582719508461-905c673771fd", 1000),
  IMG("photo-1566073771259-6a8506099945", 1000),
];

const GALLERY_MOMENTS = [
  {
    title: "Infinity Horizon Pool",
    subtitle: "Sunset Aperitifs · Arabian Sea",
    image: IMG("photo-1571003123894-1f0594d2b5d9", 1400),
    span: "md:col-span-2 md:row-span-2 h-[420px] md:h-full",
  },
  {
    title: "Barefoot Coastal Dining",
    subtitle: "Chef's Seven-Course Tasting",
    image: IMG("photo-1514933651103-005eec06c04b", 1000),
    span: "h-[280px]",
  },
  {
    title: "Ayurvedic Spa Pavilion",
    subtitle: "Botanical Rituals & Sound Bath",
    image: IMG("photo-1540555700478-4be289fbecef", 1000),
    span: "h-[280px]",
  },
  {
    title: "Private Palm Terraces",
    subtitle: "Morning Espresso Over the Surf",
    image: IMG("photo-1499793983690-e29da59ef1c2", 1200),
    span: "md:col-span-2 h-[280px]",
  },
];

const ACCOLADES = [
  "Condé Nast Traveler Gold List",
  "Forbes Five-Star Sanctuary",
  "Michelin Key Distinction",
  "Architectural Digest Top 25",
  "Travel + Leisure World's Best",
];

const TESTIMONIALS = [
  {
    quote:
      "Every morning felt suspended in gold — the sound of the tide from our terrace, breakfast served barefoot by the pool, and a concierge who remembered our favorite vintage.",
    guest: "Ananya & Rohan Kapoor",
    origin: "Mumbai · Oceanfront Villa",
  },
  {
    quote:
      "I planned our entire anniversary escape in two minutes with Aurelia, the AI concierge. Live availability, transparent pricing, and zero friction from booking to check-in.",
    guest: "Elena Vance",
    origin: "London · Private Pool Suite",
  },
  {
    quote:
      "Understated architecture, extraordinary cuisine, and rare stillness. Azure Escape is easily the most refined coastal retreat in South Asia.",
    guest: "Marcus Lindholm",
    origin: "Zurich · Penthouse Sanctuary",
  },
];

const NAV_LINKS = [
  { href: "#about", label: "The Resort" },
  { href: "#amenities", label: "Experiences" },
  { href: "#rooms", label: "Suites" },
  { href: "/gallery", label: "Gallery" },
  { href: "#booking", label: "Reservations" },
];

/* ---------- Small presentational helpers ---------- */

function AmenityIcon({ name }: { name: string }) {
  const n = name.toLowerCase();
  const common = {
    width: 28,
    height: 28,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (n.includes("pool") || n.includes("swim"))
    return (
      <svg {...common}>
        <path d="M2 16c2 0 2-1.5 4-1.5S8 16 10 16s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5" />
        <path d="M2 20c2 0 2-1.5 4-1.5S8 20 10 20s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5" />
        <path d="M8 13V5a2 2 0 0 1 4 0M16 13V5a2 2 0 0 0-4 0M8 9h8" />
      </svg>
    );
  if (n.includes("beach"))
    return (
      <svg {...common}>
        <path d="M12 3a9 9 0 0 1 9 9H3a9 9 0 0 1 9-9z" />
        <path d="M12 12v9M8 21h8" />
      </svg>
    );
  if (n.includes("spa"))
    return (
      <svg {...common}>
        <path d="M12 21c-4.5 0-8-3-8-7 3 0 6 1.5 8 4 2-2.5 5-4 8-4 0 4-3.5 7-8 7z" />
        <path d="M12 18c-2-3-2-7 0-11 2 4 2 8 0 11z" />
      </svg>
    );
  if (n.includes("dining") || n.includes("restaurant") || n.includes("food"))
    return (
      <svg {...common}>
        <path d="M7 3v8a2 2 0 0 0 2 2v8M5 3v6M9 3v6" />
        <path d="M17 21V3c-2 1.5-3 4-3 7s1 4 3 4" />
      </svg>
    );
  if (n.includes("wifi"))
    return (
      <svg {...common}>
        <path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0" />
        <circle cx="12" cy="19.5" r="0.8" fill="currentColor" />
      </svg>
    );
  if (n.includes("airport") || n.includes("transfer"))
    return (
      <svg {...common}>
        <path d="M10.5 13.5 3 11l1.5-1.5 7.5 1 4.5-4.5a2 2 0 0 1 3 3L15 13.5l1 7.5-1.5 1.5-2.5-7.5" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="m12 3 2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z" />
    </svg>
  );
}

function SectionHeading({
  eyebrow,
  title,
  italic,
  copy,
  light = false,
  center = true,
}: {
  eyebrow: string;
  title: string;
  italic?: string;
  copy?: string;
  light?: boolean;
  center?: boolean;
}) {
  return (
    <div className={center ? "text-center mx-auto max-w-2xl" : "max-w-xl"}>
      <span className="eyebrow">{eyebrow}</span>
      <h2
        className={`mt-6 font-display text-4xl md:text-6xl font-light leading-[1.05] ${
          light ? "text-ivory" : "text-ink"
        }`}
      >
        {title} {italic && <em className="italic text-gold">{italic}</em>}
      </h2>
      {copy && (
        <p
          className={`mt-6 leading-8 ${
            light ? "text-ivory/70" : "text-muted"
          }`}
        >
          {copy}
        </p>
      )}
    </div>
  );
}

/* ---------- Page ---------- */

export default function Home() {
  const [resort, setResort] = useState<Resort | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);

  const [loading, setLoading] = useState(true);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [error, setError] = useState("");
  const [roomsError, setRoomsError] = useState("");

  const [availability, setAvailability] =
    useState<AvailabilityResponse | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");

  // Booking form state
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("1");

  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccess, setBookingSuccess] =
    useState<BookingResponse | null>(null);
  const [today, setToday] = useState("");

  // UI & Concierge state
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [conciergeOpen, setConciergeOpen] = useState(false);
  const [conciergePrompt, setConciergePrompt] = useState<string | null>(null);
  const [detailRoom, setDetailRoom] = useState<{ room: Room; index: number } | null>(null);

  useEffect(() => {
    setToday(new Date().toLocaleDateString("en-CA"));

    async function fetchResort() {
      try {
        const response = await fetch(`${API_URL}/api/resort`);
        if (!response.ok) throw new Error("Failed to fetch resort");
        const data: Resort = await response.json();
        setResort(data);
      } catch {
        setError("Unable to load resort information.");
      } finally {
        setLoading(false);
      }
    }

    async function fetchRooms() {
      try {
        const response = await fetch(`${API_URL}/api/rooms`);
        if (!response.ok) throw new Error("Failed to fetch rooms");
        const data: Room[] = await response.json();
        setRooms(data);
      } catch {
        setRoomsError("Unable to load rooms. Please try again.");
      } finally {
        setRoomsLoading(false);
      }
    }

    fetchResort();
    fetchRooms();

    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);

  const formatDate = (value: string) =>
    value
      ? new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—";

  const roomImage = (room: Room, index: number) =>
    room.image_url || ROOM_FALLBACKS[index % ROOM_FALLBACKS.length];

  const selectedRoom = rooms.find((room) => room.id === Number(selectedRoomId));
  const selectedRoomIndex = rooms.findIndex(
    (room) => room.id === Number(selectedRoomId)
  );

  const nights =
    checkIn && checkOut
      ? Math.round(
          (Date.parse(`${checkOut}T00:00:00Z`) -
            Date.parse(`${checkIn}T00:00:00Z`)) /
            (1000 * 60 * 60 * 24)
        )
      : 0;

  const estimatedTotal =
    selectedRoom && nights > 0
      ? Number(selectedRoom.price_per_night) * nights
      : 0;

  const startingPrice = rooms.length
    ? Math.min(...rooms.map((r) => Number(r.price_per_night)))
    : 0;

  function resetAvailability() {
    setAvailability(null);
    setAvailabilityError("");
  }

  function scrollToBooking() {
    document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
  }

  function openConciergeWithPrompt(prompt?: string) {
    if (prompt) setConciergePrompt(prompt);
    setConciergeOpen(true);
  }

  function selectRoomForBooking(room: Room) {
    setSelectedRoomId(String(room.id));
    if (Number(guests) > room.max_guests) setGuests("1");
    setBookingError("");
    setBookingSuccess(null);
    resetAvailability();
    setDetailRoom(null);
    scrollToBooking();
  }

  async function checkAvailability() {
    if (!selectedRoomId || !checkIn || !checkOut || !guests) {
      setAvailability(null);
      setAvailabilityError("");
      return;
    }

    if (checkOut <= checkIn) {
      setAvailability(null);
      setAvailabilityError("Check-out must be after check-in.");
      return;
    }

    setCheckingAvailability(true);
    setAvailability(null);
    setAvailabilityError("");

    try {
      const params = new URLSearchParams({
        check_in: checkIn,
        check_out: checkOut,
        guests: guests,
      });

      const response = await fetch(
        `${API_URL}/api/rooms/${selectedRoomId}/availability?${params}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Unable to check availability."
        );
      }

      setAvailability(data);
    } catch (err) {
      setAvailabilityError(
        err instanceof Error ? err.message : "Availability check failed."
      );
    } finally {
      setCheckingAvailability(false);
    }
  }

  async function handleBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBookingError("");
    setBookingSuccess(null);

    if (!selectedRoom) {
      setBookingError("Please select a room.");
      return;
    }
    if (nights <= 0) {
      setBookingError("Check-out must be after check-in.");
      return;
    }
    if (Number(guests) > selectedRoom.max_guests) {
      setBookingError(
        `This room allows a maximum of ${selectedRoom.max_guests} guests.`
      );
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_id: Number(selectedRoomId),
          guest_name: guestName,
          guest_email: guestEmail,
          check_in: checkIn,
          check_out: checkOut,
          guests: Number(guests),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Unable to complete your booking."
        );
      }

      setBookingSuccess(data as BookingResponse);
    } catch (err) {
      setBookingError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function resetBookingForm() {
    setSelectedRoomId("");
    setGuestName("");
    setGuestEmail("");
    setCheckIn("");
    setCheckOut("");
    setGuests("1");
    setBookingSuccess(null);
    setBookingError("");
    resetAvailability();
  }

  const canConfirm =
    !submitting &&
    !roomsLoading &&
    rooms.length > 0 &&
    !checkingAvailability &&
    !!availability?.available &&
    availability?.room_id === Number(selectedRoomId) &&
    availabilityError === "" &&
    !!checkIn &&
    !!checkOut;

  return (
    <main className="min-h-screen bg-ivory text-ink">
      {/* ================= Navigation ================= */}
      <header
        className={`fixed inset-x-0 top-0 z-40 transition-all duration-500 ${
          scrolled
            ? "bg-ivory/90 backdrop-blur-xl border-b border-linen/70 py-4 shadow-[0_8px_30px_-18px_rgba(14,26,23,0.2)]"
            : "bg-transparent py-7"
        }`}
      >
        <nav className="mx-auto flex max-w-[1520px] items-center justify-between gap-8 px-5 lg:px-8">
          <a href="#home" className="group flex shrink-0 flex-col leading-none">
            <span
              className={`whitespace-nowrap font-display text-xl tracking-[0.22em] transition-colors xl:text-2xl ${
                scrolled ? "text-ink" : "text-ivory"
              }`}
            >
              AZURE ESCAPE
            </span>
            <span className="mt-1 whitespace-nowrap text-[0.55rem] tracking-[0.48em] text-gold">
              RESORTS &middot; GOA
            </span>
          </a>

          <div className="hidden items-center gap-5 lg:flex xl:gap-7">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`relative whitespace-nowrap text-[0.66rem] font-medium uppercase tracking-[0.22em] transition-colors after:absolute after:-bottom-1.5 after:left-0 after:h-px after:w-0 after:bg-gold after:transition-all hover:after:w-full ${
                  scrolled
                    ? "text-ink/80 hover:text-ink"
                    : "text-ivory/85 hover:text-ivory"
                }`}
              >
                {link.label}
              </a>
            ))}
            <a href="#booking" className="btn-gold shrink-0 whitespace-nowrap rounded-full px-6 py-3">
              Book Stay
            </a>
          </div>

          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen((v) => !v)}
            className={`lg:hidden ${scrolled ? "text-ink" : "text-ivory"}`}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
            >
              {menuOpen ? (
                <path d="M6 6l12 12M18 6 6 18" />
              ) : (
                <path d="M4 8h16M4 16h16" />
              )}
            </svg>
          </button>
        </nav>

        {menuOpen && (
          <div className="mx-6 mt-4 rounded-2xl border border-linen bg-ivory/95 p-6 shadow-2xl backdrop-blur-xl lg:hidden">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block border-b border-linen py-4 text-xs uppercase tracking-[0.3em] text-ink last:border-0"
              >
                {link.label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                openConciergeWithPrompt();
              }}
              className="btn-gold mt-4 w-full rounded-full py-3.5"
            >
              Speak with AI Concierge
            </button>
          </div>
        )}
      </header>

      {/* ================= Hero ================= */}
      <section
        id="home"
        className="relative flex min-h-[100svh] items-center overflow-hidden"
      >
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HERO_IMAGE}
            alt="Infinity pool overlooking the ocean at sunset"
            className="animate-slow-zoom h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/75 via-ink/35 to-ink/90" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/65 via-ink/20 to-transparent" />
        </div>

        <div className="relative mx-auto w-full max-w-[1520px] px-6 pb-20 pt-28 lg:px-8">
          <div className="max-w-3xl">
            <span className="eyebrow animate-rise">
              Goa &middot; Private Beachfront Sanctuary
            </span>
            <h1 className="animate-rise stagger-1 mt-8 font-display text-6xl font-light leading-[0.94] text-ivory md:text-8xl lg:text-[7.75rem]">
              Discover your
              <br />
              <em className="italic text-gold-light">private</em> paradise
            </h1>
            <p className="animate-rise stagger-2 mt-8 max-w-lg text-base leading-8 text-ivory/80 md:text-lg">
              Sun-drenched oceanfront suites, whispering palms and timeless
              coastal rituals — tailored effortlessly by our personal AI
              concierge.
            </p>
            <div className="animate-rise stagger-3 mt-12 flex flex-wrap items-center gap-5">
              <a href="#rooms" className="btn-gold rounded-full px-10 py-4">
                Explore Suites
              </a>
              <button
                type="button"
                onClick={() => openConciergeWithPrompt()}
                className="group flex items-center gap-3.5 rounded-full border border-ivory/35 bg-ivory/10 px-7 py-3.5 text-[0.7rem] font-semibold uppercase tracking-[0.26em] text-ivory backdrop-blur-md transition hover:border-gold hover:bg-gold/20"
              >
                <span className="h-2 w-2 rounded-full bg-gold-light" />
                Plan with AI Concierge
              </button>
            </div>
          </div>
        </div>

        {/* Vertical Scroll Cue */}
        <div className="pointer-events-none absolute right-10 top-1/2 hidden -translate-y-1/2 flex-col items-center gap-4 xl:flex">
          <span className="[writing-mode:vertical-rl] text-[0.58rem] uppercase tracking-[0.4em] text-ivory/50">
            Scroll to explore
          </span>
          <div className="relative h-16 w-px overflow-hidden bg-ivory/20">
            <div className="animate-scroll-line h-1/2 w-full bg-gold-light" />
          </div>
        </div>

      </section>

      {/* ================= Press & Accolades Ribbon ================= */}
      <section className="border-b border-linen bg-ink py-7 text-ivory/65">
        <div className="mx-auto flex max-w-[1520px] flex-wrap items-center justify-center gap-x-10 gap-y-3 px-6 text-[0.65rem] uppercase tracking-[0.32em] lg:justify-between lg:px-8">
          {ACCOLADES.map((item) => (
            <span key={item} className="flex items-center gap-3">
              <span className="h-1 w-1 rotate-45 bg-gold" />
              {item}
            </span>
          ))}
        </div>
      </section>

      {/* ================= About ================= */}
      <section id="about" className="relative overflow-hidden py-16 md:py-20">
        <div className="mx-auto grid max-w-[1520px] items-center gap-14 px-6 lg:grid-cols-2 lg:px-8">
          <div className="relative">
            <div className="relative overflow-hidden rounded-t-[12rem] rounded-b-3xl shadow-[0_30px_90px_-35px_rgba(14,26,23,0.4)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ABOUT_IMAGE_MAIN}
                alt="Resort pool surrounded by palms"
                className="h-[560px] w-full object-cover transition duration-[2s] hover:scale-105"
              />
            </div>
            <div className="absolute -bottom-12 -right-4 hidden w-56 overflow-hidden rounded-2xl border-8 border-ivory shadow-2xl md:block lg:-right-12">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ABOUT_IMAGE_SMALL}
                alt="Spa treatment"
                className="h-64 w-full object-cover"
              />
            </div>
            <div className="absolute -left-4 top-12 rounded-2xl border border-gold/30 bg-forest px-7 py-6 text-ivory shadow-2xl lg:-left-10">
              <p className="font-display text-5xl font-light text-gold-light">
                {resort ? resort.rating.toFixed(1) : "4.8"}
              </p>
              <div className="mt-1 flex gap-0.5 text-gold">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg
                    key={i}
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="m12 2 3 6.5 7 .8-5.2 4.8 1.4 7L12 17.6 5.8 21.1l1.4-7L2 9.3l7-.8z" />
                  </svg>
                ))}
              </div>
              <p className="mt-2 text-[0.6rem] uppercase tracking-[0.3em] text-ivory/60">
                Guest rating
              </p>
            </div>
          </div>

          <div>
            {loading && (
              <div className="space-y-4">
                <div className="h-3 w-40 animate-pulse rounded bg-linen" />
                <div className="h-14 w-3/4 animate-pulse rounded bg-linen" />
                <div className="h-24 w-full animate-pulse rounded bg-linen" />
              </div>
            )}
            {error && (
              <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
                {error}
              </p>
            )}
            {resort && (
              <>
                <SectionHeading
                  center={false}
                  eyebrow={`Welcome to ${resort.location}`}
                  title={
                    resort.name.split(" ").slice(0, -1).join(" ") || resort.name
                  }
                  italic={
                    resort.name.split(" ").length > 1
                      ? resort.name.split(" ").slice(-1)[0]
                      : undefined
                  }
                  copy={resort.description}
                />
                <p className="mt-6 max-w-xl leading-8 text-muted">
                  Every detail is quietly orchestrated — from private plunge
                  pools and candlelit coastal gastronomy to personal butlers and
                  our 24/7 AI Concierge who prepares your stay to the minute.
                </p>

                <div className="mt-12 grid grid-cols-3 gap-6 border-t border-linen pt-10">
                  {[
                    {
                      value: rooms.length
                        ? `${rooms.reduce((a, r) => a + r.total_rooms, 0)}`
                        : "—",
                      label: "Private suites",
                    },
                    {
                      value: `${resort.amenities.length}+`,
                      label: "Signature experiences",
                    },
                    { value: "24/7", label: "Butler & AI concierge" },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <p className="font-display text-4xl font-light text-ink md:text-5xl">
                        {stat.value}
                      </p>
                      <p className="mt-2 text-[0.62rem] uppercase tracking-[0.25em] text-muted">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ================= Amenities ================= */}
      <section
        id="amenities"
        className="relative overflow-hidden bg-forest py-16 md:py-20"
      >
        <div className="pointer-events-none absolute -right-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-gold/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-40 h-[32rem] w-[32rem] rounded-full bg-moss/60 blur-3xl" />

        <div className="relative mx-auto max-w-[1520px] px-6 lg:px-8">
          <SectionHeading
            light
            eyebrow="Curated for you"
            title="Resort"
            italic="experiences"
            copy="Indulgences designed to slow time — each one crafted to restore, delight and inspire."
          />

          {resort && (
            <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-3xl border border-ivory/10 bg-ivory/10 sm:grid-cols-2 lg:grid-cols-3">
              {resort.amenities.map((amenity, i) => (
                <div
                  key={amenity}
                  className="group relative bg-forest p-10 transition-colors duration-500 hover:bg-moss/60"
                >
                  <span className="absolute right-8 top-8 font-display text-sm text-ivory/25">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-gold/40 text-gold-light transition duration-500 group-hover:border-gold group-hover:bg-gold group-hover:text-forest">
                    <AmenityIcon name={amenity} />
                  </div>
                  <h3 className="mt-8 font-display text-3xl font-light text-ivory">
                    {amenity}
                  </h3>
                  <div className="mt-5 h-px w-10 bg-gold transition-all duration-500 group-hover:w-20" />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ================= Rooms ================= */}
      <section id="rooms" className="py-16 md:py-20">
        <div className="mx-auto max-w-[1520px] px-6 lg:px-8">
          <div className="flex flex-col items-end justify-between gap-8 md:flex-row">
            <SectionHeading
              center={false}
              eyebrow="Accommodation"
              title="Suites &"
              italic="villas"
              copy="Find the perfect sanctuary for your getaway — each space thoughtfully designed with ocean-inspired elegance."
            />
            {startingPrice > 0 && (
              <div className="text-left md:text-right">
                <p className="text-[0.62rem] uppercase tracking-[0.3em] text-muted">
                  Stays from
                </p>
                <p className="font-display text-4xl text-ink">
                  {formatPrice(startingPrice)}
                  <span className="text-base text-muted"> / night</span>
                </p>
              </div>
            )}
          </div>

          {roomsLoading && (
            <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-[560px] animate-pulse rounded-3xl bg-sand"
                />
              ))}
            </div>
          )}

          {roomsError && (
            <p className="mt-16 rounded-xl bg-red-50 p-4 text-center text-sm text-red-700">
              {roomsError}
            </p>
          )}

          {!roomsLoading && !roomsError && rooms.length === 0 && (
            <p className="mt-16 text-center text-muted">
              No rooms are currently available.
            </p>
          )}

          <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room, index) => (
              <article
                key={room.id}
                className="group flex flex-col overflow-hidden rounded-3xl border border-linen/70 bg-white shadow-[0_20px_60px_-30px_rgba(14,26,23,0.25)] transition duration-500 hover:-translate-y-2 hover:border-gold/50 hover:shadow-[0_40px_80px_-30px_rgba(14,26,23,0.35)]"
              >
                <div
                  onClick={() => setDetailRoom({ room, index })}
                  className="relative h-72 cursor-pointer overflow-hidden"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={roomImage(room, index)}
                    alt={room.room_name}
                    className="h-full w-full object-cover transition duration-[1.4s] group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/65 via-transparent to-transparent" />
                  <span className="absolute left-5 top-5 rounded-full bg-ivory/90 px-4 py-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.25em] text-ink backdrop-blur">
                    {room.total_rooms} available
                  </span>
                  <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between text-ivory">
                    <p className="font-display text-3xl">
                      {formatPrice(Number(room.price_per_night))}
                    </p>
                    <p className="text-[0.62rem] uppercase tracking-[0.25em] text-ivory/80">
                      per night
                    </p>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-8">
                  <h3 className="font-display text-3xl font-light">
                    {room.room_name}
                  </h3>
                  <p className="mt-4 flex-1 text-sm leading-7 text-muted">
                    {room.description}
                  </p>

                  <div className="mt-6 flex items-center gap-6 border-t border-sand pt-6 text-xs text-muted">
                    <span className="flex items-center gap-2">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.3"
                      >
                        <circle cx="9" cy="8" r="3.5" />
                        <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6" />
                      </svg>
                      Up to {room.max_guests} guests
                    </span>
                    <span className="flex items-center gap-2">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.3"
                      >
                        <path d="M3 18v-6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v6M3 14h18M5 9V6h14v3M3 18v2M21 18v2" />
                      </svg>
                      Butler service
                    </span>
                  </div>

                  <div className="mt-8 grid grid-cols-5 gap-3">
                    <button
                      type="button"
                      onClick={() => setDetailRoom({ room, index })}
                      className="col-span-2 rounded-full border border-linen py-3.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink transition hover:border-gold hover:text-gold"
                    >
                      Details
                    </button>
                    <button
                      type="button"
                      onClick={() => selectRoomForBooking(room)}
                      className="col-span-3 flex items-center justify-center gap-2 rounded-full bg-forest px-5 py-3.5 text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-ivory transition duration-300 hover:bg-gold"
                    >
                      Reserve
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      >
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ================= Curated Gallery ================= */}
      <section id="gallery" className="bg-sand/45 py-16 md:py-20">
        <div className="mx-auto max-w-[1520px] px-6 lg:px-8">
          <SectionHeading
            eyebrow="Atmosphere"
            title="Life at"
            italic="Azure Escape"
            copy="Glimpses of unhurried mornings, sunlit terraces, and twilight gatherings by the sea."
          />

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-4">
            {GALLERY_MOMENTS.map((item) => (
              <figure
                key={item.title}
                className={`group relative overflow-hidden rounded-3xl ${item.span}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-full w-full object-cover transition duration-[1.6s] group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/15 to-transparent opacity-85 transition group-hover:opacity-95" />
                <figcaption className="absolute inset-x-0 bottom-0 p-7 text-ivory">
                  <p className="text-[0.6rem] uppercase tracking-[0.3em] text-gold-light">
                    {item.subtitle}
                  </p>
                  <p className="mt-1.5 font-display text-2xl font-light md:text-3xl">
                    {item.title}
                  </p>
                </figcaption>
              </figure>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/gallery"
              className="inline-flex items-center gap-3 rounded-full border border-ink px-8 py-3.5 text-[0.68rem] font-semibold uppercase tracking-[0.25em] text-ink transition hover:bg-forest hover:text-ivory"
            >
              Explore Full Gallery
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ================= Guest Voices ================= */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-[1520px] px-6 lg:px-8">
          <SectionHeading
            eyebrow="Guest Chronicles"
            title="Words from"
            italic="our guests"
          />

          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <blockquote
                key={t.guest}
                className="flex flex-col justify-between rounded-3xl border border-linen bg-white p-10 shadow-[0_20px_60px_-35px_rgba(14,26,23,0.2)]"
              >
                <div>
                  <div className="flex gap-1 text-gold">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg
                        key={i}
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="m12 2 3 6.5 7 .8-5.2 4.8 1.4 7L12 17.6 5.8 21.1l1.4-7L2 9.3l7-.8z" />
                      </svg>
                    ))}
                  </div>
                  <p className="mt-6 font-display text-2xl font-light italic leading-relaxed text-ink">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                </div>
                <footer className="mt-8 border-t border-sand pt-6">
                  <p className="text-sm font-semibold text-ink">{t.guest}</p>
                  <p className="mt-1 text-[0.68rem] uppercase tracking-[0.22em] text-muted">
                    {t.origin}
                  </p>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* ================= AI Concierge Invitation Banner ================= */}
      <section className="px-6 pb-12 lg:px-8">
        <div className="relative mx-auto max-w-[1520px] overflow-hidden rounded-[2.25rem] bg-forest px-8 py-12 text-ivory shadow-[0_35px_90px_-30px_rgba(14,26,23,0.55)] md:px-14 md:py-14">
          <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-gold/15 blur-3xl" />
          <div className="relative flex flex-col items-start justify-between gap-10 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <span className="eyebrow">Aurelia &middot; AI Concierge</span>
              <h2 className="mt-5 font-display text-4xl font-light leading-tight md:text-5xl">
                Prefer a <em className="italic text-gold-light">conversational</em>{" "}
                reservation?
              </h2>
              <p className="mt-4 text-sm leading-7 text-ivory/75 md:text-base">
                Tell Aurelia your dates and guest count in natural language.
                She checks real-time PostgreSQL suite inventory, calculates exact
                stay totals, and confirms your booking in moments.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                onClick={() => openConciergeWithPrompt()}
                className="btn-gold rounded-full px-9 py-4"
              >
                Converse with Aurelia
              </button>
              <button
                type="button"
                onClick={() =>
                  openConciergeWithPrompt("Plan a romantic date night poolside getaway")
                }
                className="rounded-full border border-ivory/30 px-7 py-4 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-ivory transition hover:border-gold hover:text-gold-light"
              >
                Poolside &amp; Date Nights
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= Booking ================= */}
      <section id="booking" className="relative bg-sand/60 py-16 md:py-20">
        <div className="mx-auto max-w-[1520px] px-6 lg:px-8">
          <SectionHeading
            eyebrow="Reservations Desk"
            title="Reserve your"
            italic="stay"
            copy="Complete your details below. Availability is verified live against our database before your reservation is confirmed."
          />

          <div className="mt-10 overflow-hidden rounded-[2rem] bg-white shadow-[0_40px_100px_-40px_rgba(14,26,23,0.35)] lg:grid lg:grid-cols-5">
            {/* Visual / summary panel */}
            <aside className="relative min-h-[320px] lg:col-span-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  selectedRoom
                    ? roomImage(selectedRoom, selectedRoomIndex)
                    : BOOKING_IMAGE
                }
                alt={selectedRoom?.room_name ?? "Resort at dusk"}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/20" />

              <div className="relative flex h-full flex-col justify-end p-8 text-ivory md:p-10">
                <span className="text-[0.6rem] uppercase tracking-[0.35em] text-gold-light">
                  Your stay
                </span>
                <h3 className="mt-3 font-display text-4xl font-light">
                  {selectedRoom?.room_name ?? "Select a suite"}
                </h3>

                <dl className="mt-8 space-y-4 border-t border-ivory/15 pt-6 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-ivory/60">Check-in</dt>
                    <dd>{formatDate(checkIn)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ivory/60">Check-out</dt>
                    <dd>{formatDate(checkOut)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ivory/60">Guests</dt>
                    <dd>{guests}</dd>
                  </div>
                  {selectedRoom && nights > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-ivory/60">
                        {formatPrice(Number(selectedRoom.price_per_night))} ×{" "}
                        {nights} night{nights > 1 ? "s" : ""}
                      </dt>
                      <dd>{formatPrice(estimatedTotal)}</dd>
                    </div>
                  )}
                </dl>

                <div className="mt-6 flex items-end justify-between border-t border-ivory/15 pt-6">
                  <span className="text-[0.62rem] uppercase tracking-[0.3em] text-ivory/60">
                    Estimated total
                  </span>
                  <span className="font-display text-4xl text-gold-light">
                    {estimatedTotal > 0 ? formatPrice(estimatedTotal) : "—"}
                  </span>
                </div>
              </div>
            </aside>

            {/* Form panel */}
            <div className="p-8 md:p-14 lg:col-span-3">
              {bookingSuccess ? (
                <div className="flex h-full flex-col items-center justify-center py-8 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border border-gold text-gold">
                    <svg
                      width="34"
                      height="34"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.3"
                    >
                      <path d="m5 12.5 4.5 4.5L19 7.5" />
                    </svg>
                  </div>
                  <span className="eyebrow mt-8">Reservation confirmed</span>
                  <h3 className="mt-4 font-display text-5xl font-light">
                    Thank you,{" "}
                    <em className="italic text-gold">
                      {bookingSuccess.guest_name.split(" ")[0]}
                    </em>
                  </h3>
                  <p className="mt-4 max-w-md text-sm leading-7 text-muted">
                    Your reservation has been created. A confirmation will be
                    sent to{" "}
                    <span className="text-ink">
                      {bookingSuccess.guest_email}
                    </span>
                    .
                  </p>

                  <div className="mt-10 w-full max-w-md divide-y divide-sand rounded-2xl border border-sand text-left text-sm">
                    {[
                      ["Booking ID", `#${bookingSuccess.id}`],
                      [
                        "Suite",
                        rooms.find((r) => r.id === bookingSuccess.room_id)
                          ?.room_name ?? "—",
                      ],
                      ["Check-in", formatDate(bookingSuccess.check_in)],
                      ["Check-out", formatDate(bookingSuccess.check_out)],
                      ["Guests", String(bookingSuccess.guests)],
                      ["Status", bookingSuccess.status],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="flex justify-between px-6 py-4"
                      >
                        <span className="text-muted">{label}</span>
                        <span className="font-medium capitalize">{value}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between bg-ivory px-6 py-5">
                      <span className="text-[0.62rem] uppercase tracking-[0.3em] text-muted">
                        Total
                      </span>
                      <span className="font-display text-3xl">
                        {formatPrice(Number(bookingSuccess.total_amount))}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={resetBookingForm}
                    className="btn-gold mt-10 rounded-full px-10 py-4"
                  >
                    Make another booking
                  </button>
                </div>
              ) : (
                <form onSubmit={handleBooking} className="space-y-9">
                  <div>
                    <label className="field-label" htmlFor="room">
                      Suite
                    </label>
                    <select
                      id="room"
                      value={selectedRoomId}
                      onChange={(event) => {
                        setSelectedRoomId(event.target.value);
                        setGuests("1");
                        setBookingError("");
                        resetAvailability();
                      }}
                      required
                      className="field cursor-pointer"
                    >
                      <option value="">Choose a suite</option>
                      {rooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.room_name} —{" "}
                          {formatPrice(Number(room.price_per_night))} / night
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 gap-9 md:grid-cols-2">
                    <div>
                      <label className="field-label" htmlFor="name">
                        Full name
                      </label>
                      <input
                        id="name"
                        type="text"
                        value={guestName}
                        onChange={(event) => setGuestName(event.target.value)}
                        minLength={2}
                        maxLength={150}
                        placeholder="Your full name"
                        required
                        className="field"
                      />
                    </div>
                    <div>
                      <label className="field-label" htmlFor="email">
                        Email address
                      </label>
                      <input
                        id="email"
                        type="email"
                        value={guestEmail}
                        onChange={(event) => setGuestEmail(event.target.value)}
                        maxLength={150}
                        placeholder="you@example.com"
                        required
                        className="field"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-9 md:grid-cols-3">
                    <div>
                      <label className="field-label" htmlFor="checkin">
                        Check-in
                      </label>
                      <input
                        id="checkin"
                        type="date"
                        value={checkIn}
                        min={today}
                        required
                        onChange={(event) => {
                          setCheckIn(event.target.value);
                          resetAvailability();
                        }}
                        className="field"
                      />
                    </div>
                    <div>
                      <label className="field-label" htmlFor="checkout">
                        Check-out
                      </label>
                      <input
                        id="checkout"
                        type="date"
                        value={checkOut}
                        min={checkIn || today}
                        required
                        onChange={(event) => {
                          setCheckOut(event.target.value);
                          resetAvailability();
                        }}
                        className="field"
                      />
                    </div>
                    <div>
                      <label className="field-label" htmlFor="guests">
                        Guests
                      </label>
                      <input
                        id="guests"
                        type="number"
                        min={1}
                        max={selectedRoom?.max_guests ?? 20}
                        value={guests}
                        required
                        onChange={(event) => {
                          setGuests(event.target.value);
                          resetAvailability();
                        }}
                        className="field"
                      />
                      {selectedRoom && (
                        <p className="mt-2 text-xs text-muted">
                          Maximum {selectedRoom.max_guests} guests
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={checkAvailability}
                    disabled={
                      checkingAvailability ||
                      !selectedRoomId ||
                      !checkIn ||
                      !checkOut ||
                      Number(guests) < 1
                    }
                    className="flex w-full items-center justify-center gap-3 rounded-full border border-ink py-4 text-[0.7rem] font-semibold uppercase tracking-[0.25em] transition hover:bg-ink hover:text-ivory disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink"
                  >
                    {checkingAvailability && (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    )}
                    {checkingAvailability
                      ? "Checking availability"
                      : "Check availability"}
                  </button>

                  {availability && (
                    <div
                      className={`flex items-start gap-4 rounded-2xl border p-5 text-sm ${
                        availability.available
                          ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
                          : "border-red-200 bg-red-50/70 text-red-900"
                      }`}
                    >
                      <span
                        className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                          availability.available
                            ? "bg-emerald-500"
                            : "bg-red-500"
                        }`}
                      />
                      <div>
                        <p className="font-semibold">{availability.message}</p>
                        <p className="mt-1 opacity-80">
                          {availability.available_rooms} of{" "}
                          {availability.total_rooms} suites available for your
                          dates
                        </p>
                      </div>
                    </div>
                  )}

                  {availabilityError && (
                    <p className="rounded-2xl border border-red-200 bg-red-50/70 p-5 text-sm text-red-800">
                      {availabilityError}
                    </p>
                  )}

                  {bookingError && (
                    <p className="rounded-2xl border border-red-200 bg-red-50/70 p-5 text-sm text-red-800">
                      {bookingError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={!canConfirm}
                    className="btn-gold w-full rounded-full py-5"
                  >
                    {submitting
                      ? "Processing reservation…"
                      : "Confirm reservation"}
                  </button>

                  <p className="flex items-center justify-center gap-2 text-center text-xs text-muted">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <rect x="4" y="10" width="16" height="11" rx="2" />
                      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                    </svg>
                    Demo booking only — payment integration coming soon.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ================= Footer ================= */}
      <Footer
        location={resort?.location ?? "Goa, India"}
        onOpenConcierge={() => openConciergeWithPrompt()}
      />

      {/* ================= Suite Detail Quick-View Modal ================= */}
      {detailRoom && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setDetailRoom(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/75 p-4 backdrop-blur-md"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-rise relative grid max-h-[90svh] w-full max-w-4xl overflow-hidden rounded-[2rem] border border-gold/30 bg-ivory shadow-2xl md:grid-cols-2"
          >
            <button
              type="button"
              onClick={() => setDetailRoom(null)}
              aria-label="Close suite details"
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-ink/70 text-ivory backdrop-blur transition hover:bg-gold"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>

            <div className="relative min-h-[260px] md:min-h-[480px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={roomImage(detailRoom.room, detailRoom.index)}
                alt={detailRoom.room.room_name}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/65 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 text-ivory">
                <p className="text-[0.6rem] uppercase tracking-[0.3em] text-gold-light">
                  Nightly Rate
                </p>
                <p className="font-display text-4xl">
                  {formatPrice(Number(detailRoom.room.price_per_night))}
                  <span className="text-sm text-ivory/75"> / night</span>
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-between overflow-y-auto p-8 md:p-10">
              <div>
                <span className="eyebrow">Signature Suite</span>
                <h3 className="mt-4 font-display text-4xl font-light text-ink">
                  {detailRoom.room.room_name}
                </h3>
                <p className="mt-4 text-sm leading-7 text-muted">
                  {detailRoom.room.description}
                </p>

                <div className="mt-6 grid grid-cols-2 gap-4 border-y border-linen py-5 text-xs">
                  <div>
                    <p className="uppercase tracking-[0.2em] text-muted">
                      Occupancy
                    </p>
                    <p className="mt-1 text-sm font-semibold text-ink">
                      Up to {detailRoom.room.max_guests} Guests
                    </p>
                  </div>
                  <div>
                    <p className="uppercase tracking-[0.2em] text-muted">
                      Inventory
                    </p>
                    <p className="mt-1 text-sm font-semibold text-ink">
                      {detailRoom.room.total_rooms} Private Suites
                    </p>
                  </div>
                </div>

                <ul className="mt-6 space-y-2.5 text-xs text-ink/80">
                  {[
                    "24/7 Personal Butler & In-Suite Dining",
                    "Private Terrace & Handcrafted Botanical Bath",
                    "Complimentary Breakfast & Airport Transfer",
                  ].map((perk) => (
                    <li key={perk} className="flex items-center gap-2.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                      {perk}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 space-y-3">
                <button
                  type="button"
                  onClick={() => selectRoomForBooking(detailRoom.room)}
                  className="btn-gold w-full rounded-full py-4"
                >
                  Reserve This Suite
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const name = detailRoom.room.room_name;
                    setDetailRoom(null);
                    openConciergeWithPrompt(`Select ${name}`);
                  }}
                  className="w-full rounded-full border border-ink/25 py-3.5 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-ink transition hover:border-gold hover:bg-forest hover:text-ivory"
                >
                  Ask Aurelia About This Suite
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= AI Concierge Floating Widget ================= */}
      <ConciergeWidget
        open={conciergeOpen}
        onOpenChange={setConciergeOpen}
        initialPrompt={conciergePrompt}
        onClearInitialPrompt={() => setConciergePrompt(null)}
        apiUrl={API_URL}
      />
    </main>
  );
}
