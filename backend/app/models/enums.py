import enum


class ResourceType(str, enum.Enum):
    PFSENSE = "pfsense"
    UNRAID = "unraid"
    MIKROTIK = "mikrotik"
    GITHUB = "github"
    CLOUDFLARE = "cloudflare"
    HOME_ASSISTANT = "home_assistant"
    DOCKER_HOST = "docker_host"
    NAS = "nas"
    ROUTER = "router"
    SERVER = "server"
    CUSTOM = "custom"


class CredentialTemplate(str, enum.Enum):
    SSH_KEY_PAIR = "ssh_key_pair"
    TLS_CERTIFICATE = "tls_certificate"
    API_TOKEN = "api_token"
    PASSWORD = "password"
    WIREGUARD_PEER = "wireguard_peer"
    TOTP = "totp"
    GPG_KEY = "gpg_key"
    SECURE_NOTE = "secure_note"
    CUSTOM = "custom"


class AuditAction(str, enum.Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    MOVE = "move"
    VIEW_SECRET = "view_secret"
    LOGIN = "login"
    LOGIN_FAILED = "login_failed"
    LOGOUT = "logout"
