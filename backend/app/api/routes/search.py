from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.credential import Credential
from app.models.file import ResourceFile
from app.models.note import Note
from app.models.resource import Resource
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.search import (
    SearchCredentialResult,
    SearchFileResult,
    SearchNoteResult,
    SearchResourceResult,
    SearchResults,
)

router = APIRouter(tags=["search"])

RESULTS_PER_CATEGORY = 8


@router.get("/search", response_model=SearchResults)
def search(
    q: str = Query(..., min_length=1, max_length=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SearchResults:
    term = f"%{q.strip()}%"

    resource_rows = db.execute(
        select(Resource, Workspace.name)
        .join(Workspace, Resource.workspace_id == Workspace.id)
        .where(
            Workspace.owner_id == current_user.id,
            or_(
                Resource.name.ilike(term),
                Resource.description.ilike(term),
                Resource.hostname.ilike(term),
                Resource.tags.ilike(term),
            ),
        )
        .order_by(Resource.name)
        .limit(RESULTS_PER_CATEGORY)
    ).all()

    credential_rows = db.execute(
        select(Credential, Resource.name)
        .join(Resource, Credential.resource_id == Resource.id)
        .join(Workspace, Resource.workspace_id == Workspace.id)
        .where(
            Workspace.owner_id == current_user.id,
            or_(Credential.name.ilike(term), Credential.summary.ilike(term)),
        )
        .order_by(Credential.name)
        .limit(RESULTS_PER_CATEGORY)
    ).all()

    file_rows = db.execute(
        select(ResourceFile, Resource.name)
        .join(Resource, ResourceFile.resource_id == Resource.id)
        .join(Workspace, Resource.workspace_id == Workspace.id)
        .where(Workspace.owner_id == current_user.id, ResourceFile.filename.ilike(term))
        .order_by(ResourceFile.filename)
        .limit(RESULTS_PER_CATEGORY)
    ).all()

    note_rows = db.execute(
        select(Note, Resource.name)
        .join(Resource, Note.resource_id == Resource.id)
        .join(Workspace, Resource.workspace_id == Workspace.id)
        .where(
            Workspace.owner_id == current_user.id,
            or_(Note.title.ilike(term), Note.content.ilike(term)),
        )
        .order_by(Note.title)
        .limit(RESULTS_PER_CATEGORY)
    ).all()

    return SearchResults(
        query=q,
        resources=[
            SearchResourceResult(
                id=res.id,
                name=res.name,
                type=res.type,
                hostname=res.hostname,
                workspace_id=res.workspace_id,
                workspace_name=ws_name,
            )
            for res, ws_name in resource_rows
        ],
        credentials=[
            SearchCredentialResult(
                id=cred.id, name=cred.name, template=cred.template, resource_id=cred.resource_id,
                resource_name=res_name,
            )
            for cred, res_name in credential_rows
        ],
        files=[
            SearchFileResult(id=f.id, filename=f.filename, resource_id=f.resource_id, resource_name=res_name)
            for f, res_name in file_rows
        ],
        notes=[
            SearchNoteResult(id=n.id, title=n.title, resource_id=n.resource_id, resource_name=res_name)
            for n, res_name in note_rows
        ],
    )
