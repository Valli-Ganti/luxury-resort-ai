from typing import Any

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    session_id: str = Field(min_length=4, max_length=100)
    message: str = Field(min_length=1, max_length=2000)


class ChatMessageOut(BaseModel):
    id: int
    role: str
    message: str
    created_at: str


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    suggestions: list[str] = Field(default_factory=list)
    rooms: list[dict[str, Any]] = Field(default_factory=list)
    booking_summary: dict[str, Any] | None = None
    confirmed_booking: dict[str, Any] | None = None
    stage: str = "greeting"
