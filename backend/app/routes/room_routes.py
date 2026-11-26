
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.room import Room
from app.models.booking import Booking
from app.schemas.room import RoomResponse


router = APIRouter(
    prefix="/api/rooms",
    tags=["Rooms"]
)


# Get all active rooms
@router.get("", response_model=list[RoomResponse])
def get_rooms(db: Session = Depends(get_db)):

    rooms = db.scalars(
        select(Room)
        .where(Room.is_active.is_(True))
        .order_by(Room.id)
    ).all()

    return rooms


# Check room availability
@router.get("/{room_id}/availability")
def check_room_availability(
    room_id: int,
    check_in: date,
    check_out: date,
    guests: int = Query(default=1, ge=1),
    db: Session = Depends(get_db)
):

    # Validate dates
    if check_in < date.today():
        raise HTTPException(
            status_code=400,
            detail="Check-in date cannot be in the past."
        )

    if check_out <= check_in:
        raise HTTPException(
            status_code=400,
            detail="Check-out must be after check-in."
        )

    # Find the requested room category
    room = db.scalar(
        select(Room).where(
            Room.id == room_id,
            Room.is_active.is_(True)
        )
    )

    if room is None:
        raise HTTPException(
            status_code=404,
            detail="Room not found."
        )

    # Validate guest capacity
    if guests > room.max_guests:
        return {
            "available": False,
            "message": (
                f"This room accommodates a maximum of "
                f"{room.max_guests} guests."
            ),
            "max_guests": room.max_guests
        }

    # Count bookings that overlap the requested dates
    booked_rooms = db.scalar(
        select(func.count(Booking.id)).where(
            Booking.room_id == room_id,
            Booking.status == "confirmed",
            Booking.check_in < check_out,
            Booking.check_out > check_in
        )
    ) or 0

    # Calculate remaining inventory
    available_rooms = max(
        room.total_rooms - booked_rooms,
        0
    )

    return {
        "room_id": room.id,
        "room_name": room.room_name,
        "check_in": check_in,
        "check_out": check_out,
        "guests": guests,
        "price_per_night": room.price_per_night,
        "total_rooms": room.total_rooms,
        "booked_rooms": booked_rooms,
        "available_rooms": available_rooms,
        "available": available_rooms > 0,
        "message": (
            "Rooms are available."
            if available_rooms > 0
            else "No rooms available for the selected dates."
        )
    }
