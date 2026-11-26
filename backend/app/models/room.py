
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Room(Base):
    __tablename__ = "rooms"

    __table_args__ = (
        CheckConstraint(
            "price_per_night > 0",
            name="check_room_price_positive"
        ),
        CheckConstraint(
            "max_guests > 0",
            name="check_max_guests_positive"
        ),
        CheckConstraint(
            "total_rooms >= 0",
            name="check_total_rooms_nonnegative"
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True
    )

    room_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        unique=True
    )

    description: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )

    price_per_night: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False
    )

    max_guests: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    total_rooms: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1
    )

    image_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
