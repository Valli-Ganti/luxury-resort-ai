import json
import os
import re
import urllib.error
import urllib.request
from datetime import date, timedelta
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.chat_history import ChatHistory
from app.services.booking_service import (
    BookingValidationError,
    check_availability_for_room,
    create_verified_booking,
    find_available_rooms,
    list_active_rooms,
)

MONTHS = {
    "jan": 1, "january": 1,
    "feb": 2, "february": 2,
    "mar": 3, "march": 3,
    "apr": 4, "april": 4,
    "may": 5,
    "jun": 6, "june": 6,
    "jul": 7, "july": 7,
    "aug": 8, "august": 8,
    "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "october": 10,
    "nov": 11, "november": 11,
    "dec": 12, "december": 12,
}

AMENITIES_TEXT = (
    "At Azure Escape Resorts in Goa, you'll enjoy our Private Swimming Pool, "
    "direct Beach Access, Luxury Spa, Fine Dining, complimentary high-speed WiFi, "
    "and seamless Airport Transfers — all supported by 24/7 butler service."
)

PREFERENCE_CATALOG: list[tuple[str, tuple[str, ...], tuple[str, ...]]] = [
    (
        "Poolside",
        ("poolside", "pool side", "private pool", "by the pool", "near pool", "plunge pool"),
        ("pool", "villa", "plunge", "water"),
    ),
    (
        "Romantic Date Night",
        ("date night", "date nights", "romantic", "honeymoon", "anniversary", "candlelight", "candlelit", "couple"),
        ("ocean", "pool", "villa", "luxury", "suite", "sunset"),
    ),
    (
        "Family Retreat",
        ("family", "kids", "children", "group stay", "friends"),
        ("family", "villa", "penthouse", "suite", "duplex"),
    ),
    (
        "Spa & Wellness",
        ("spa", "wellness", "ayurved", "massage", "relax"),
        ("spa", "garden", "sanctuary", "villa"),
    ),
    (
        "Private Dining",
        ("private dining", "beach dining", "fine dining", "dinner"),
        ("villa", "suite", "beach", "ocean"),
    ),
]

NON_NAME_WORDS = {
    "yes", "no", "confirm", "cancel", "ok", "okay", "sure", "hi", "hello", "hey",
    "thanks", "thank", "modify", "change", "edit", "suite", "suites", "room", "rooms",
    "date", "dates", "book", "booking", "reserve", "reservation", "price", "prices",
    "available", "availability", "show", "list", "help", "tomorrow", "today",
    "weekend", "night", "nights", "day", "days", "guest", "guests", "select",
    "start", "over", "reset", "details", "amenities", "experiences", "spa", "pool",
    "poolside", "romantic", "ocean", "beachfront", "family", "dining", "check",
    "customize", "plan", "getaway", "stay",
}


def _empty_state() -> dict[str, Any]:
    return {
        "stage": "greeting",
        "check_in": None,
        "check_out": None,
        "guests": None,
        "room_id": None,
        "preferences": [],
        "guest_name": None,
        "guest_email": None,
    }


def _format_inr(amount: float) -> str:
    return f"₹{int(round(amount)):,}"


def _format_date(iso: str) -> str:
    d = date.fromisoformat(iso)
    return d.strftime("%d %b %Y")


def _extract_email(text: str) -> str | None:
    m = re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", text)
    return m.group(0) if m else None


def _extract_nights(text: str) -> int | None:
    m = re.search(r"\b(\d{1,2})\s*(?:night|nights|day|days)\b", text.lower())
    if m:
        val = int(m.group(1))
        if 1 <= val <= 60:
            return val
    return None


def _extract_preferences(text: str) -> list[str]:
    lower = text.lower()
    matched: list[str] = []
    for label, triggers, _ in PREFERENCE_CATALOG:
        if any(t in lower for t in triggers):
            matched.append(label)
    return matched


def _rank_rooms_by_preferences(
    rooms: list[dict[str, Any]],
    preferences: list[str],
) -> list[dict[str, Any]]:
    if not preferences:
        return rooms

    scored: list[tuple[int, int, dict[str, Any]]] = []
    for idx, room in enumerate(rooms):
        haystack = f"{room.get('room_name', '')} {room.get('description', '')}".lower()
        score = 0
        matched_tags: list[str] = []
        for pref in preferences:
            for label, _, room_keywords in PREFERENCE_CATALOG:
                if label == pref:
                    if any(kw in haystack for kw in room_keywords):
                        score += 2
                        matched_tags.append(label)
                    elif pref == "Family Retreat" and room.get("max_guests", 1) >= 4:
                        score += 2
                        matched_tags.append(label)
        enriched = dict(room)
        if matched_tags:
            enriched["match_tag"] = f"Great for {matched_tags[0]}"
        elif preferences:
            enriched["match_tag"] = f"{preferences[0]} ready"
        scored.append((-score, idx, enriched))

    scored.sort(key=lambda item: (item[0], item[1]))
    return [item[2] for item in scored]


