
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.room import Room
from app.models.booking import Booking
from app.schemas.booking import BookingCreate, BookingResponse


router = APIRouter(
    prefix="/api/bookings",
    tags=["Bookings"]
)


@router.post("", response_model=BookingResponse, status_code=201)
def create_booking(
    booking_data: BookingCreate,
    db: Session = Depends(get_db)
):
    try:
        # Validate booking dates
        if booking_data.check_in < date.today():
            raise HTTPException(
                status_code=400,
                detail="Check-in date cannot be in the past."
            )

        if booking_data.check_out <= booking_data.check_in:
            raise HTTPException(
                status_code=400,
                detail="Check-out must be after check-in."
            )

        # Lock the room category row while checking inventory.
        # This serializes booking creation for the same category.
        room = db.scalar(
            select(Room)
            .where(
                Room.id == booking_data.room_id,
                Room.is_active.is_(True)
            )
            .with_for_update()
        )

        if room is None:
            raise HTTPException(
                status_code=404,
                detail="Room not found."
            )

        if booking_data.guests > room.max_guests:
            raise HTTPException(
                status_code=400,
                detail=f"This room accommodates a maximum of {room.max_guests} guests."
            )

        # Count bookings overlapping the requested dates
        booked_rooms = db.scalar(
            select(func.count(Booking.id)).where(
                Booking.room_id == room.id,
                Booking.status == "confirmed",
                Booking.check_in < booking_data.check_out,
                Booking.check_out > booking_data.check_in
            )
        ) or 0

        available_rooms = room.total_rooms - booked_rooms

        if available_rooms <= 0:
            raise HTTPException(
                status_code=409,
                detail="No rooms available for the selected dates."
            )

        # Calculate total price
        nights = (
            booking_data.check_out - booking_data.check_in
        ).days

        total_amount = (
            Decimal(str(room.price_per_night)) * nights
        )

        # Create booking
        new_booking = Booking(
            room_id=room.id,
            guest_name=booking_data.guest_name,
            guest_email=booking_data.guest_email,
            check_in=booking_data.check_in,
            check_out=booking_data.check_out,
            guests=booking_data.guests,
            total_amount=total_amount,
            status="confirmed"
        )

        db.add(new_booking)
        db.commit()
        db.refresh(new_booking)

        return new_booking

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to create booking. Please try again."
        )
