import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/api/expenses", tags=["expenses"])


@router.get("", response_model=List[schemas.ExpenseOut])
def list_expenses(
    vehicle_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    q = db.query(models.Expense)
    if vehicle_id:
        q = q.filter(models.Expense.vehicle_id == vehicle_id)
    return q.order_by(models.Expense.id.desc()).all()


@router.post("", response_model=schemas.ExpenseOut)
def create_expense(
    payload: schemas.ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("fleet_manager", "financial_analyst")),
):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == payload.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found.")
    expense = models.Expense(
        vehicle_id=payload.vehicle_id,
        type=payload.type,
        amount=payload.amount,
        date=payload.date or datetime.date.today(),
        notes=payload.notes,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense
