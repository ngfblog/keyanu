from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    username: str
    display_name: str | None = None
    created_at: datetime
    must_change_password: bool = False
    totp_enabled: bool = False
