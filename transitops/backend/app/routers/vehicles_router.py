from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/api/vehicles", tags=["vehicles"])


@router.get("", response_model=List[schemas.VehicleOut])
def list_vehicles(
    status: Optional[str] = None,
    type: Optional[str] = None,
    region: Optional[str] = None,
    dispatch_pool: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    q = db.query(models.Vehicle)
    if status:
        q = q.filter(models.Vehicle.status == status)
    if type:
        q = q.filter(models.Vehicle.type == type)
    if region:
        q = q.filter(models.Vehicle.region == region)
    if dispatch_pool:
        # Retired or In Shop vehicles must never appear in dispatch selection
        q = q.filter(models.Vehicle.status == models.VehicleStatus.Available)
    return q.order_by(models.Vehicle.id.desc()).all()


@router.post("", response_model=schemas.VehicleOut)
def create_vehicle(
    payload: schemas.VehicleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("fleet_manager")),
):
    existing = db.query(models.Vehicle).filter(
        models.Vehicle.registration_number == payload.registration_number
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Registration number must be unique.")
    vehicle = models.Vehicle(**payload.model_dump())
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.get("/{vehicle_id}", response_model=schemas.VehicleOut)
def get_vehicle(vehicle_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found.")
    return vehicle


@router.put("/{vehicle_id}", response_model=schemas.VehicleOut)
def update_vehicle(
    vehicle_id: int,
    payload: schemas.VehicleUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("fleet_manager")),
):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found.")
    if vehicle.status == models.VehicleStatus.On_Trip and payload.status and payload.status != models.VehicleStatus.On_Trip:
        raise HTTPException(status_code=400, detail="Cannot manually change status of a vehicle currently On Trip.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(vehicle, field, value)
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.delete("/{vehicle_id}")
def delete_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("fleet_manager")),
):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found.")
    if vehicle.status == models.VehicleStatus.On_Trip:
        raise HTTPException(status_code=400, detail="Cannot delete a vehicle that is currently On Trip.")
    db.delete(vehicle)
    db.commit()
    return {"detail": "Vehicle deleted."}
