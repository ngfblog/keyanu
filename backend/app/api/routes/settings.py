from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.crud import crud_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.settings import AboutInfo, PreferencesRead, PreferencesUpdate

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/preferences", response_model=PreferencesRead)
def get_preferences(current_user: User = Depends(get_current_user)) -> PreferencesRead:
    return PreferencesRead.model_validate(current_user)


@router.put("/preferences", response_model=PreferencesRead)
def update_preferences(
    payload: PreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PreferencesRead:
    user = crud_user.update_preferences(db, current_user, payload.model_dump(exclude_unset=True))
    return PreferencesRead.model_validate(user)


@router.get("/about", response_model=AboutInfo)
def get_about() -> AboutInfo:
    return AboutInfo(
        app_name=settings.APP_NAME,
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
    )
