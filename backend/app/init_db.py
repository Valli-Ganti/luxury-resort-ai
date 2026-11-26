
from app.database import Base, engine
from app.models.room import Room
from app.models.booking import Booking


def initialize_database():
    print("Connecting to PostgreSQL...")

    try:
        Base.metadata.create_all(bind=engine)

        print("Database connection successful!")
        print("Rooms table created successfully!")

    except Exception as error:
        print("Database initialization failed!")
        print(f"Error: {error}")


if __name__ == "__main__":
    initialize_database()
