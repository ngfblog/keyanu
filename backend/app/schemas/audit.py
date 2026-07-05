from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import AuditAction


class AuditLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    action: AuditAction
    entity_type: str
    entity_id: str | None = None
    entity_name: str | None = None
    detail: str | None = None
    created_at: datetime
    user_id: str | None = None
