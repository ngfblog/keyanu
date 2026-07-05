from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import CredentialTemplate


class CredentialCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    template: CredentialTemplate
    fields: dict[str, str] = Field(default_factory=dict)


class CredentialUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=128)
    fields: dict[str, str] | None = None


class CredentialRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    resource_id: str
    name: str
    template: CredentialTemplate
    summary: str | None = None
    created_at: datetime
    updated_at: datetime


class CredentialDetail(CredentialRead):
    resource_name: str | None = None
    workspace_id: str | None = None
    workspace_name: str | None = None


class CredentialRevealResponse(BaseModel):
    id: str
    fields: dict[str, str]


class TemplateFieldSchema(BaseModel):
    key: str
    label: str
    input_type: str
    required: bool
    secret: bool
    placeholder: str = ""
    help_text: str = ""


class TemplateDefinitionSchema(BaseModel):
    id: CredentialTemplate
    label: str
    description: str
    icon: str
    fields: list[TemplateFieldSchema]