def _extract_dates(
    text: str,
    existing_check_in: str | None = None,
) -> tuple[date | None, date | None]:
    today = date.today()
    lower = text.lower()
    nights = _extract_nights(lower)

    # 1. Explicit ISO dates: YYYY-MM-DD
    iso_matches = re.findall(r"\b(\d{4}-\d{2}-\d{2})\b", text)
    parsed: list[date] = []
    for raw in iso_matches:
        try:
            parsed.append(date.fromisoformat(raw))
        except ValueError:
            pass
    if len(parsed) >= 2:
        return parsed[0], parsed[1]

    # 2. Numeric dates: DD/MM/YYYY or DD-MM-YYYY
    dmy_matches = re.findall(r"\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b", text)
    for d_s, m_s, y_s in dmy_matches:
        try:
            parsed.append(date(int(y_s), int(m_s), int(d_s)))
        except ValueError:
            pass
    if len(parsed) >= 2:
        return parsed[0], parsed[1]

    # 3. Same-month range: "Dec 10 to 13", "Dec 10-13", "10 to 13 Dec", "10-13 December"
    month_pattern = "|".join(MONTHS.keys())
    m_range1 = re.search(
        rf"\b({month_pattern})\s+(\d{{1,2}})\s*(?:to|-|–|until|through)\s*(\d{{1,2}})(?:,?\s*(\d{{4}}))?\b",
        lower,
    )
    if m_range1:
        month = MONTHS[m_range1.group(1)]
        d1, d2 = int(m_range1.group(2)), int(m_range1.group(3))
        year = int(m_range1.group(4)) if m_range1.group(4) else today.year
        try:
            c1, c2 = date(year, month, d1), date(year, month, d2)
            if not m_range1.group(4) and c1 < today:
                c1, c2 = date(year + 1, month, d1), date(year + 1, month, d2)
            return c1, c2
        except ValueError:
            pass

    m_range2 = re.search(
        rf"\b(\d{{1,2}})\s*(?:to|-|–|until|through)\s*(\d{{1,2}})\s+({month_pattern})(?:,?\s*(\d{{4}}))?\b",
        lower,
    )
    if m_range2:
        d1, d2 = int(m_range2.group(1)), int(m_range2.group(2))
        month = MONTHS[m_range2.group(3)]
        year = int(m_range2.group(4)) if m_range2.group(4) else today.year
        try:
            c1, c2 = date(year, month, d1), date(year, month, d2)
            if not m_range2.group(4) and c1 < today:
                c1, c2 = date(year + 1, month, d1), date(year + 1, month, d2)
            return c1, c2
        except ValueError:
            pass

    # 4. Individual month-name dates: "Dec 12", "12 December", "Dec 12 2026"
    found: list[date] = []
    for m in re.finditer(
        rf"\b(?:({month_pattern})\s+(\d{{1,2}})|(\d{{1,2}})\s+({month_pattern}))(?:,?\s*(\d{{4}}))?\b",
        lower,
    ):
        if m.group(1):
            month = MONTHS[m.group(1)]
            day = int(m.group(2))
        else:
            day = int(m.group(3))
            month = MONTHS[m.group(4)]
        year = int(m.group(5)) if m.group(5) else today.year
        try:
            candidate = date(year, month, day)
            if not m.group(5) and candidate < today:
                candidate = date(year + 1, month, day)
            found.append(candidate)
        except ValueError:
            continue

    if len(found) >= 2:
        return found[0], found[1]

    # Single explicit date + nights
    single = found[0] if found else (parsed[0] if parsed else None)
    if single and nights:
        return single, single + timedelta(days=nights)

    # Relative phrases
    if "next weekend" in lower:
        days_until_fri = (4 - today.weekday()) % 7
        days_until_fri = days_until_fri + 7 if days_until_fri > 0 else 7
        start = today + timedelta(days=days_until_fri)
        return start, start + timedelta(days=nights or 2)

    if "this weekend" in lower or "weekend" in lower:
        days_until_fri = (4 - today.weekday()) % 7
        start = today + timedelta(days=days_until_fri)
        return start, start + timedelta(days=nights or 2)

    if "tomorrow" in lower:
        start = today + timedelta(days=1)
        return start, start + timedelta(days=nights or 2)

    if "today" in lower and nights:
        return today, today + timedelta(days=nights)

    # If check-in was already provided and user now says "5 nights" or a single checkout date
    if existing_check_in:
        ci = date.fromisoformat(existing_check_in)
        if nights:
            return ci, ci + timedelta(days=nights)
        if single and single > ci:
            return ci, single

    if single:
        return single, None

    return None, None


