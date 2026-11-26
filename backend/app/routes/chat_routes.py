from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import Base, engine, get_db
from app.models.chat_history import ChatHistory  # noqa: F401
from app.schemas.chat import ChatMessageOut, ChatRequest, ChatResponse
from app.services.concierge_service import (
    clear_session_history,
    get_session_history,
    process_chat_message,
)

router = APIRouter(prefix="/api/chat", tags=["AI Concierge"])

_table_checked = False


def _ensure_chat_table() -> None:
    global _table_checked
    if not _table_checked:
        Base.metadata.create_all(bind=engine)
        _table_checked = True


@router.post("", response_model=ChatResponse)
def chat_with_concierge(
    payload: ChatRequest,
    db: Session = Depends(get_db),
):
    try:
        _ensure_chat_table()
        return process_chat_message(
            db=db,
            session_id=payload.session_id,
            message=payload.message,
        )
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Concierge error: {str(exc)}",
        ) from exc


@router.get("/history/{session_id}", response_model=list[ChatMessageOut])
def read_chat_history(
    session_id: str,
    db: Session = Depends(get_db),
):
    _ensure_chat_table()
    return get_session_history(db=db, session_id=session_id)


@router.delete("/history/{session_id}", status_code=204)
def reset_chat_history(
    session_id: str,
    db: Session = Depends(get_db),
):
    _ensure_chat_table()
    clear_session_history(db=db, session_id=session_id)
    return None
