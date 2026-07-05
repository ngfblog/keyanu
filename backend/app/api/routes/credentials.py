from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.routes.resources import get_owned_resource_or_404
from app.crud import crud_audit, crud_credential
from app.db.session import get_db
from app.models.enums import AuditAction
from app.models.user import User
from app.schemas.credential import (
    CredentialCreate,
    CredentialDetail,
    CredentialRead,
    CredentialRevealResponse,
    CredentialUpdate,
)
from app.schemas.audit import AuditLogRead

router = APIRouter(tags=["credentials"])


def _get_owned_credential_or_404(db: Session, credential_id: str, owner_id: str):
    credential = crud_credential.get_credential(db, credential_id)
    if not credential or credential.resource.workspace.owner_id != owner_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Credential not found")
    return credential


@router.get("/resources/{resource_id}/credentials", response_model=list[CredentialRead])
def list_credentials(
    resource_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[CredentialRead]:
    get_owned_resource_or_404(db, resource_id, current_user.id)
    return crud_credential.list_credentials(db, resource_id)


@router.get("/credentials/{credential_id}", response_model=CredentialDetail)
def get_credential(
    credential_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CredentialDetail:
    credential = _get_owned_credential_or_404(db, credential_id, current_user.id)
    resource = credential.resource
    return CredentialDetail(
        id=credential.id,
        resource_id=resource.id,
        name=credential.name,
        template=credential.template,
        summary=credential.summary,
        created_at=credential.created_at,
        updated_at=credential.updated_at,
        resource_name=resource.name,
        workspace_id=resource.workspace_id,
        workspace_name=resource.workspace.name,
    )


@router.get("/credentials/{credential_id}/audit", response_model=list[AuditLogRead])
def get_credential_audit(
    credential_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AuditLogRead]:
    _get_owned_credential_or_404(db, credential_id, current_user.id)
    return crud_audit.list_for_entity(db, "credential", credential_id)


@router.post(
    "/resources/{resource_id}/credentials",
    response_model=CredentialRead,
    status_code=status.HTTP_201_CREATED,
)
def create_credential(
    resource_id: str,
    payload: CredentialCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CredentialRead:
    resource = get_owned_resource_or_404(db, resource_id, current_user.id)
    credential = crud_credential.create_credential(db, payload, resource_id)
    crud_audit.log(
        db,
        action=AuditAction.CREATE,
        entity_type="credential",
        entity_id=credential.id,
        entity_name=credential.name,
        user_id=current_user.id,
        resource_id=resource.id,
        workspace_id=resource.workspace_id,
        detail=f"template={credential.template.value}",
    )
    return credential


@router.put("/credentials/{credential_id}", response_model=CredentialRead)
def update_credential(
    credential_id: str,
    payload: CredentialUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CredentialRead:
    credential = _get_owned_credential_or_404(db, credential_id, current_user.id)
    credential = crud_credential.update_credential(db, credential, payload)
    crud_audit.log(
        db,
        action=AuditAction.UPDATE,
        entity_type="credential",
        entity_id=credential.id,
        entity_name=credential.name,
        user_id=current_user.id,
        resource_id=credential.resource_id,
        workspace_id=credential.resource.workspace_id,
    )
    return credential


@router.delete("/credentials/{credential_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_credential(
    credential_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    credential = _get_owned_credential_or_404(db, credential_id, current_user.id)
    crud_audit.log(
        db,
        action=AuditAction.DELETE,
        entity_type="credential",
        entity_id=credential.id,
        entity_name=credential.name,
        user_id=current_user.id,
        resource_id=credential.resource_id,
        workspace_id=credential.resource.workspace_id,
    )
    crud_credential.delete_credential(db, credential)


@router.post("/credentials/{credential_id}/reveal", response_model=CredentialRevealResponse)
def reveal_credential(
    credential_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CredentialRevealResponse:
    credential = _get_owned_credential_or_404(db, credential_id, current_user.id)
    fields = crud_credential.reveal_credential(db, credential)
    crud_audit.log(
        db,
        action=AuditAction.VIEW_SECRET,
        entity_type="credential",
        entity_id=credential.id,
        entity_name=credential.name,
        user_id=current_user.id,
        resource_id=credential.resource_id,
        workspace_id=credential.resource.workspace_id,
    )
    return CredentialRevealResponse(id=credential.id, fields=fields)
