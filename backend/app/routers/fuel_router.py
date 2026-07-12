import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/api/fuel-logs", tags=["fuel"])


@router.get("", response_model=List[schemas.FuelLogOut])
def list_fuel_logs(
    vehicle_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    q = db.query(models.FuelLog)
    if vehicle_id:
        q = q.filter(models.FuelLog.vehicle_id == vehicle_id)
    return q.order_by(models.FuelLog.id.desc()).all()


@router.post("", response_model=schemas.FuelLogOut)
def create_fuel_log(
    payload: schemas.FuelLogCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("fleet_manager", "driver")),
):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == payload.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found.")
    log = models.FuelLog(
        vehicle_id=payload.vehicle_id,
        liters=payload.liters,
        cost=payload.cost,
        date=payload.date or datetime.date.today(),
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log
