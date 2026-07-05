from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=256)


class ChangeUsernameRequest(BaseModel):
    current_password: str
    new_username: str = Field(..., min_length=1, max_length=64)


class TotpStatus(BaseModel):
    enabled: bool


class TotpSetupResponse(BaseModel):
    secret: str
    otpauth_url: str


class TotpEnableRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=6)


class TotpDisableRequest(BaseModel):
    current_password: str


class RecoveryCodesGenerateRequest(BaseModel):
    current_password: str


class RecoveryCodesResponse(BaseModel):
    codes: list[str]
    generated_at: datetime


class RecoveryCodesStatus(BaseModel):
    available: bool  # whether TOTP is enabled, i.e. recovery codes are meaningful
    remaining: int
    generated_at: datetime | None = None


class SessionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    last_seen_at: datetime
    expires_at: datetime
    user_agent: str | None = None
    ip_address: str | None = None
    is_current: bool = False


class SessionTimeoutRead(BaseModel):
    session_timeout_minutes: int


class SessionTimeoutUpdate(BaseModel):
    session_timeout_minutes: int = Field(..., ge=5, le=43200)  # 5 minutes .. 30 days
