from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field



class ResourceBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    type: str = Field(default="custom", min_length=1, max_length=64)
    icon: str | None = Field(default=None, max_length=512)
    description: str | None = Field(default=None, max_length=2000)
    hostname: str | None = Field(default=None, max_length=255)
    tags: str | None = Field(default=None, max_length=512)


class ResourceCreate(ResourceBase):
    pass


class ResourceMove(BaseModel):
    destination_workspace_id: str = Field(..., min_length=1)


class ResourceDuplicate(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    destination_workspace_id: str = Field(..., min_length=1)
    copy_credentials: bool = True
    copy_notes: bool = True
    copy_files: bool = True
    copy_icon: bool = True
    copy_tags: bool = True


class ResourceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=128)
    type: str | None = Field(default=None, min_length=1, max_length=64)
    icon: str | None = Field(default=None, max_length=512)
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
