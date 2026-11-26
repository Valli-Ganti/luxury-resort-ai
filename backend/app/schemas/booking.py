from datetime import date
from pydantic import BaseModel, Field


class BookingCreate(BaseModel):
    room_id: int = Field(gt=0)
    guest_name: str = Field(min_length=2, max_length=150)
    guest_email: str = Field(min_length=5, max_length=150)
    check_in: date
    check_out: date
    guests: int = Field(ge=1, le=20)


class BookingResponse(BaseModel):
    id: int
    room_id: int
    guest_name: str
    guest_email: str
    check_in: date
    check_out: date
    guests: int
    total_amount: float
    status: str

    model_config = {"from_attributes": True}