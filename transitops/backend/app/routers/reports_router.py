import csv
import io
from typing import Optional
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from .. import models, auth
from ..database import get_db

router = APIRouter(prefix="/api", tags=["reports"])


@router.get("/dashboard")
def dashboard(
    type: Optional[str] = None,
    status: Optional[str] = None,
    region: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    vq = db.query(models.Vehicle)
    if type:
        vq = vq.filter(models.Vehicle.type == type)
    if status:
        vq = vq.filter(models.Vehicle.status == status)
    if region:
        vq = vq.filter(models.Vehicle.region == region)
    vehicles = vq.all()

    total_vehicles = len(vehicles)
    active_vehicles = len([v for v in vehicles if v.status != models.VehicleStatus.Retired])
    available_vehicles = len([v for v in vehicles if v.status == models.VehicleStatus.Available])
    in_maintenance = len([v for v in vehicles if v.status == models.VehicleStatus.In_Shop])
    on_trip_vehicles = len([v for v in vehicles if v.status == models.VehicleStatus.On_Trip])

    active_trips = db.query(models.Trip).filter(models.Trip.status == models.TripStatus.Dispatched).count()
    pending_trips = db.query(models.Trip).filter(models.Trip.status == models.TripStatus.Draft).count()
    drivers_on_duty = db.query(models.Driver).filter(models.Driver.status == models.DriverStatus.On_Trip).count()

    fleet_utilization = round((on_trip_vehicles / active_vehicles) * 100, 2) if active_vehicles else 0.0

    return {
        "active_vehicles": active_vehicles,
        "available_vehicles": available_vehicles,
        "vehicles_in_maintenance": in_maintenance,
        "active_trips": active_trips,
        "pending_trips": pending_trips,
        "drivers_on_duty": drivers_on_duty,
        "fleet_utilization_pct": fleet_utilization,
        "total_vehicles": total_vehicles,
    }


def _vehicle_report_rows(db: Session):
    vehicles = db.query(models.Vehicle).all()
    rows = []
    for v in vehicles:
        completed_trips = [t for t in v.trips if t.status == models.TripStatus.Completed]
        # distance is sum of planned_distance for completed trips (proxy for actual distance travelled)
        total_distance = sum(t.planned_distance or 0 for t in completed_trips)
        total_fuel = sum(f.liters for f in v.fuel_logs)
        total_fuel_cost = sum(f.cost for f in v.fuel_logs)
        total_maintenance_cost = sum(m.cost for m in v.maintenance_logs)
        total_expenses = sum(e.amount for e in v.expenses)
        total_revenue = sum(t.revenue or 0 for t in completed_trips)

        fuel_efficiency = round(total_distance / total_fuel, 2) if total_fuel else None
        operational_cost = round(total_fuel_cost + total_maintenance_cost + total_expenses, 2)
        roi = None
        if v.acquisition_cost:
            roi = round((total_revenue - (total_maintenance_cost + total_fuel_cost)) / v.acquisition_cost, 4)

        rows.append({
            "vehicle_id": v.id,
            "registration_number": v.registration_number,
            "name": v.name,
            "status": v.status.value if hasattr(v.status, "value") else v.status,
            "total_distance_km": total_distance,
            "total_fuel_liters": total_fuel,
            "fuel_efficiency_km_per_liter": fuel_efficiency,
            "total_fuel_cost": round(total_fuel_cost, 2),
            "total_maintenance_cost": round(total_maintenance_cost, 2),
            "total_expenses": round(total_expenses, 2),
            "operational_cost": operational_cost,
            "total_revenue": round(total_revenue, 2),
            "acquisition_cost": v.acquisition_cost,
            "roi": roi,
        })
    return rows


@router.get("/reports/vehicles")
def vehicle_reports(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return _vehicle_report_rows(db)


@router.get("/reports/vehicles/export.csv")
def export_vehicle_reports_csv(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    rows = _vehicle_report_rows(db)
    output = io.StringIO()
    if rows:
        writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=transitops_vehicle_report.csv"},
    )
