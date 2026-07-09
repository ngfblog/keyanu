import json

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import decrypt_secret, encrypt_secret
from app.core.templates import build_summary, get_template_definition
from app.models.credential import Credential
from app.schemas.credential import CredentialCreate, CredentialUpdate


def _encode_fields(template, fields: dict[str, str]) -> tuple[str, str]:
    """Encrypt credential fields as JSON and return (encrypted_blob, summary).

    Credential payloads may contain fields that are no longer present in the
    current template definition. Keep those values when re-encrypting so partial
    updates and backup/restore round trips do not discard previously stored
    secrets.
    """
    clean_fields = {k: v for k, v in fields.items() if v is not None}
    encrypted = encrypt_secret(json.dumps(clean_fields))
    summary = build_summary(template, clean_fields)
    return encrypted, summary


def _decode_fields(encrypted_blob: str) -> dict[str, str]:
    raw = decrypt_secret(encrypted_blob)
    if not raw:
        return {}
    return json.loads(raw)


def list_credentials(db: Session, resource_id: str) -> list[Credential]:
    stmt = select(Credential).where(Credential.resource_id == resource_id).order_by(Credential.name)
    return list(db.execute(stmt).scalars().all())


def get_credential(db: Session, credential_id: str) -> Credential | None:
    return db.get(Credential, credential_id)


def create_credential(db: Session, data: CredentialCreate, resource_id: str) -> Credential:
    # Validate the template exists (raises KeyError caught by caller) and encode.
    get_template_definition(data.template)
    encrypted, summary = _encode_fields(data.template, data.fields)
    credential = Credential(
        name=data.name,
        template=data.template,
        summary=summary,
        encrypted_data=encrypted,
        resource_id=resource_id,
    )
    db.add(credential)
    db.commit()
    db.refresh(credential)
    return credential


def update_credential(db: Session, credential: Credential, data: CredentialUpdate) -> Credential:
    if data.name is not None:
        credential.name = data.name
    if data.fields is not None:
        existing = _decode_fields(credential.encrypted_data)
        for key, value in data.fields.items():
            if value is None:
                existing.pop(key, None)
            else:
                existing[key] = value
        encrypted, summary = _encode_fields(credential.template, existing)
        credential.encrypted_data = encrypted
        credential.summary = summary
    db.add(credential)
    db.commit()
    db.refresh(credential)
    return credential


def delete_credential(db: Session, credential: Credential) -> None:
    db.delete(credential)
    db.commit()


def reveal_credential(db: Session, credential: Credential) -> dict[str, str]:
    return _decode_fields(credential.encrypted_data)
