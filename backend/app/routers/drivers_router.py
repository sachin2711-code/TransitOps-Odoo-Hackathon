import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/api/drivers", tags=["drivers"])


@router.get("", response_model=List[schemas.DriverOut])
def list_drivers(
    status: Optional[str] = None,
    dispatch_pool: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    q = db.query(models.Driver)
    if status:
        q = q.filter(models.Driver.status == status)
    if dispatch_pool:
        today = datetime.date.today()
        q = q.filter(
            models.Driver.status == models.DriverStatus.Available,
            models.Driver.license_expiry_date >= today,
        )
    return q.order_by(models.Driver.id.desc()).all()


@router.post("", response_model=schemas.DriverOut)
def create_driver(
    payload: schemas.DriverCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("fleet_manager", "safety_officer")),
):
    existing = db.query(models.Driver).filter(
        models.Driver.license_number == payload.license_number
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="License number must be unique.")
    driver = models.Driver(**payload.model_dump())
    db.add(driver)
    db.commit()
    db.refresh(driver)
    return driver


@router.get("/{driver_id}", response_model=schemas.DriverOut)
def get_driver(driver_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    driver = db.query(models.Driver).filter(models.Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found.")
    return driver


@router.put("/{driver_id}", response_model=schemas.DriverOut)
def update_driver(
    driver_id: int,
    payload: schemas.DriverUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("fleet_manager", "safety_officer")),
):
    driver = db.query(models.Driver).filter(models.Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found.")
    if driver.status == models.DriverStatus.On_Trip and payload.status and payload.status != models.DriverStatus.On_Trip:
        raise HTTPException(status_code=400, detail="Cannot manually change status of a driver currently On Trip.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(driver, field, value)
    db.commit()
    db.refresh(driver)
    return driver


@router.delete("/{driver_id}")
def delete_driver(
    driver_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("fleet_manager", "safety_officer")),
):
    driver = db.query(models.Driver).filter(models.Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found.")
    if driver.status == models.DriverStatus.On_Trip:
        raise HTTPException(status_code=400, detail="Cannot delete a driver currently On Trip.")
    db.delete(driver)
    db.commit()
    return {"detail": "Driver deleted."}
