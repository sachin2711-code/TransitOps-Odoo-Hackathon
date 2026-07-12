import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15

@router.post("/register", response_model=schemas.UserOut)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered.")
    user = models.User(
        name=payload.name,
        email=payload.email,
        password_hash=auth.hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=schemas.Token)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()

    # Account lockout check (applies even if the account doesn't exist, to avoid
    # leaking which emails are registered via timing/behavior differences is out of
    # scope for this hackathon build, so we just guard the existing-user path).
    if user and user.locked_until and user.locked_until > datetime.datetime.utcnow():
        remaining = int((user.locked_until - datetime.datetime.utcnow()).total_seconds() // 60) + 1
        raise HTTPException(
            status_code=423,
            detail=f"Account locked due to too many failed attempts. Try again in {remaining} minute(s).",
        )

    valid = user and auth.verify_password(payload.password, user.password_hash)

    if not valid:
        if user:
            user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
            if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
                user.locked_until = datetime.datetime.utcnow() + datetime.timedelta(minutes=LOCKOUT_MINUTES)
                db.commit()
                raise HTTPException(
                    status_code=423,
                    detail=f"Account locked after {MAX_FAILED_ATTEMPTS} failed attempts. Try again in {LOCKOUT_MINUTES} minutes.",
                )
            db.commit()
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    # Optional role check: if the login form's role selector doesn't match the
    # account's actual role, reject (mirrors the wireframe's role-scoped login).
    if payload.role and user.role.value != payload.role.value:
        raise HTTPException(
            status_code=401,
            detail=f"This account is registered as '{user.role.value.replace('_', ' ').title()}', not the selected role.",
        )

    # Reset lockout counters on a successful login.
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()

    expire_minutes = auth.ACCESS_TOKEN_EXPIRE_MINUTES if payload.remember_me else auth.SHORT_SESSION_MINUTES
    token = auth.create_access_token({"sub": str(user.id), "role": user.role.value}, expire_minutes=expire_minutes)
    return schemas.Token(access_token=token, user=user)


@router.post("/forgot-password", response_model=schemas.ForgotPasswordResponse)
def forgot_password(payload: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    # Always return the same generic message whether or not the account exists,
    # so the endpoint can't be used to enumerate registered emails.
    if user:
        # Hackathon scope: no real email delivery. In production this would
        # generate a signed, expiring reset token and email it to the user.
        user.failed_login_attempts = 0
        user.locked_until = None
        db.commit()
    return schemas.ForgotPasswordResponse(
        message="If an account exists for that email, password reset instructions have been sent."
    )


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user