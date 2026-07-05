from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.core.templates import TEMPLATE_DEFINITIONS
from app.models.enums import ResourceType
from app.models.user import User
from app.schemas.credential import TemplateDefinitionSchema

router = APIRouter(prefix="/meta", tags=["meta"])


@router.get("/credential-templates", response_model=list[TemplateDefinitionSchema])
def get_credential_templates(current_user: User = Depends(get_current_user)):
    return [
        TemplateDefinitionSchema(
            id=definition.id,
            label=definition.label,
            description=definition.description,
            icon=definition.icon,
            fields=[
                {
                    "key": f.key,
                    "label": f.label,
                    "input_type": f.input_type,
                    "required": f.required,
                    "secret": f.secret,
                    "placeholder": f.placeholder,
                    "help_text": f.help_text,
                }
                for f in definition.fields
            ],
        )
        for definition in TEMPLATE_DEFINITIONS.values()
    ]


@router.get("/resource-types", response_model=list[str])
def get_resource_types(current_user: User = Depends(get_current_user)):
    return [rt.value for rt in ResourceType]
