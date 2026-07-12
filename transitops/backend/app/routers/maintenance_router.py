import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/api/maintenance", tags=["maintenance"])


@router.get("", response_model=List[schemas.MaintenanceOut])
def list_maintenance(
    status: Optional[str] = None,
    vehicle_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    q = db.query(models.MaintenanceLog)
    if status:
        q = q.filter(models.MaintenanceLog.status == status)
    if vehicle_id:
        q = q.filter(models.MaintenanceLog.vehicle_id == vehicle_id)
    return q.order_by(models.MaintenanceLog.id.desc()).all()


@router.post("", response_model=schemas.MaintenanceOut)
def create_maintenance(
    payload: schemas.MaintenanceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("fleet_manager")),
):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == payload.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found.")
    if vehicle.status == models.VehicleStatus.On_Trip:
        raise HTTPException(status_code=400, detail="Cannot create maintenance for a vehicle currently On Trip.")

    log = models.MaintenanceLog(
        vehicle_id=payload.vehicle_id,
        description=payload.description,
        cost=payload.cost,
        date=payload.date or datetime.date.today(),
        notes=payload.notes,
        status=models.MaintenanceStatus.Active,
    )
    db.add(log)

    # Adding an active maintenance record automatically switches vehicle status to In Shop
    vehicle.status = models.VehicleStatus.In_Shop

    db.commit()
    db.refresh(log)
    return log


@router.post("/{maintenance_id}/close", response_model=schemas.MaintenanceOut)
def close_maintenance(
    maintenance_id: int,
    payload: schemas.MaintenanceClose,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("fleet_manager")),
):
    log = db.query(models.MaintenanceLog).filter(models.MaintenanceLog.id == maintenance_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Maintenance record not found.")
    if log.status != models.MaintenanceStatus.Active:
        raise HTTPException(status_code=400, detail="Maintenance record is already closed.")

    log.status = models.MaintenanceStatus.Closed
    log.retire_vehicle = payload.retire_vehicle

    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == log.vehicle_id).first()
    # Check if vehicle has any other active maintenance logs before restoring
    other_active = db.query(models.MaintenanceLog).filter(
        models.MaintenanceLog.vehicle_id == vehicle.id,
        models.MaintenanceLog.status == models.MaintenanceStatus.Active,
        models.MaintenanceLog.id != log.id,
    ).count()

    if payload.retire_vehicle:
        vehicle.status = models.VehicleStatus.Retired
    elif other_active == 0:
        vehicle.status = models.VehicleStatus.Available

    db.commit()
    db.refresh(log)
    return log
