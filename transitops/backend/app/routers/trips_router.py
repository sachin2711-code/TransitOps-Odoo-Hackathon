import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/api/trips", tags=["trips"])


@router.get("", response_model=List[schemas.TripOut])
def list_trips(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    q = db.query(models.Trip)
    if status:
        q = q.filter(models.Trip.status == status)
    return q.order_by(models.Trip.id.desc()).all()


@router.post("", response_model=schemas.TripOut)
def create_trip(
    payload: schemas.TripCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("fleet_manager", "driver")),
):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == payload.vehicle_id).first()
    driver = db.query(models.Driver).filter(models.Driver.id == payload.driver_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found.")
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found.")

    if payload.cargo_weight > vehicle.max_load_capacity:
        raise HTTPException(
            status_code=400,
            detail=f"Cargo weight ({payload.cargo_weight}kg) exceeds vehicle max load capacity ({vehicle.max_load_capacity}kg).",
        )

    trip = models.Trip(
        source=payload.source,
        destination=payload.destination,
        vehicle_id=payload.vehicle_id,
        driver_id=payload.driver_id,
        cargo_weight=payload.cargo_weight,
        planned_distance=payload.planned_distance,
        status=models.TripStatus.Draft,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


def _validate_dispatch(db: Session, trip: models.Trip):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == trip.vehicle_id).first()
    driver = db.query(models.Driver).filter(models.Driver.id == trip.driver_id).first()

    if vehicle.status in (models.VehicleStatus.Retired, models.VehicleStatus.In_Shop):
        raise HTTPException(status_code=400, detail="Retired or In Shop vehicles cannot be dispatched.")
    if vehicle.status == models.VehicleStatus.On_Trip:
        raise HTTPException(status_code=400, detail="Vehicle is already assigned to another trip.")
    if driver.status == models.DriverStatus.Suspended:
        raise HTTPException(status_code=400, detail="Suspended drivers cannot be assigned to trips.")
    if driver.status == models.DriverStatus.On_Trip:
        raise HTTPException(status_code=400, detail="Driver is already assigned to another trip.")
    if driver.license_expiry_date < datetime.date.today():
        raise HTTPException(status_code=400, detail="Driver's license has expired; cannot be assigned to trips.")
    if trip.cargo_weight > vehicle.max_load_capacity:
        raise HTTPException(status_code=400, detail="Cargo weight exceeds vehicle max load capacity.")
    return vehicle, driver


@router.post("/{trip_id}/dispatch", response_model=schemas.TripOut)
def dispatch_trip(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("fleet_manager", "driver")),
):
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")
    if trip.status != models.TripStatus.Draft:
        raise HTTPException(status_code=400, detail="Only Draft trips can be dispatched.")

    vehicle, driver = _validate_dispatch(db, trip)

    trip.status = models.TripStatus.Dispatched
    trip.dispatched_at = datetime.datetime.utcnow()
    vehicle.status = models.VehicleStatus.On_Trip
    driver.status = models.DriverStatus.On_Trip
    db.commit()
    db.refresh(trip)
    return trip


@router.post("/{trip_id}/complete", response_model=schemas.TripOut)
def complete_trip(
    trip_id: int,
    payload: schemas.TripComplete,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("fleet_manager", "driver")),
):
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")
    if trip.status != models.TripStatus.Dispatched:
        raise HTTPException(status_code=400, detail="Only Dispatched trips can be completed.")

    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == trip.vehicle_id).first()
    driver = db.query(models.Driver).filter(models.Driver.id == trip.driver_id).first()

    trip.status = models.TripStatus.Completed
    trip.final_odometer = payload.final_odometer
    trip.fuel_consumed = payload.fuel_consumed
    trip.revenue = payload.revenue
    trip.completed_at = datetime.datetime.utcnow()

    vehicle.odometer = payload.final_odometer
    vehicle.status = models.VehicleStatus.Available
    driver.status = models.DriverStatus.Available

    if payload.fuel_consumed and payload.fuel_consumed > 0:
        fuel_log = models.FuelLog(
            vehicle_id=vehicle.id,
            trip_id=trip.id,
            liters=payload.fuel_consumed,
            cost=payload.fuel_cost,
            date=datetime.date.today(),
        )
        db.add(fuel_log)

    db.commit()
    db.refresh(trip)
    return trip


@router.post("/{trip_id}/cancel", response_model=schemas.TripOut)
def cancel_trip(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("fleet_manager", "driver")),
):
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")
    if trip.status not in (models.TripStatus.Draft, models.TripStatus.Dispatched):
        raise HTTPException(status_code=400, detail="Only Draft or Dispatched trips can be cancelled.")

    was_dispatched = trip.status == models.TripStatus.Dispatched
    trip.status = models.TripStatus.Cancelled

    if was_dispatched:
        vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == trip.vehicle_id).first()
        driver = db.query(models.Driver).filter(models.Driver.id == trip.driver_id).first()
        if vehicle.status == models.VehicleStatus.On_Trip:
            vehicle.status = models.VehicleStatus.Available
        if driver.status == models.DriverStatus.On_Trip:
            driver.status = models.DriverStatus.Available

    db.commit()
    db.refresh(trip)
    return trip


@router.get("/{trip_id}", response_model=schemas.TripOut)
def get_trip(trip_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")
    return trip
