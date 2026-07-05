from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ResourceFileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    resource_id: str
    filename: str
    content_type: str | None = None
    size_bytes: int
    detected_metadata: str | None = None
    created_at: datetime
