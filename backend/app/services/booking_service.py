from datetime import date
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.booking import Booking
from app.models.room import Room


class BookingValidationError(ValueError):
    """Raised when booking inputs or inventory checks fail."""

    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.status_code = status_code


def list_active_rooms(db: Session) -> list[Room]:
    return list(
        db.scalars(
            select(Room).where(Room.is_active.is_(True)).order_by(Room.price_per_night, Room.id)
        ).all()
    )


def count_overlapping_bookings(
    db: Session,
    room_id: int,
    check_in: date,
    check_out: date,
) -> int:
    return (
        db.scalar(
            select(func.count(Booking.id)).where(
                Booking.room_id == room_id,
                Booking.status == "confirmed",
                Booking.check_in < check_out,
                Booking.check_out > check_in,
            )
        )
        or 0
    )


def check_availability_for_room(
    db: Session,
    room_id: int,
    check_in: date,
    check_out: date,
    guests: int = 1,
) -> dict[str, Any]:
    if check_in < date.today():
        raise BookingValidationError("Check-in date cannot be in the past.", 400)
    if check_out <= check_in:
        raise BookingValidationError("Check-out must be after check-in.", 400)

    room = db.scalar(
        select(Room).where(Room.id == room_id, Room.is_active.is_(True))
    )
    if room is None:
        raise BookingValidationError("Room not found.", 404)

    nights = (check_out - check_in).days
    price_per_night = Decimal(str(room.price_per_night))
    total_amount = price_per_night * nights

    if guests > room.max_guests:
        return {
            "room_id": room.id,
            "room_name": room.room_name,
            "available": False,
            "max_guests": room.max_guests,
            "total_rooms": room.total_rooms,
            "booked_rooms": 0,
            "available_rooms": 0,
            "nights": nights,
            "price_per_night": float(price_per_night),
            "total_amount": float(total_amount),
            "message": f"This suite accommodates a maximum of {room.max_guests} guests.",
        }

    booked_rooms = count_overlapping_bookings(db, room.id, check_in, check_out)
    available_rooms = max(room.total_rooms - booked_rooms, 0)

    return {
        "room_id": room.id,
        "room_name": room.room_name,
        "description": room.description,
        "image_url": room.image_url,
        "check_in": check_in.isoformat(),
        "check_out": check_out.isoformat(),
        "guests": guests,
        "max_guests": room.max_guests,
        "nights": nights,
        "price_per_night": float(price_per_night),
        "total_amount": float(total_amount),
        "total_rooms": room.total_rooms,
        "booked_rooms": booked_rooms,
        "available_rooms": available_rooms,
        "available": available_rooms > 0,
        "message": (
            f"{available_rooms} suite(s) available for your dates."
            if available_rooms > 0
            else "No suites available for the selected dates."
        ),
    }


def find_available_rooms(
    db: Session,
    check_in: date,
    check_out: date,
    guests: int = 1,
) -> list[dict[str, Any]]:
    if check_in < date.today():
        raise BookingValidationError("Check-in date cannot be in the past.", 400)
    if check_out <= check_in:
        raise BookingValidationError("Check-out must be after check-in.", 400)

    rooms = list_active_rooms(db)
    results: list[dict[str, Any]] = []
    nights = (check_out - check_in).days

    for room in rooms:
        if room.max_guests < guests:
            continue
        booked = count_overlapping_bookings(db, room.id, check_in, check_out)
        available_rooms = max(room.total_rooms - booked, 0)
        if available_rooms <= 0:
            continue
        price = Decimal(str(room.price_per_night))
        results.append(
            {
                "id": room.id,
                "room_name": room.room_name,
                "description": room.description,
                "price_per_night": float(price),
                "total_amount": float(price * nights),
                "nights": nights,
                "max_guests": room.max_guests,
                "available_rooms": available_rooms,
                "image_url": room.image_url,
            }
        )
    return results


def create_verified_booking(
    db: Session,
    room_id: int,
    guest_name: str,
    guest_email: str,
    check_in: date,
    check_out: date,
    guests: int,
) -> Booking:
    if check_in < date.today():
        raise BookingValidationError("Check-in date cannot be in the past.", 400)
    if check_out <= check_in:
        raise BookingValidationError("Check-out must be after check-in.", 400)

    try:
        room = db.scalar(
            select(Room)
            .where(Room.id == room_id, Room.is_active.is_(True))
            .with_for_update()
        )
        if room is None:
            raise BookingValidationError("Room not found.", 404)

        if guests > room.max_guests:
            raise BookingValidationError(
                f"This suite accommodates a maximum of {room.max_guests} guests.", 400
            )

        booked_rooms = count_overlapping_bookings(db, room.id, check_in, check_out)
        if room.total_rooms - booked_rooms <= 0:
            raise BookingValidationError(
                "No suites available for the selected dates.", 409
            )

        nights = (check_out - check_in).days
        total_amount = Decimal(str(room.price_per_night)) * nights

        new_booking = Booking(
            room_id=room.id,
            guest_name=guest_name.strip(),
            guest_email=guest_email.strip(),
            check_in=check_in,
            check_out=check_out,
            guests=guests,
            total_amount=total_amount,
            status="confirmed",
        )
        db.add(new_booking)
        db.commit()
        db.refresh(new_booking)
        return new_booking
    except BookingValidationError:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise BookingValidationError(
            "Unable to create booking. Please try again.", 500
        )
