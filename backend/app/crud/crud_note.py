from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.note import Note
from app.schemas.note import NoteCreate, NoteUpdate


def list_notes(db: Session, resource_id: str) -> list[Note]:
    stmt = select(Note).where(Note.resource_id == resource_id).order_by(Note.updated_at.desc())
    return list(db.execute(stmt).scalars().all())


def get_note(db: Session, note_id: str) -> Note | None:
    return db.get(Note, note_id)


def create_note(db: Session, data: NoteCreate, resource_id: str) -> Note:
    note = Note(**data.model_dump(), resource_id=resource_id)
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


def update_note(db: Session, note: Note, data: NoteUpdate) -> Note:
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(note, key, value)
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


def delete_note(db: Session, note: Note) -> None:
    db.delete(note)
    db.commit()
