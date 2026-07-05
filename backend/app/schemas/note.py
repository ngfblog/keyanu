from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class NoteCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: str | None = Field(default=None, max_length=50000)


class NoteUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    content: str | None = Field(default=None, max_length=50000)


class NoteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    resource_id: str
    title: str
    content: str | None = None
    created_at: datetime
    updated_at: datetime
