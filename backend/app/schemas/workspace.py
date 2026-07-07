from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class WorkspaceBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    description: str | None = Field(default=None, max_length=2000)
    type: str | None = Field(default="website", min_length=1, max_length=64)
    icon: str | None = Field(default="folder", max_length=32)
    color: str | None = Field(default="#d4a72c", max_length=16)


class WorkspaceCreate(WorkspaceBase):
    pass


class WorkspaceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=128)
    description: str | None = Field(default=None, max_length=2000)
    type: str | None = Field(default=None, min_length=1, max_length=64)
    icon: str | None = Field(default=None, max_length=32)
    color: str | None = Field(default=None, max_length=16)


class WorkspaceRead(WorkspaceBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime
    resource_count: int = 0


class WorkspaceDetail(WorkspaceRead):
    pass
