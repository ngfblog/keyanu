"""Defines the fields that make up each credential template.

The frontend fetches this definition from `/api/meta/credential-templates`
so the dynamic credential form never has to hard-code field lists — adding
a new template here is enough to expose it end-to-end.
"""
from dataclasses import dataclass, field

from app.models.enums import CredentialTemplate


@dataclass(frozen=True)
class TemplateField:
    key: str
    label: str
    # text | textarea | password | monospace
    input_type: str = "text"
    required: bool = False
    secret: bool = False
    placeholder: str = ""
    help_text: str = ""


@dataclass(frozen=True)
class TemplateDefinition:
    id: CredentialTemplate
    label: str
    description: str
    icon: str
    fields: list[TemplateField] = field(default_factory=list)
    # Which field (if any) is used to auto-build the non-sensitive `summary`.
    summary_fields: list[str] = field(default_factory=list)


TEMPLATE_DEFINITIONS: dict[CredentialTemplate, TemplateDefinition] = {
    CredentialTemplate.SSH_KEY_PAIR: TemplateDefinition(
        id=CredentialTemplate.SSH_KEY_PAIR,
        label="SSH Key Pair",
        description="An SSH public/private key pair used to authenticate to a host.",
        icon="key-round",
        fields=[
            TemplateField("private_key", "Private Key", "monospace", required=True, secret=True,
                           placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"),
            TemplateField("public_key", "Public Key", "monospace", required=False, secret=False,
                           placeholder="ssh-ed25519 AAAA..."),
            TemplateField("passphrase", "Passphrase", "password", required=False, secret=True),
            TemplateField("fingerprint", "Fingerprint", "text", required=False, secret=False,
                           placeholder="SHA256:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"),
            TemplateField("algorithm", "Algorithm", "text", required=False, secret=False,
                           placeholder="ed25519, rsa-4096, ecdsa-p256"),
            TemplateField("comment", "Comment", "text", required=False, secret=False,
                           placeholder="user@host"),
        ],
        summary_fields=["algorithm", "fingerprint"],
    ),
    CredentialTemplate.TLS_CERTIFICATE: TemplateDefinition(
        id=CredentialTemplate.TLS_CERTIFICATE,
        label="TLS Certificate",
        description="A certificate and private key pair, with optional chain.",
        icon="shield-check",
        fields=[
            TemplateField("certificate", "Certificate", "monospace", required=True, secret=False,
                           placeholder="-----BEGIN CERTIFICATE-----"),
            TemplateField("private_key", "Private Key", "monospace", required=False, secret=True,
                           placeholder="-----BEGIN PRIVATE KEY-----"),
            TemplateField("chain", "Certificate Chain", "monospace", required=False, secret=False),
            TemplateField("issuer", "Issuer", "text", required=False, secret=False),
            TemplateField("valid_until", "Valid Until", "text", required=False, secret=False,
                           placeholder="YYYY-MM-DD"),
        ],
        summary_fields=["issuer", "valid_until"],
    ),
    CredentialTemplate.API_TOKEN: TemplateDefinition(
        id=CredentialTemplate.API_TOKEN,
        label="API Token",
        description="A bearer token, API key, or personal access token.",
        icon="square-asterisk",
        fields=[
            TemplateField("token", "Token", "password", required=True, secret=True),
            TemplateField("scope", "Scope / Permissions", "text", required=False, secret=False,
                           placeholder="read:packages, repo"),
            TemplateField("expires_at", "Expires At", "text", required=False, secret=False,
                           placeholder="YYYY-MM-DD"),
        ],
        summary_fields=["scope"],
    ),
    CredentialTemplate.PASSWORD: TemplateDefinition(
        id=CredentialTemplate.PASSWORD,
        label="Password",
        description="A username and password combination.",
        icon="lock-keyhole",
        fields=[
            TemplateField("username", "Username", "text", required=False, secret=False),
            TemplateField("password", "Password", "password", required=True, secret=True),
            TemplateField("url", "Login URL", "text", required=False, secret=False,
                           placeholder="https://192.168.1.1"),
        ],
        summary_fields=["username"],
    ),
    CredentialTemplate.WIREGUARD_PEER: TemplateDefinition(
        id=CredentialTemplate.WIREGUARD_PEER,
        label="WireGuard Peer",
        description="A WireGuard peer configuration.",
        icon="shuffle",
        fields=[
            TemplateField("private_key", "Private Key", "password", required=True, secret=True),
            TemplateField("public_key", "Public Key", "monospace", required=False, secret=False),
            TemplateField("preshared_key", "Preshared Key", "password", required=False, secret=True),
            TemplateField("endpoint", "Endpoint", "text", required=False, secret=False,
                           placeholder="vpn.example.com:51820"),
            TemplateField("allowed_ips", "Allowed IPs", "text", required=False, secret=False,
                           placeholder="0.0.0.0/0, ::/0"),
        ],
        summary_fields=["endpoint"],
    ),
    CredentialTemplate.TOTP: TemplateDefinition(
        id=CredentialTemplate.TOTP,
        label="2FA / TOTP Secret",
        description="Store a 2FA/TOTP secret from an existing service. This does not create a new 2FA setup by itself.",
        icon="scan-line",
        fields=[
            TemplateField("secret", "Secret", "password", required=True, secret=True),
            TemplateField("account", "Account", "text", required=False, secret=False),
            TemplateField("digits", "Digits", "text", required=False, secret=False, placeholder="6",
                           help_text="Advanced"),
            TemplateField("period", "Period (seconds)", "text", required=False, secret=False,
                           placeholder="30", help_text="Advanced"),
        ],
        summary_fields=["account", "issuer"],
    ),
    CredentialTemplate.GPG_KEY: TemplateDefinition(
        id=CredentialTemplate.GPG_KEY,
        label="GPG Key",
        description="A GPG public/private key pair.",
        icon="stamp",
        fields=[
            TemplateField("private_key", "Private Key", "monospace", required=True, secret=True,
                           placeholder="-----BEGIN PGP PRIVATE KEY BLOCK-----"),
            TemplateField("public_key", "Public Key", "monospace", required=False, secret=False),
            TemplateField("passphrase", "Passphrase", "password", required=False, secret=True),
            TemplateField("key_id", "Key ID", "text", required=False, secret=False),
        ],
        summary_fields=["key_id"],
    ),
    CredentialTemplate.SECURE_NOTE: TemplateDefinition(
        id=CredentialTemplate.SECURE_NOTE,
        label="Secure Note",
        description="Free-form encrypted text for anything else sensitive.",
        icon="sticky-note",
        fields=[
            TemplateField("content", "Content", "monospace", required=True, secret=True),
        ],
        summary_fields=[],
    ),
    CredentialTemplate.CUSTOM: TemplateDefinition(
        id=CredentialTemplate.CUSTOM,
        label="Custom",
        description="A free-form set of key/value fields for anything not covered above.",
        icon="puzzle",
        fields=[
            TemplateField("field_1_label", "Field 1 Label", "text", required=False, secret=False),
            TemplateField("field_1_value", "Field 1 Value", "password", required=False, secret=True),
            TemplateField("field_2_label", "Field 2 Label", "text", required=False, secret=False),
            TemplateField("field_2_value", "Field 2 Value", "password", required=False, secret=True),
            TemplateField("notes", "Notes", "textarea", required=False, secret=False),
        ],
        summary_fields=[],
    ),
}


def get_template_definition(template: CredentialTemplate) -> TemplateDefinition:
    return TEMPLATE_DEFINITIONS[template]


def required_fields(template: CredentialTemplate) -> list[str]:
    return [f.key for f in TEMPLATE_DEFINITIONS[template].fields if f.required]


def all_field_keys(template: CredentialTemplate) -> list[str]:
    return [f.key for f in TEMPLATE_DEFINITIONS[template].fields]


def build_summary(template: CredentialTemplate, values: dict[str, str]) -> str:
    definition = TEMPLATE_DEFINITIONS[template]
    parts = [values[key] for key in definition.summary_fields if values.get(key)]
    return " · ".join(parts)
