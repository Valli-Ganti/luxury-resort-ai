from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.models import booking as _booking_model  # noqa: F401
from app.models import chat_history as _chat_history_model  # noqa: F401
from app.models import room as _room_model  # noqa: F401
from app.routes.booking_routes import router as booking_router
from app.routes.chat_routes import router as chat_router
from app.routes.room_routes import router as room_router


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Ensure any newly added tables (such as chat_history) exist in PostgreSQL.
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Azure Escape Resorts API",
    description="AI-powered Luxury Resort Booking Platform",
    version="1.1.0",
    lifespan=lifespan,
)

# Frontend communication settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(room_router)
app.include_router(booking_router)
app.include_router(chat_router)

# Temporary resort information
resort_data = {
    "id": 1,
    "name": "Azure Escape Resorts",
    "location": "Goa, India",
    "description": (
        "Experience luxury, comfort and unforgettable "
        "moments at our premium beachfront resort."
    ),
    "rating": 4.8,
    "currency": "INR",
    "amenities": [
        "Private Swimming Pool",
        "Beach Access",
        "Luxury Spa",
        "Fine Dining",
        "Free WiFi",
        "Airport Transfers",
    ],
}


@app.get("/")
def home():
    return {
        "message": "Welcome to Azure Escape Resorts API",
        "status": "Running",
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "application": "Luxury Resort AI Backend",
    }


@app.get("/api/resort")
def get_resort():
    return resort_data
