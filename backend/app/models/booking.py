
from datetime import date

from sqlalchemy import (
    CheckConstraint,
    Date,
    ForeignKey,
    Integer,
    Numeric,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Booking(Base):
    __tablename__ = "bookings"

    __table_args__ = (
        CheckConstraint(
            "check_out > check_in",
            name="check_booking_dates"
        ),
        CheckConstraint(
            "guests > 0",
            name="check_booking_guests"
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True
    )

    room_id: Mapped[int] = mapped_column(
        ForeignKey("rooms.id", ondelete="RESTRICT"),
        nullable=False
    )

    guest_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )

    guest_email: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )

    check_in: Mapped[date] = mapped_column(
        Date,
        nullable=False
    )

    check_out: Mapped[date] = mapped_column(
        Date,
        nullable=False
    )

    guests: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    total_amount: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="confirmed",
        nullable=False
    )
