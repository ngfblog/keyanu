from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.routes.resources import get_owned_resource_or_404
from app.crud import crud_audit, crud_note
from app.db.session import get_db
from app.models.enums import AuditAction
from app.models.user import User
from app.schemas.note import NoteCreate, NoteRead, NoteUpdate

router = APIRouter(tags=["notes"])


def _get_owned_note_or_404(db: Session, note_id: str, owner_id: str):
    note = crud_note.get_note(db, note_id)
    if not note or note.resource.workspace.owner_id != owner_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    return note


@router.get("/resources/{resource_id}/notes", response_model=list[NoteRead])
def list_notes(
    resource_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[NoteRead]:
    get_owned_resource_or_404(db, resource_id, current_user.id)
    return crud_note.list_notes(db, resource_id)


@router.post("/resources/{resource_id}/notes", response_model=NoteRead, status_code=status.HTTP_201_CREATED)
def create_note(
    resource_id: str,
    payload: NoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NoteRead:
    resource = get_owned_resource_or_404(db, resource_id, current_user.id)
    note = crud_note.create_note(db, payload, resource_id)
    crud_audit.log(
        db,
        action=AuditAction.CREATE,
        entity_type="note",
        entity_id=note.id,
        entity_name=note.title,
        user_id=current_user.id,
        resource_id=resource.id,
        workspace_id=resource.workspace_id,
    )
    return note


@router.put("/notes/{note_id}", response_model=NoteRead)
def update_note(
    note_id: str,
    payload: NoteUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NoteRead:
    note = _get_owned_note_or_404(db, note_id, current_user.id)
    note = crud_note.update_note(db, note, payload)
    crud_audit.log(
        db,
        action=AuditAction.UPDATE,
        entity_type="note",
        entity_id=note.id,
        entity_name=note.title,
        user_id=current_user.id,
        resource_id=note.resource_id,
        workspace_id=note.resource.workspace_id,
    )
    return note


@router.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    note_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    note = _get_owned_note_or_404(db, note_id, current_user.id)
    crud_audit.log(
        db,
        action=AuditAction.DELETE,
        entity_type="note",
        entity_id=note.id,
        entity_name=note.title,
        user_id=current_user.id,
        resource_id=note.resource_id,
        workspace_id=note.resource.workspace_id,
    )
    crud_note.delete_note(db, note)
