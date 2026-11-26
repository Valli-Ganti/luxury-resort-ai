"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ConciergeWidget from "@/components/ConciergeWidget";
import Footer from "@/components/Footer";

interface GalleryItem {
  id: number;
  title: string;
  subtitle: string;
  category: "Pools & Coast" | "Suites & Villas" | "Dining" | "Spa & Wellness";
  image: string;
  aspect: string;
}

const IMG = (id: string, w = 1600) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 1,
    title: "Infinity Horizon Pool",
    subtitle: "Sunset Aperitifs · Arabian Sea",
    category: "Pools & Coast",
    image: IMG("photo-1571003123894-1f0594d2b5d9", 1600),
    aspect: "md:col-span-2 h-[380px]",
  },
  {
    id: 2,
    title: "Oceanfront Pool Villa",
    subtitle: "Private Plunge & Teak Deck",
    category: "Suites & Villas",
    image: IMG("photo-1582719508461-905c673771fd", 1400),
    aspect: "h-[380px]",
  },
  {
    id: 3,
    title: "Barefoot Coastal Dining",
    subtitle: "Chef's Seven-Course Tasting",
    category: "Dining",
    image: IMG("photo-1514933651103-005eec06c04b", 1400),
    aspect: "h-[340px]",
  },
  {
    id: 4,
    title: "Ayurvedic Spa Pavilion",
    subtitle: "Botanical Rituals & Sound Bath",
    category: "Spa & Wellness",
    image: IMG("photo-1540555700478-4be289fbecef", 1400),
    aspect: "h-[340px]",
  },
  {
    id: 5,
    title: "Private Palm Terraces",
    subtitle: "Morning Espresso Over the Surf",
    category: "Pools & Coast",
    image: IMG("photo-1499793983690-e29da59ef1c2", 1400),
    aspect: "h-[340px]",
  },
  {
    id: 6,
    title: "Sanctuary Master Suite",
    subtitle: "Handcrafted Linen & Ocean Breeze",
    category: "Suites & Villas",
    image: IMG("photo-1590490360182-c33d57733427", 1400),
    aspect: "h-[360px]",
  },
  {
    id: 7,
    title: "Twilight Lagoon Deck",
    subtitle: "Lantern-Lit Evenings by the Water",
    category: "Pools & Coast",
    image: IMG("photo-1540541338287-41700207dee6", 1600),
    aspect: "md:col-span-2 h-[360px]",
  },
  {
    id: 8,
    title: "Candlelit Date Night",
    subtitle: "Private Beachfront Cabana",
    category: "Dining",
    image: IMG("photo-1414235077428-338989a2e8c0", 1400),
    aspect: "h-[340px]",
  },
  {
    id: 9,
    title: "Garden Courtyard Villa",
    subtitle: "Secluded Tropical Serenity",
    category: "Suites & Villas",
    image: IMG("photo-1611892440504-42a792e24d32", 1400),
    aspect: "h-[340px]",
  },
  {
    id: 10,
    title: "Thermal Stone Rituals",
    subtitle: "Holistic Restoration Suite",
    category: "Spa & Wellness",
    image: IMG("photo-1544161515-4ab6ce6db874", 1400),
    aspect: "h-[340px]",
  },
  {
    id: 11,
    title: "Penthouse Horizon Lounge",
    subtitle: "Panoramic Coastal Vistas",
    category: "Suites & Villas",
    image: IMG("photo-1578683010236-d716f9a3f461", 1600),
    aspect: "md:col-span-2 h-[360px]",
  },
  {
    id: 12,
    title: "Palm-Lined Sanctuary Pool",
    subtitle: "Unhurried Afternoons in Goa",
    category: "Pools & Coast",
    image: IMG("photo-1571896349842-33c89424de2d", 1400),
    aspect: "h-[360px]",
  },
];

const CATEGORIES = [
  "All",
  "Pools & Coast",
  "Suites & Villas",
  "Dining",
  "Spa & Wellness",
] as const;

