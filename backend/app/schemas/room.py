from decimal import Decimal
from pydantic import BaseModel, ConfigDict


class RoomResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    room_name: str
    description: str
    price_per_night: Decimal
    max_guests: int
    total_rooms: int
    image_url: str | None
    is_active: bool