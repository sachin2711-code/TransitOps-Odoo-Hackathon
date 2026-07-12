import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator
from .models import RoleEnum, VehicleStatus, DriverStatus, TripStatus, MaintenanceStatus


# ---------- Auth ----------
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: RoleEnum


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: RoleEnum

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    # Conflict resolved: Kept new fields below
    role: Optional[RoleEnum] = None
    remember_me: bool = False


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str


# ---------- Vehicle ----------
class VehicleCreate(BaseModel):
    registration_number: str
    name: str
    type: str
    max_load_capacity: float
    odometer: float = 0
    acquisition_cost: float = 0
    region: Optional[str] = None


class VehicleUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    max_load_capacity: Optional[float] = None
    odometer: Optional[float] = None
    acquisition_cost: Optional[float] = None
    status: Optional[VehicleStatus] = None
    region: Optional[str] = None


class VehicleOut(BaseModel):
    id: int
    registration_number: str
    name: str
    type: str
    max_load_capacity: float
    odometer: float
    acquisition_cost: float
    status: VehicleStatus
    region: Optional[str] = None

    class Config:
        from_attributes = True


# ---------- Driver ----------
class DriverCreate(BaseModel):
    name: str
    license_number: str
    license_category: str
    license_expiry_date: datetime.date
    contact_number: Optional[str] = None
    safety_score: float = 100


class DriverUpdate(BaseModel):
    name: Optional[str] = None
    license_category: Optional[str] = None
    license_expiry_date: Optional[datetime.date] = None
    contact_number: Optional[str] = None
    safety_score: Optional[float] = None
    status: Optional[DriverStatus] = None


class DriverOut(BaseModel):
    id: int
    name: str
    license_number: str
    license_category: str
    license_expiry_date: datetime.date
    contact_number: Optional[str] = None
    safety_score: float
    status: DriverStatus
    # Conflict resolved: Kept new fields below
    trip_completion_pct: float = 0
    completed_trip_count: int = 0
    assigned_trip_count: int = 0

    class Config:
        from_attributes = True


# ---------- Trip ----------
class TripCreate(BaseModel):
    source: str
    destination: str
    vehicle_id: int
    driver_id: int
    cargo_weight: float
    planned_distance: float


class TripComplete(BaseModel):
    final_odometer: float
    fuel_consumed: float
    fuel_cost: float = 0
    revenue: float = 0


class TripOut(BaseModel):
    id: int
    source: str
    destination: str
    vehicle_id: int
    driver_id: int
    cargo_weight: float
    planned_distance: float
    status: TripStatus
    final_odometer: Optional[float] = None
    fuel_consumed: Optional[float] = None
    revenue: Optional[float] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# ---------- Maintenance ----------
class MaintenanceCreate(BaseModel):
    vehicle_id: int
    description: str
    cost: float = 0
    date: Optional[datetime.date] = None
    notes: Optional[str] = None


class MaintenanceClose(BaseModel):
    retire_vehicle: bool = False


class MaintenanceOut(BaseModel):
    id: int
    vehicle_id: int
    description: str
    cost: float
    date: datetime.date
    status: MaintenanceStatus
    retire_vehicle: bool
    notes: Optional[str] = None

    class Config:
        from_attributes = True


# ---------- Fuel ----------
class FuelLogCreate(BaseModel):
    vehicle_id: int
    liters: float
    cost: float
    date: Optional[datetime.date] = None


class FuelLogOut(BaseModel):
    id: int
    vehicle_id: int
    liters: float
    cost: float
    date: datetime.date

    class Config:
        from_attributes = True


# ---------- Expense ----------
class ExpenseCreate(BaseModel):
    vehicle_id: int
    type: str
    amount: float
    date: Optional[datetime.date] = None
    notes: Optional[str] = None


class ExpenseOut(BaseModel):
    id: int
    vehicle_id: int
    type: str
    amount: float
    date: datetime.date
    notes: Optional[str] = None

    class Config:
        from_attributes = True