def _extract_guests(text: str, expecting_guests: bool = False) -> int | None:
    lower = text.lower()
    if any(w in lower for w in ("couple", "honeymoon", "two of us", "for two")):
        return 2
    if "solo" in lower or "just me" in lower or "myself" in lower:
        return 1

    m = re.search(
        r"\b(\d{1,2})\s*(?:\+?\s*)?(?:guest|guests|people|person|persons|adult|adults|traveler|travelers|pax)\b",
        lower,
    )
    if m:
        val = int(m.group(1))
        if 1 <= val <= 20:
            return val

    m2 = re.search(r"\b(?:family|group|party)\s+of\s+(\d{1,2})\b", lower)
    if m2:
        val = int(m2.group(1))
        if 1 <= val <= 20:
            return val

    m_for = re.search(r"\bfor\s+(\d{1,2})\b(?!\s*(?:night|nights|day|days))", lower)
    if m_for:
        val = int(m_for.group(1))
        if 1 <= val <= 20:
            return val

    if expecting_guests:
        m3 = re.fullmatch(r"\s*(\d{1,2})\s*", lower)
        if m3:
            val = int(m3.group(1))
            if 1 <= val <= 20:
                return val

    return None


def _extract_room_choice(text: str, rooms: list[Any]) -> int | None:
    lower = text.lower()

    m_id = re.search(r"(?:room|suite)\s*#?\s*(\d+)\b", lower)
    if m_id:
        rid = int(m_id.group(1))
        if any(r.id == rid for r in rooms):
            return rid

    for room in sorted(rooms, key=lambda r: len(r.room_name), reverse=True):
        if room.room_name.lower() in lower:
            return room.id

    best_match: tuple[int, int] | None = None
    for room in rooms:
        tokens = [
            t for t in re.split(r"\W+", room.room_name.lower())
            if len(t) >= 4 and t not in {"room", "suite", "villa", "with", "pool"}
        ]
        hits = sum(1 for t in tokens if t in lower)
        if hits >= 2 or (
            len(tokens) == 1
            and hits == 1
            and any(k in lower for k in ("select", "choose", "book", "want", "suite", "room", "villa"))
        ):
            if best_match is None or hits > best_match[1]:
                best_match = (room.id, hits)
    return best_match[0] if best_match else None


def _extract_name(text: str, email: str | None) -> str | None:
    cleaned = text
    if email:
        cleaned = cleaned.replace(email, "")
    cleaned = re.sub(
        r"(?i)\b(my name is|i am|i'm|name:|email:|guest:|book under|under the name)\b",
        "",
        cleaned,
    )
    cleaned = re.sub(r"[,;|\-:]+", " ", cleaned).strip()
    words = [w for w in cleaned.split() if re.fullmatch(r"[A-Za-z][A-Za-z'.-]*", w)]
    if not (1 <= len(words) <= 5):
        return None
    if any(w.lower() in NON_NAME_WORDS for w in words):
        return None
    candidate = " ".join(words)
    if len(candidate) >= 2:
        return candidate.title()
    return None


