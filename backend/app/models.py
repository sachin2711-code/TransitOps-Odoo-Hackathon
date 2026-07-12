import enum
import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Date, DateTime, ForeignKey, Enum, Boolean, Text
)
from sqlalchemy.orm import relationship
from .database import Base


class RoleEnum(str, enum.Enum):
    fleet_manager = "fleet_manager"
    driver = "driver"
    safety_officer = "safety_officer"
    financial_analyst = "financial_analyst"


class VehicleStatus(str, enum.Enum):
    Available = "Available"
    On_Trip = "On Trip"
    In_Shop = "In Shop"
    Retired = "Retired"


class DriverStatus(str, enum.Enum):
    Available = "Available"
    On_Trip = "On Trip"
    Off_Duty = "Off Duty"
    Suspended = "Suspended"


class TripStatus(str, enum.Enum):
    Draft = "Draft"
    Dispatched = "Dispatched"
    Completed = "Completed"
    Cancelled = "Cancelled"


class MaintenanceStatus(str, enum.Enum):
    Active = "Active"
    Closed = "Closed"


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Vehicle(Base):
    __tablename__ = "vehicles"
    id = Column(Integer, primary_key=True, index=True)
    registration_number = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    max_load_capacity = Column(Float, nullable=False)
    odometer = Column(Float, default=0)
    acquisition_cost = Column(Float, default=0)
    status = Column(Enum(VehicleStatus), default=VehicleStatus.Available)
    region = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    trips = relationship("Trip", back_populates="vehicle")
    maintenance_logs = relationship("MaintenanceLog", back_populates="vehicle")
    fuel_logs = relationship("FuelLog", back_populates="vehicle")
    expenses = relationship("Expense", back_populates="vehicle")


class Driver(Base):
    __tablename__ = "drivers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    license_number = Column(String, unique=True, index=True, nullable=False)
    license_category = Column(String, nullable=False)
    license_expiry_date = Column(Date, nullable=False)
    contact_number = Column(String, nullable=True)
    safety_score = Column(Float, default=100)
    status = Column(Enum(DriverStatus), default=DriverStatus.Available)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    trips = relationship("Trip", back_populates="driver")


class Trip(Base):
    __tablename__ = "trips"
    id = Column(Integer, primary_key=True, index=True)
    source = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False)
    cargo_weight = Column(Float, nullable=False)
    planned_distance = Column(Float, nullable=False)
    status = Column(Enum(TripStatus), default=TripStatus.Draft)
    final_odometer = Column(Float, nullable=True)
    fuel_consumed = Column(Float, nullable=True)
    revenue = Column(Float, nullable=True, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    dispatched_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    vehicle = relationship("Vehicle", back_populates="trips")
    driver = relationship("Driver", back_populates="trips")


class MaintenanceLog(Base):
    __tablename__ = "maintenance_logs"
    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    description = Column(String, nullable=False)
    cost = Column(Float, default=0)
    date = Column(Date, default=datetime.date.today)
    status = Column(Enum(MaintenanceStatus), default=MaintenanceStatus.Active)
    retire_vehicle = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)

    vehicle = relationship("Vehicle", back_populates="maintenance_logs")


class FuelLog(Base):
    __tablename__ = "fuel_logs"
    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=True)
    liters = Column(Float, nullable=False)
    cost = Column(Float, nullable=False)
    date = Column(Date, default=datetime.date.today)

    vehicle = relationship("Vehicle", back_populates="fuel_logs")


class Expense(Base):
    __tablename__ = "expenses"
    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    type = Column(String, nullable=False)  # toll, maintenance, other
    amount = Column(Float, nullable=False)
    date = Column(Date, default=datetime.date.today)
    notes = Column(String, nullable=True)

    vehicle = relationship("Vehicle", back_populates="expenses")
