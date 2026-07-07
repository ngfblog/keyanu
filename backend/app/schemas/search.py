from pydantic import BaseModel

from app.models.enums import CredentialTemplate


class SearchResourceResult(BaseModel):
    id: str
    name: str
    type: str
    hostname: str | None = None
    workspace_id: str
    workspace_name: str


class SearchCredentialResult(BaseModel):
    id: str
    name: str
    template: CredentialTemplate
    resource_id: str
    resource_name: str


class SearchFileResult(BaseModel):
    id: str
    filename: str
    resource_id: str
    resource_name: str


class SearchNoteResult(BaseModel):
    id: str
    title: str
    resource_id: str
    resource_name: str


class SearchResults(BaseModel):
    query: str
    resources: list[SearchResourceResult]
    credentials: list[SearchCredentialResult]
    files: list[SearchFileResult]
    notes: list[SearchNoteResult]