const NAV_LINKS = [
  { href: "/#about", label: "The Resort" },
  { href: "/#amenities", label: "Experiences" },
  { href: "/#rooms", label: "Suites" },
  { href: "/gallery", label: "Gallery" },
  { href: "/#booking", label: "Reservations" },
];

export default function GalleryPage() {
  const [activeCategory, setActiveCategory] =
    useState<(typeof CATEGORIES)[number]>("All");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [conciergeOpen, setConciergeOpen] = useState(false);

  const filtered =
    activeCategory === "All"
      ? GALLERY_ITEMS
      : GALLERY_ITEMS.filter((item) => item.category === activeCategory);

  useEffect(() => {
    if (lightboxIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowRight") {
        setLightboxIndex((prev) =>
          prev === null ? null : (prev + 1) % filtered.length
        );
      }
      if (e.key === "ArrowLeft") {
        setLightboxIndex((prev) =>
          prev === null ? null : (prev - 1 + filtered.length) % filtered.length
        );
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, filtered.length]);

  const activePhoto =
    lightboxIndex !== null ? filtered[lightboxIndex] ?? null : null;

  return (
    <main className="min-h-screen bg-ivory text-ink">
      {/* ================= Navigation ================= */}
      <header className="sticky top-0 z-40 border-b border-linen/70 bg-ivory/90 py-4 backdrop-blur-xl shadow-[0_8px_30px_-18px_rgba(14,26,23,0.15)]">
        <nav className="mx-auto flex max-w-[1520px] items-center justify-between gap-8 px-5 lg:px-8">
          <Link href="/" className="group flex shrink-0 flex-col leading-none">
            <span className="whitespace-nowrap font-display text-xl tracking-[0.22em] text-ink xl:text-2xl">
              AZURE ESCAPE
            </span>
            <span className="mt-1 whitespace-nowrap text-[0.55rem] tracking-[0.48em] text-gold">
              RESORTS &middot; GOA
            </span>
          </Link>

          <div className="hidden items-center gap-5 lg:flex xl:gap-7">
            {NAV_LINKS.map((link) => {
              const isGallery = link.href === "/gallery";
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative whitespace-nowrap text-[0.66rem] font-medium uppercase tracking-[0.22em] transition-colors after:absolute after:-bottom-1.5 after:left-0 after:h-px after:bg-gold after:transition-all ${
                    isGallery
                      ? "text-ink after:w-full"
                      : "text-ink/75 hover:text-ink after:w-0 hover:after:w-full"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link
              href="/#booking"
              className="btn-gold shrink-0 whitespace-nowrap rounded-full px-6 py-3"
            >
              Book Stay
            </Link>
          </div>
        </nav>
      </header>

      {/* ================= Gallery Hero ================= */}
      <section className="relative overflow-hidden bg-forest py-16 text-ivory md:py-20">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-gold/15 blur-3xl" />
        <div className="relative mx-auto max-w-[1520px] px-6 text-center lg:px-8">
          <span className="eyebrow">Visual Sanctuary</span>
          <h1 className="mt-5 font-display text-5xl font-light leading-tight md:text-7xl">
            Life at <em className="italic text-gold-light">Azure Escape</em>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-8 text-ivory/75 md:text-base">
            Explore sun-drenched infinity pools, secluded oceanfront villas,
            candlelit coastal dining, and botanical spa rituals across our Goa
            sanctuary.
          </p>
        </div>
      </section>

      {/* ================= Filter Bar & Grid ================= */}
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-[1520px] px-6 lg:px-8">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {CATEGORIES.map((category) => {
              const active = activeCategory === category;
              const count =
                category === "All"
                  ? GALLERY_ITEMS.length
                  : GALLERY_ITEMS.filter((i) => i.category === category).length;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => {
                    setActiveCategory(category);
                    setLightboxIndex(null);
                  }}
                  className={`rounded-full px-5 py-2.5 text-[0.68rem] font-semibold uppercase tracking-[0.22em] transition ${
                    active
                      ? "bg-forest text-gold-light shadow-md"
                      : "border border-linen bg-white text-ink/80 hover:border-gold hover:text-ink"
                  }`}
                >
                  {category}{" "}
                  <span className="ml-1 opacity-60">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Photo Grid */}
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {filtered.map((item, idx) => (
              <figure
                key={item.id}
                onClick={() => setLightboxIndex(idx)}
                className={`group relative cursor-pointer overflow-hidden rounded-3xl bg-sand shadow-[0_20px_50px_-30px_rgba(14,26,23,0.3)] ${
                  activeCategory === "All" ? item.aspect : "h-[340px]"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-full w-full object-cover transition duration-[1.5s] group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent opacity-80 transition group-hover:opacity-95" />
                <span className="absolute left-5 top-5 rounded-full bg-ivory/90 px-3.5 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.22em] text-ink backdrop-blur">
                  {item.category}
                </span>
                <figcaption className="absolute inset-x-0 bottom-0 p-6 text-ivory">
                  <p className="text-[0.6rem] uppercase tracking-[0.28em] text-gold-light">
                    {item.subtitle}
                  </p>
                  <p className="mt-1 font-display text-2xl font-light md:text-3xl">
                    {item.title}
                  </p>
                </figcaption>
              </figure>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="mt-14 flex flex-col items-center justify-between gap-6 rounded-3xl border border-linen bg-white p-8 text-center md:flex-row md:px-12 md:text-left">
            <div>
              <span className="eyebrow">Your Private Escape</span>
              <h2 className="mt-3 font-display text-3xl font-light text-ink md:text-4xl">
                Ready to experience Azure Escape in person?
              </h2>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/#booking"
                className="btn-gold rounded-full px-8 py-4"
              >
                Reserve Your Stay
              </Link>
              <Link
                href="/"
                className="rounded-full border border-ink/25 px-7 py-4 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-ink transition hover:border-gold hover:bg-forest hover:text-ivory"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= Footer ================= */}
      <Footer onOpenConcierge={() => setConciergeOpen(true)} />

      {/* ================= Full-Screen Lightbox ================= */}
      {activePhoto && lightboxIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxIndex(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/92 p-4 backdrop-blur-lg md:p-8"
        >
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            aria-label="Close lightbox"
            className="absolute right-6 top-6 flex h-11 w-11 items-center justify-center rounded-full border border-ivory/25 bg-ink/60 text-ivory transition hover:border-gold hover:text-gold-light"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex(
                (lightboxIndex - 1 + filtered.length) % filtered.length
              );
            }}
            aria-label="Previous photo"
            className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-ivory/25 bg-ink/60 text-ivory transition hover:border-gold hover:text-gold-light md:left-8"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-5xl overflow-hidden rounded-3xl border border-gold/30 bg-ink shadow-2xl"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activePhoto.image}
              alt={activePhoto.title}
              className="max-h-[75svh] w-full object-contain bg-black/40"
            />
            <div className="flex items-center justify-between gap-4 px-6 py-5 text-ivory">
              <div>
                <p className="text-[0.6rem] uppercase tracking-[0.28em] text-gold-light">
                  {activePhoto.category} &middot; {activePhoto.subtitle}
                </p>
                <p className="mt-1 font-display text-2xl font-light">
                  {activePhoto.title}
                </p>
              </div>
              <span className="text-xs tracking-[0.2em] text-ivory/55">
                {String(lightboxIndex + 1).padStart(2, "0")} /{" "}
                {String(filtered.length).padStart(2, "0")}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((lightboxIndex + 1) % filtered.length);
            }}
            aria-label="Next photo"
            className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-ivory/25 bg-ink/60 text-ivory transition hover:border-gold hover:text-gold-light md:right-8"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      )}

      {/* ================= AI Concierge Widget ================= */}
      <ConciergeWidget
        open={conciergeOpen}
        onOpenChange={setConciergeOpen}
      />
    </main>
  );
}