def _optional_llm_polish(
    base_reply: str,
    user_message: str,
    facts_context: dict[str, Any],
) -> str:
    openai_key = os.getenv("OPENAI_API_KEY", "").strip()
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not openai_key and not gemini_key:
        return base_reply

    system_prompt = (
        "You are Aurelia, the personal AI Concierge for Azure Escape Resorts, a five-star "
        "luxury beachfront sanctuary in Goa, India. Rewrite the draft response below to sound "
        "warm, gracious, concise (2-4 sentences max), and effortlessly five-star. "
        "CRITICAL RULE: Never invent, alter, or omit any room names, dates, prices, "
        "availability counts, or booking IDs from the provided verified facts."
    )
    user_prompt = (
        f"Guest message: {user_message}\n"
        f"Verified database facts: {json.dumps(facts_context, default=str)}\n"
        f"Draft response to polish: {base_reply}"
    )

    try:
        if openai_key:
            payload = json.dumps({
                "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.4,
                "max_tokens": 220,
            }).encode("utf-8")
            req = urllib.request.Request(
                "https://api.openai.com/v1/chat/completions",
                data=payload,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {openai_key}",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                polished = data["choices"][0]["message"]["content"].strip()
                return polished or base_reply

        if gemini_key:
            model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
            url = (
                f"https://generativelanguage.googleapis.com/v1beta/models/"
                f"{model}:generateContent?key={gemini_key}"
            )
            payload = json.dumps({
                "contents": [
                    {"parts": [{"text": f"{system_prompt}\n\n{user_prompt}"}]}
                ],
                "generationConfig": {"temperature": 0.4, "maxOutputTokens": 220},
            }).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                polished = (
                    data["candidates"][0]["content"]["parts"][0]["text"].strip()
                )
                return polished or base_reply
    except (urllib.error.URLError, KeyError, IndexError, TimeoutError, ValueError):
        return base_reply

    return base_reply


def _load_latest_state(db: Session, session_id: str) -> dict[str, Any]:
    row = db.scalar(
        select(ChatHistory)
        .where(
            ChatHistory.session_id == session_id,
            ChatHistory.role == "assistant",
            ChatHistory.state_json.is_not(None),
        )
        .order_by(ChatHistory.id.desc())
        .limit(1)
    )
    if row and row.state_json:
        try:
            loaded = json.loads(row.state_json)
            base = _empty_state()
            base.update(loaded)
            if not isinstance(base.get("preferences"), list):
                base["preferences"] = []
            return base
        except json.JSONDecodeError:
            pass
    return _empty_state()


def _save_turn(
    db: Session,
    session_id: str,
    user_message: str,
    assistant_reply: str,
    state: dict[str, Any],
) -> None:
    db.add(ChatHistory(session_id=session_id, role="user", message=user_message))
    db.add(
        ChatHistory(
            session_id=session_id,
            role="assistant",
            message=assistant_reply,
            state_json=json.dumps(state),
        )
    )
    db.commit()


def get_session_history(db: Session, session_id: str) -> list[dict[str, Any]]:
    rows = db.scalars(
        select(ChatHistory)
        .where(ChatHistory.session_id == session_id)
        .order_by(ChatHistory.id.asc())
    ).all()
    return [
        {
            "id": r.id,
            "role": r.role,
            "message": r.message,
            "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]


def clear_session_history(db: Session, session_id: str) -> None:
    db.execute(delete(ChatHistory).where(ChatHistory.session_id == session_id))
    db.commit()


def process_chat_message(
    db: Session,
    session_id: str,
    message: str,
) -> dict[str, Any]:
    text = message.strip()
    lower = text.lower()
    state = _load_latest_state(db, session_id)
    all_rooms = list_active_rooms(db)

    chosen_room_id = _extract_room_choice(text, all_rooms)

    # Capture any stay preferences (Poolside, Romantic Date Night, Ocean View, Family, Spa, etc.)
    new_prefs = _extract_preferences(text)
    if new_prefs:
        existing_prefs: list[str] = list(state.get("preferences") or [])
        for p in new_prefs:
            if p not in existing_prefs:
                existing_prefs.append(p)
        state["preferences"] = existing_prefs

    # 1. Reset / start over intent
    if any(p in lower for p in ("start over", "reset", "new booking", "clear chat")):
        state = _empty_state()
        reply = (
            "Of course — let's begin afresh. Welcome to Azure Escape Resorts in Goa. "
            "Use the Stay Planner or tell me your preferred dates, number of guests, and vibe "
            "(such as poolside, romantic date night, or family retreat)."
        )
        _save_turn(db, session_id, text, reply, state)
        return {
            "session_id": session_id,
            "reply": reply,
            "suggestions": [
                "Customize dates & guests",
                "Show all suites & prices",
                "Plan a romantic date night",
                "Poolside getaway",
            ],
            "rooms": [],
            "booking_summary": None,
            "confirmed_booking": None,
            "stage": "greeting",
        }

    # 2. Modify intent at any stage after dates/suite were chosen
    if (
        not chosen_room_id
        and state.get("stage") in ("select_room", "collect_guest_details", "confirm_booking")
        and any(w in lower for w in ("modify", "change", "edit", "different", "cancel"))
    ):
        state["stage"] = "collect_dates"
        state["room_id"] = None
        state["check_in"] = None
        state["check_out"] = None
        reply = (
            "Certainly — I've cleared your previous selection so you can adjust your dates, "
            "number of guests, or preferences. Open the Stay Planner below or tell me your updated plans."
        )
        _save_turn(db, session_id, text, reply, state)
        return {
            "session_id": session_id,
            "reply": reply,
            "suggestions": [
                "Customize dates & guests",
                "Show all suites & prices",
                "Poolside getaway",
            ],
            "rooms": [],
            "booking_summary": None,
            "confirmed_booking": None,
            "stage": "collect_dates",
        }

    # 3. Pure amenities / Resort info inquiry (only when NOT booking/giving preferences+dates)
    if (
        not chosen_room_id
        and not _extract_dates(text, None)[0]
        and not new_prefs
        and any(
            w in lower
            for w in (
                "amenit", "experience", "experiences", "wifi", "airport",
                "location", "where are you", "facilities",
            )
        )
    ):
        reply = (
            f"{AMENITIES_TEXT} Check-in begins at 2:00 PM and check-out is at 11:00 AM. "
            "Would you like to customize your stay dates, guest count, and poolside or date-night preferences?"
        )
        _save_turn(db, session_id, text, reply, state)
        return {
            "session_id": session_id,
            "reply": reply,
            "suggestions": [
                "Customize dates & guests",
                "Show all suites & prices",
                "Plan a romantic date night",
                "Poolside getaway",
            ],
            "rooms": [],
            "booking_summary": None,
            "confirmed_booking": None,
            "stage": state.get("stage", "greeting"),
        }

    # 4. Browse all suites inquiry
    if (
        not chosen_room_id
        and any(
            w in lower
            for w in (
                "show all suites", "view suites", "explore suites", "all suites",
                "list rooms", "room prices", "all rooms", "show suites", "show rooms",
                "available suites", "what rooms", "what suites", "prices",
            )
        )
        and not _extract_dates(text, None)[0]
    ):
        cards = [
            {
                "id": r.id,
                "room_name": r.room_name,
                "description": r.description,
                "price_per_night": float(r.price_per_night),
                "max_guests": r.max_guests,
                "available_rooms": r.total_rooms,
                "image_url": r.image_url,
            }
            for r in all_rooms
        ]
        cards = _rank_rooms_by_preferences(cards, state.get("preferences") or [])
        reply = (
            f"Here is our curated collection of {len(cards)} sanctuary suites at Azure Escape Resorts. "
            "Tap any suite to select it, or use Customize Dates & Guests to pick any stay duration, guest count, and poolside or date-night preferences."
            if cards
            else "It looks like no suites are currently active in our database."
        )
        state["stage"] = "collect_dates"
        _save_turn(db, session_id, text, reply, state)
        return {
            "session_id": session_id,
            "reply": reply,
            "suggestions": [
                "Customize dates & guests",
                "Plan a romantic date night",
                "Poolside getaway",
            ],
            "rooms": cards,
            "booking_summary": None,
            "confirmed_booking": None,
            "stage": "collect_dates",
        }

    # 5. Final confirmation execution
    if state.get("stage") == "confirm_booking" and any(
        w in lower
        for w in ("confirm", "yes", "book it", "proceed", "reserve", "go ahead", "finalize")
    ):
        try:
            booking = create_verified_booking(
                db=db,
                room_id=int(state["room_id"]),
                guest_name=state["guest_name"],
                guest_email=state["guest_email"],
                check_in=date.fromisoformat(state["check_in"]),
                check_out=date.fromisoformat(state["check_out"]),
                guests=int(state["guests"]),
            )
            matched_room = next((r for r in all_rooms if r.id == booking.room_id), None)
            prefs_list = state.get("preferences") or []
            confirmed_payload = {
                "id": booking.id,
                "room_id": booking.room_id,
                "room_name": matched_room.room_name if matched_room else f"Suite #{booking.room_id}",
                "guest_name": booking.guest_name,
                "guest_email": booking.guest_email,
                "check_in": booking.check_in.isoformat(),
                "check_out": booking.check_out.isoformat(),
                "guests": booking.guests,
                "total_amount": float(booking.total_amount),
                "status": booking.status,
                "preferences": prefs_list,
            }
            prefs_note = (
                f" Our concierge team has also noted your preferences ({', '.join(prefs_list)})."
                if prefs_list
                else ""
            )
            reply = _optional_llm_polish(
                f"Your reservation is confirmed! Booking ID #{booking.id} has been secured for "
                f"{booking.guest_name} in our {confirmed_payload['room_name']} from "
                f"{_format_date(confirmed_payload['check_in'])} to {_format_date(confirmed_payload['check_out'])} "
                f"for a total of {_format_inr(confirmed_payload['total_amount'])}.{prefs_note} "
                "We look forward to welcoming you to Goa.",
                text,
                confirmed_payload,
            )
            new_state = _empty_state()
            new_state["stage"] = "confirmed"
            _save_turn(db, session_id, text, reply, new_state)
            return {
                "session_id": session_id,
                "reply": reply,
                "suggestions": [
                    "Start a new booking",
                    "Customize dates & guests",
                ],
                "rooms": [],
                "booking_summary": None,
                "confirmed_booking": confirmed_payload,
                "stage": "confirmed",
            }
        except BookingValidationError as exc:
            reply = (
                f"I wasn't able to finalize that reservation: {exc} "
                "Would you like me to check alternative dates or another suite?"
            )
            state["stage"] = "select_room"
            state["room_id"] = None
            _save_turn(db, session_id, text, reply, state)
            return {
                "session_id": session_id,
                "reply": reply,
                "suggestions": ["Customize dates & guests", "Show all suites & prices"],
                "rooms": [],
                "booking_summary": None,
                "confirmed_booking": None,
                "stage": "select_room",
            }

    # --- Extract structured booking details from this message ---
    in_date, out_date = _extract_dates(text, existing_check_in=state.get("check_in"))
    if in_date:
        state["check_in"] = in_date.isoformat()
    if out_date:
        state["check_out"] = out_date.isoformat()

    guests_val = _extract_guests(
        text, expecting_guests=(state.get("stage") == "collect_guests")
    )
    if guests_val is not None:
        state["guests"] = guests_val

    if chosen_room_id is not None:
        state["room_id"] = chosen_room_id

    email = _extract_email(text)
    if email:
        state["guest_email"] = email

    if (
        state.get("stage") in ("collect_guest_details", "confirm_booking") or email
    ) and not chosen_room_id and not in_date and not out_date:
        extracted_name = _extract_name(text, email)
        if extracted_name:
            state["guest_name"] = extracted_name

    # --- Validate dates if both present ---
    if state.get("check_in") and state.get("check_out"):
        ci = date.fromisoformat(state["check_in"])
        co = date.fromisoformat(state["check_out"])
        if ci < date.today():
            state["check_in"] = None
            state["check_out"] = None
            reply = (
                "Those dates appear to be in the past. Please choose upcoming check-in and "
                "check-out dates using the Stay Planner or type them (e.g., 'Dec 15 to Dec 20')."
            )
            state["stage"] = "collect_dates"
            _save_turn(db, session_id, text, reply, state)
            return {
                "session_id": session_id,
                "reply": reply,
                "suggestions": ["Customize dates & guests", "Show all suites & prices"],
                "rooms": [],
                "booking_summary": None,
                "confirmed_booking": None,
                "stage": "collect_dates",
            }
        if co <= ci:
            state["check_out"] = None
            reply = (
                f"Your check-out date must be after check-in ({_format_date(state['check_in'])}). "
                "How many nights would you like to stay, or what check-out date do you prefer?"
            )
            state["stage"] = "collect_dates"
            _save_turn(db, session_id, text, reply, state)
            return {
                "session_id": session_id,
                "reply": reply,
                "suggestions": ["3 nights", "5 nights", "7 nights", "Customize dates & guests"],
                "rooms": [],
                "booking_summary": None,
                "confirmed_booking": None,
                "stage": "collect_dates",
            }

    prefs_list: list[str] = state.get("preferences") or []

    # --- Step-by-step guided concierge flow ---
    # 1. Need dates
    if not state.get("check_in") or not state.get("check_out"):
        state["stage"] = "collect_dates"
        if state.get("check_in") and not state.get("check_out"):
            reply = (
                f"Wonderful — I've noted check-in for {_format_date(state['check_in'])}. "
                "How many nights would you like to stay (2, 3, 5, 7+ nights), or what is your check-out date?"
            )
            suggestions = ["3 nights", "5 nights", "7 nights", "Customize dates & guests"]
        elif state.get("room_id"):
            rm = next((r for r in all_rooms if r.id == state["room_id"]), None)
            reply = (
                f"Excellent choice — the {rm.room_name} ({_format_inr(float(rm.price_per_night))}/night) "
                "is a guest favorite. Open Customize Dates & Guests below or tell me your check-in date, how many nights you'd like to stay, and number of guests."
                if rm
                else "Please share your check-in and check-out dates so I can verify live availability."
            )
            suggestions = ["Customize dates & guests", "Poolside getaway", "Plan a romantic date night"]
        elif prefs_list:
            reply = (
                f"Lovely — I'll tailor your escape for {', '.join(prefs_list)}. "
                "Tap Customize Dates & Guests below to pick your exact check-in, check-out (any number of nights), and guest count, or type them right here."
            )
            suggestions = ["Customize dates & guests", "Show all suites & prices"]
        else:
            reply = _optional_llm_polish(
                "Welcome to Azure Escape Resorts in Goa. I'm Aurelia, your personal AI Concierge. "
                "Tell me your dates, length of stay, number of guests, and any special preferences "
                "(poolside, romantic date night, family retreat, or spa) — or tap Customize Dates & Guests below.",
                text,
                {"resort": "Azure Escape Resorts", "location": "Goa, India"},
            )
            suggestions = [
                "Customize dates & guests",
                "Show all suites & prices",
                "Plan a romantic date night",
                "Poolside getaway",
            ]
        _save_turn(db, session_id, text, reply, state)
        return {
            "session_id": session_id,
            "reply": reply,
            "suggestions": suggestions,
            "rooms": [],
            "booking_summary": None,
            "confirmed_booking": None,
            "stage": "collect_dates",
        }

    # 2. Need guest count
    if not state.get("guests"):
        state["stage"] = "collect_guests"
        nights_preview = (
            date.fromisoformat(state["check_out"]) - date.fromisoformat(state["check_in"])
        ).days
        reply = (
            f"Lovely — {_format_date(state['check_in'])} to {_format_date(state['check_out'])} "
            f"({nights_preview} night{'s' if nights_preview > 1 else ''}). "
            "How many guests will be joining? You can type any number or adjust in the Stay Planner."
        )
        _save_turn(db, session_id, text, reply, state)
        return {
            "session_id": session_id,
            "reply": reply,
            "suggestions": ["2 guests", "4 guests", "6 guests", "Customize dates & guests"],
            "rooms": [],
            "booking_summary": None,
            "confirmed_booking": None,
            "stage": "collect_guests",
        }

    ci = date.fromisoformat(state["check_in"])
    co = date.fromisoformat(state["check_out"])
    guests_count = int(state["guests"])
    nights = (co - ci).days

    # 3. Recommend available rooms from PostgreSQL if none chosen yet
    if not state.get("room_id"):
        available = find_available_rooms(db, ci, co, guests_count)
        if not available:
            max_cap = max((r.max_guests for r in all_rooms), default=0)
            if max_cap > 0 and guests_count > max_cap:
                # Offer largest available suites so groups can book multiple suites cleanly
                largest_available = find_available_rooms(db, ci, co, max_cap)
                ranked_group = _rank_rooms_by_preferences(largest_available, prefs_list)
                suites_needed = (guests_count + max_cap - 1) // max_cap
                state["guests"] = max_cap
                state["stage"] = "select_room"
                reply = (
                    f"Our largest individual suites accommodate up to {max_cap} guests each, so for a party of "
                    f"{guests_count} guests from {_format_date(state['check_in'])} to {_format_date(state['check_out'])} "
                    f"({nights} nights), I recommend reserving {suites_needed} suites. "
                    "Here are our largest available suites for your first reservation:"
                )
                _save_turn(db, session_id, text, reply, state)
                return {
                    "session_id": session_id,
                    "reply": reply,
                    "suggestions": [f"Select {r['room_name']}" for r in ranked_group[:3]]
                    + ["Customize dates & guests"],
                    "rooms": ranked_group,
                    "booking_summary": None,
                    "confirmed_booking": None,
                    "stage": "select_room",
                }

            state["stage"] = "collect_dates"
            reply = (
                f"I checked our live inventory for {_format_date(state['check_in'])} to "
                f"{_format_date(state['check_out'])} ({nights} nights) for {guests_count} guest(s), "
                "and no suites are available for those exact dates. Would you like to adjust your dates or guest count?"
            )
            _save_turn(db, session_id, text, reply, state)
            return {
                "session_id": session_id,
                "reply": reply,
                "suggestions": [
                    "Customize dates & guests",
                    "Show all suites & prices",
                    "Start over",
                ],
                "rooms": [],
                "booking_summary": None,
                "confirmed_booking": None,
                "stage": "collect_dates",
            }

        ranked = _rank_rooms_by_preferences(available, prefs_list)
        state["stage"] = "select_room"
        pref_phrase = (
            f" tailored for {', '.join(prefs_list)}" if prefs_list else ""
        )
        reply = _optional_llm_polish(
            f"I found {len(ranked)} available sanctuary suite(s){pref_phrase} for {guests_count} guest(s) "
            f"from {_format_date(state['check_in'])} to {_format_date(state['check_out'])} "
            f"({nights} night{'s' if nights > 1 else ''}). Select your preferred suite below to proceed.",
            text,
            {
                "check_in": state["check_in"],
                "check_out": state["check_out"],
                "nights": nights,
                "guests": guests_count,
                "preferences": prefs_list,
                "available_rooms": [
                    {
                        "name": r["room_name"],
                        "price_per_night": r["price_per_night"],
                        "total_amount": r["total_amount"],
                    }
                    for r in ranked
                ],
            },
        )
        suggestions = [f"Select {r['room_name']}" for r in ranked[:3]] + [
            "Customize dates & guests"
        ]
        _save_turn(db, session_id, text, reply, state)
        return {
            "session_id": session_id,
            "reply": reply,
            "suggestions": suggestions,
            "rooms": ranked,
            "booking_summary": None,
            "confirmed_booking": None,
            "stage": "select_room",
        }

    # 4. Verify chosen room live availability against PostgreSQL
    avail = check_availability_for_room(db, int(state["room_id"]), ci, co, guests_count)
    if not avail["available"]:
        state["room_id"] = None
        state["stage"] = "select_room"
        alternatives = _rank_rooms_by_preferences(
            find_available_rooms(db, ci, co, guests_count), prefs_list
        )
        reply = (
            f"{avail['room_name']} isn't available for those details ({avail['message']}). "
            + (
                "Here are the suites currently available for your dates:"
                if alternatives
                else "Would you like to adjust your dates or guest count?"
            )
        )
        _save_turn(db, session_id, text, reply, state)
        return {
            "session_id": session_id,
            "reply": reply,
            "suggestions": [f"Select {r['room_name']}" for r in alternatives[:3]]
            + ["Customize dates & guests"],
            "rooms": alternatives,
            "booking_summary": None,
            "confirmed_booking": None,
            "stage": "select_room",
        }

    # 5. Collect guest name & email
    if not state.get("guest_name") or not state.get("guest_email"):
        state["stage"] = "collect_guest_details"
        pref_note = (
            f" with {', '.join(prefs_list)} arrangements" if prefs_list else ""
        )
        if not state.get("guest_name") and not state.get("guest_email"):
            reply = (
                f"Wonderful — {avail['room_name']} is available for your {avail['nights']}-night stay{pref_note} "
                f"at {_format_inr(avail['price_per_night'])}/night (Total: {_format_inr(avail['total_amount'])}). "
                "To prepare your reservation folio, please share your full name and email address (e.g., Aarav Sharma, aarav@example.com)."
            )
        elif not state.get("guest_email"):
            reply = (
                f"Thank you, {state['guest_name']}. What email address should we send your "
                "reservation confirmation to?"
            )
        else:
            reply = (
                f"Thank you — I have your email ({state['guest_email']}). "
                "May I have your full name for the reservation?"
            )
        _save_turn(db, session_id, text, reply, state)
        return {
            "session_id": session_id,
            "reply": reply,
            "suggestions": ["Modify suite or dates", "Customize dates & guests"],
            "rooms": [],
            "booking_summary": None,
            "confirmed_booking": None,
            "stage": "collect_guest_details",
        }

    # 6. Present structured booking summary and request explicit final confirmation
    state["stage"] = "confirm_booking"
    summary = {
        "room_id": avail["room_id"],
        "room_name": avail["room_name"],
        "guest_name": state["guest_name"],
        "guest_email": state["guest_email"],
        "check_in": state["check_in"],
        "check_out": state["check_out"],
        "nights": avail["nights"],
        "guests": guests_count,
        "price_per_night": avail["price_per_night"],
        "total_amount": avail["total_amount"],
        "available_rooms": avail["available_rooms"],
        "preferences": prefs_list,
    }
    reply = (
        f"Everything is ready for your review, {state['guest_name']}. "
        f"Please review your reservation folio for {avail['room_name']} "
        f"({_format_inr(avail['total_amount'])} total) and confirm when you'd like me to lock it in."
    )
    _save_turn(db, session_id, text, reply, state)
    return {
        "session_id": session_id,
        "reply": reply,
        "suggestions": ["Confirm Reservation", "Modify Details"],
        "rooms": [],
        "booking_summary": summary,
        "confirmed_booking": None,
        "stage": "confirm_booking",
    }
