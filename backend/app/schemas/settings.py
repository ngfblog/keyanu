from pydantic import BaseModel, ConfigDict, Field


class PreferencesRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    display_name: str | None = None
    time_format: str
    accent_color: str
    compact_mode: bool
    animations_enabled: bool


class PreferencesUpdate(BaseModel):
    display_name: str | None = Field(default=None, max_length=128)
    time_format: str | None = Field(default=None, pattern="^(12h|24h)$")
    accent_color: str | None = Field(default=None, max_length=16)
    compact_mode: bool | None = None
    animations_enabled: bool | None = None


class AboutInfo(BaseModel):
    app_name: str
    version: str
    environment: str
    license: str = "MIT"
