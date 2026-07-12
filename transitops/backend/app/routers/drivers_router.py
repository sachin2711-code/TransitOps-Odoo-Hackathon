import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/api/drivers", tags=["drivers"])


def _attach_trip_stats(driver: models.Driver, db: Session) -> models.Driver:
    """Compute trip completion % for a driver: completed trips out of all trips
    that were actually assigned (i.e. dispatched at some point — Completed or
    Cancelled-after-dispatch). Draft trips that never dispatched aren't counted.
    These are plain (non-persisted) attributes attached for the response only."""
    assigned = db.query(models.Trip).filter(
        models.Trip.driver_id == driver.id,
        models.Trip.status.in_([models.TripStatus.Completed, models.TripStatus.Dispatched, models.TripStatus.Cancelled]),
    ).all()
    completed = [t for t in assigned if t.status == models.TripStatus.Completed]
    total = len(assigned)
    driver.completed_trip_count = len(completed)
    driver.assigned_trip_count = total
    driver.trip_completion_pct = round((len(completed) / total) * 100, 1) if total else 0.0
    return driver


def _attach_trip_stats_bulk(drivers: List[models.Driver], db: Session) -> List[models.Driver]:
    return [_attach_trip_stats(d, db) for d in drivers]


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
    return _attach_trip_stats_bulk(q.order_by(models.Driver.id.desc()).all(), db)


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
    return _attach_trip_stats(driver, db)


@router.get("/{driver_id}", response_model=schemas.DriverOut)
def get_driver(driver_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    driver = db.query(models.Driver).filter(models.Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found.")
    return _attach_trip_stats(driver, db)


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
    return _attach_trip_stats(driver, db)


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