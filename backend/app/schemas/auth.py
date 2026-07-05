from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=64)
    password: str = Field(..., min_length=1, max_length=256)


class LoginResponse(BaseModel):
    # Populated when credentials are correct and no second factor is needed.
    access_token: str | None = None
    token_type: str = "bearer"
    must_change_password: bool = False

    # Populated instead, when TOTP is enabled for the account.
    requires_totp: bool = False
    login_ticket: str | None = None


class TotpLoginRequest(BaseModel):
    login_ticket: str
    code: str = Field(..., min_length=4, max_length=16)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    must_change_password: bool = False
