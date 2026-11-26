
from decimal import Decimal

from sqlalchemy import select

from app.database import SessionLocal
from app.models.room import Room


sample_rooms = [
    {
        "room_name": "Deluxe Room",
        "description": "Elegant deluxe room with comfortable interiors and garden views.",
        "price_per_night": Decimal("8000.00"),
        "max_guests": 2,
        "total_rooms": 10,
        "image_url": None,
        "is_active": True,
    },
    {
        "room_name": "Premium Suite",
        "description": "Spacious premium suite with a private balcony and ocean views.",
        "price_per_night": Decimal("15000.00"),
        "max_guests": 3,
        "total_rooms": 5,
        "image_url": None,
        "is_active": True,
    },
    {
        "room_name": "Private Pool Villa",
        "description": "Luxury private villa featuring an exclusive swimming pool.",
        "price_per_night": Decimal("24000.00"),
        "max_guests": 4,
        "total_rooms": 3,
        "image_url": None,
        "is_active": True,
    },
]


def seed_rooms():
    db = SessionLocal()

    try:
        for room_data in sample_rooms:
            existing_room = db.scalar(
                select(Room).where(
                    Room.room_name == room_data["room_name"]
                )
            )

            if existing_room is None:
                db.add(Room(**room_data))
                print(f"Added: {room_data['room_name']}")
            else:
                print(f"Already exists: {room_data['room_name']}")

        db.commit()
        print("Room data inserted successfully!")

    except Exception as error:
        db.rollback()
        print(f"Error inserting room data: {error}")
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_rooms()
