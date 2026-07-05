"""Reset the Keyanu admin password from the command line.

Useful if you're locked out and can't reach the UI. Run inside the backend
container or virtualenv:

    python -m scripts.reset_password --username admin --password "new-password"

Or inside Docker:

    docker exec -it keyanu-backend python -m scripts.reset_password \
        --username admin --password "new-password"
"""
import argparse
import sys

sys.path.insert(0, ".")

from app.crud import crud_user  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Reset a Keyanu user's password.")
    parser.add_argument("--username", required=True, help="Username to reset")
    parser.add_argument("--password", required=True, help="New password (min 8 characters)")
    args = parser.parse_args()

    if len(args.password) < 8:
        print("Password must be at least 8 characters.", file=sys.stderr)
        sys.exit(1)

    db = SessionLocal()
    try:
        user = crud_user.get_by_username(db, args.username)
        if not user:
            print(f"No user found with username '{args.username}'.", file=sys.stderr)
            sys.exit(1)
        crud_user.set_password(db, user, args.password)
        print(f"Password for '{args.username}' has been reset.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
