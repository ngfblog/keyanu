from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import generate_recovery_code, hash_password, verify_password
from app.models.recovery_code import RecoveryCode


def replace_codes(db: Session, user_id: str, count: int = 10) -> list[str]:
    """Deletes any existing codes and generates a fresh set. Returns plaintext
    codes -- callers must show these to the user exactly once and never store
    them anywhere but this call's return value."""
    db.query(RecoveryCode).filter(RecoveryCode.user_id == user_id).delete()

    plaintext_codes: list[str] = []
    for _ in range(count):
        code = generate_recovery_code()
        plaintext_codes.append(code)
        db.add(RecoveryCode(user_id=user_id, code_hash=hash_password(code)))
    db.commit()
    return plaintext_codes


def clear_codes(db: Session, user_id: str) -> None:
    db.query(RecoveryCode).filter(RecoveryCode.user_id == user_id).delete()
    db.commit()


def count_remaining(db: Session, user_id: str) -> int:
    return (
        db.query(RecoveryCode)
        .filter(RecoveryCode.user_id == user_id, RecoveryCode.used_at.is_(None))
        .count()
    )


def verify_and_consume(db: Session, user_id: str, code: str) -> bool:
    stmt = select(RecoveryCode).where(RecoveryCode.user_id == user_id, RecoveryCode.used_at.is_(None))
    candidates = db.execute(stmt).scalars().all()
    for candidate in candidates:
        if verify_password(code.strip().upper(), candidate.code_hash):
            candidate.used_at = datetime.now(timezone.utc)
            db.add(candidate)
            db.commit()
            return True
    return False
