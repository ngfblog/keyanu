from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ResourceType


class ResourceBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    type: ResourceType = ResourceType.CUSTOM
    description: str | None = Field(default=None, max_length=2000)
    hostname: str | None = Field(default=None, max_length=255)
    tags: str | None = Field(default=None, max_length=512)


class ResourceCreate(ResourceBase):
    pass


class ResourceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=128)
    type: ResourceType | None = None
    description: str | None = Field(default=None, max_length=2000)
    hostname: str | None = Field(default=None, max_length=255)
    tags: str | None = Field(default=None, max_length=512)


class ResourceRead(ResourceBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    created_at: datetime
    updated_at: datetime
    credential_count: int = 0
    file_count: int = 0
    note_count: int = 0


class ResourceDetail(ResourceRead):
    workspace_name: str | None = None
