"use client";

import Link from "next/link";
import { useState } from "react";

interface FooterProps {
  location?: string;
  onOpenConcierge?: () => void;
}

const EXPLORE_LINKS = [
  { href: "/#about", label: "The Resort" },
  { href: "/#amenities", label: "Experiences" },
  { href: "/#rooms", label: "Suites & Villas" },
  { href: "/gallery", label: "Visual Gallery" },
  { href: "/#booking", label: "Reservations Desk" },
];

const GUEST_SERVICES = [
  "Check-in 2:00 PM · Check-out 11:00 AM",
  "24/7 Personal Butler Service",
  "Private Chauffeur Airport Transfers",
  "Poolside & Candlelit Date Nights",
  "Ayurvedic Spa & Wellness Rituals",
];

export default function Footer({
  location = "Goa, India",
  onOpenConcierge,
}: FooterProps) {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  function handleSubscribe(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    setEmail("");
  }

  return (
    <footer className="relative overflow-hidden bg-ink text-ivory">
      {/* Ambient gold glow */}
      <div className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-gold/10 blur-3xl" />

      <div className="relative mx-auto max-w-[1520px] px-6 lg:px-8">
        {/* Top Newsletter / Private Journal Strip */}
        <div className="grid items-center gap-8 border-b border-ivory/10 py-12 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <span className="eyebrow">The Azure Journal</span>
            <h3 className="mt-3 font-display text-3xl font-light text-ivory md:text-4xl">
              Private invitations &amp;{" "}
              <em className="italic text-gold-light">seasonal escapes</em>
            </h3>
            <p className="mt-2 max-w-lg text-sm text-ivory/60">
              Be the first to receive curated culinary previews, monsoon spa
              retreats, and members-only suite privileges.
            </p>
          </div>

          <div className="lg:col-span-6">
            {subscribed ? (
              <div className="flex items-center gap-3 rounded-2xl border border-gold/40 bg-forest/70 px-6 py-4 text-sm text-gold-light">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="m5 12.5 4.5 4.5L19 7.5" />
                </svg>
                Thank you — you have been added to the Azure Escape private
                guest list.
              </div>
            ) : (
              <form
                onSubmit={handleSubscribe}
                className="flex flex-col gap-3 sm:flex-row sm:items-center"
              >
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="flex-1 rounded-full border border-ivory/20 bg-ivory/5 px-6 py-3.5 text-sm text-ivory outline-none transition placeholder:text-ivory/40 focus:border-gold"
                />
                <button
                  type="submit"
                  className="btn-gold shrink-0 rounded-full px-8 py-4"
                >
                  Subscribe
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Main 5-Column Architectural Grid */}
        <div className="grid gap-12 py-14 md:grid-cols-2 lg:grid-cols-12">
          {/* Brand Column */}
          <div className="lg:col-span-4">
            <Link href="/" className="inline-block">
              <p className="font-display text-3xl tracking-[0.26em] text-ivory">
                AZURE ESCAPE
              </p>
              <p className="mt-1.5 text-[0.6rem] tracking-[0.52em] text-gold">
                RESORTS &middot; GOA
              </p>
            </Link>

            <p className="mt-5 max-w-sm text-sm leading-7 text-ivory/60">
              A five-star coastal sanctuary where timeless architecture meets
              the Arabian Sea. Designed for unhurried mornings, restorative
              rituals, and unforgettable stays.
            </p>

            {/* Distinctions */}
            <div className="mt-6 flex flex-wrap gap-2">
              {["Forbes Five-Star", "Michelin Key", "Condé Nast Gold"].map(
                (award) => (
                  <span
                    key={award}
                    className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[0.58rem] uppercase tracking-[0.2em] text-gold-light"
                  >
                    {award}
                  </span>
                )
              )}
            </div>

            {/* Social Icons */}
            <div className="mt-6 flex items-center gap-3">
              {[
                {
                  label: "Instagram",
                  path: "M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm5 5.5A3.5 3.5 0 1 0 15.5 12 3.5 3.5 0 0 0 12 8.5zm5.2-2.2a.8.8 0 1 0 .8.8.8.8 0 0 0-.8-.8z",
                },
                {
                  label: "Facebook",
                  path: "M14 9h3V5h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V9a1 1 0 0 1 1-1z",
                },
                {
                  label: "YouTube",
                  path: "M21.5 8.2a2.7 2.7 0 0 0-1.9-1.9C17.9 5.8 12 5.8 12 5.8s-5.9 0-7.6.5a2.7 2.7 0 0 0-1.9 1.9C2 9.9 2 12 2 12s0 2.1.5 3.8a2.7 2.7 0 0 0 1.9 1.9c1.7.5 7.6.5 7.6.5s5.9 0 7.6-.5a2.7 2.7 0 0 0 1.9-1.9C22 14.1 22 12 22 12s0-2.1-.5-3.8zM10 15V9l5 3-5 3z",
                },
              ].map((social) => (
                <a
                  key={social.label}
                  href="#home"
                  aria-label={social.label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-ivory/20 text-ivory/70 transition hover:border-gold hover:bg-gold/15 hover:text-gold-light"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={social.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Explore Column */}
          <div className="lg:col-span-2">
            <p className="text-[0.64rem] font-semibold uppercase tracking-[0.32em] text-gold">
              Explore
            </p>
            <ul className="mt-5 space-y-3 text-sm text-ivory/70">
              {EXPLORE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="transition hover:text-gold-light"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              {onOpenConcierge && (
                <li>
                  <button
                    type="button"
                    onClick={onOpenConcierge}
                    className="text-left text-gold-light transition hover:underline"
                  >
                    Speak with Aurelia (AI)
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Guest Services Column */}
          <div className="lg:col-span-3">
            <p className="text-[0.64rem] font-semibold uppercase tracking-[0.32em] text-gold">
              Guest Services
            </p>
            <ul className="mt-5 space-y-3 text-sm text-ivory/70">
              {GUEST_SERVICES.map((service) => (
                <li key={service} className="flex items-start gap-2.5">
                  <span className="mt-2 h-1 w-1 shrink-0 rotate-45 bg-gold" />
                  <span>{service}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & Sanctuary Location Column */}
          <div className="lg:col-span-3">
            <p className="text-[0.64rem] font-semibold uppercase tracking-[0.32em] text-gold">
              Sanctuary &amp; Contact
            </p>
            <ul className="mt-5 space-y-3.5 text-sm text-ivory/70">
              <li>
                <span className="block text-[0.6rem] uppercase tracking-[0.22em] text-ivory/40">
                  Address
                </span>
                Candolim Beachfront Road, North {location}
              </li>
              <li>
                <span className="block text-[0.6rem] uppercase tracking-[0.22em] text-ivory/40">
                  24/7 Reservations
                </span>
                +91 832 248 9000
              </li>
              <li>
                <span className="block text-[0.6rem] uppercase tracking-[0.22em] text-ivory/40">
                  Concierge Desk
                </span>
                reservations@azureescape.com
              </li>
              <li className="pt-1">
                <span className="inline-flex items-center gap-2 rounded-full border border-ivory/15 bg-ivory/5 px-3.5 py-1.5 text-[0.65rem] tracking-[0.18em] text-gold-light">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  15.5181° N, 73.7626° E
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Legal & Signature Bar */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-ivory/10 py-7 text-xs text-ivory/45 md:flex-row">
          <p>© 2026 Azure Escape Resorts. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <a href="#home" className="transition hover:text-gold-light">
              Privacy Policy
            </a>
            <a href="#home" className="transition hover:text-gold-light">
              Terms of Stay
            </a>
            <a href="#home" className="transition hover:text-gold-light">
              Cancellation Policy
            </a>
            <a href="#home" className="transition hover:text-gold-light">
              Sustainability
            </a>
          </div>
          <p className="tracking-[0.22em] text-gold/80">
            CRAFTED FOR UNHURRIED LIVING
          </p>
        </div>
      </div>
    </footer>
  );
}
