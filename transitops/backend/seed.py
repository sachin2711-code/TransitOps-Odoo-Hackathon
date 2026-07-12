"""
Seed the TransitOps database with demo users and sample fleet data.
Run with:  python seed.py
"""
import datetime
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine
from app import models, auth

models.Base.metadata.create_all(bind=engine)

db = SessionLocal()

DEMO_USERS = [
    {"name": "Priya Sharma", "email": "fleet.manager@transitops.demo", "password": "password123", "role": models.RoleEnum.fleet_manager},
    {"name": "Alex Kumar", "email": "driver@transitops.demo", "password": "password123", "role": models.RoleEnum.driver},
    {"name": "Ravi Menon", "email": "safety.officer@transitops.demo", "password": "password123", "role": models.RoleEnum.safety_officer},
    {"name": "Neha Gupta", "email": "finance@transitops.demo", "password": "password123", "role": models.RoleEnum.financial_analyst},
]

print("Seeding users...")
for u in DEMO_USERS:
    existing = db.query(models.User).filter(models.User.email == u["email"]).first()
    if existing:
        print(f"  - {u['email']} already exists, skipping.")
        continue
    user = models.User(
        name=u["name"], email=u["email"],
        password_hash=auth.hash_password(u["password"]),
        role=u["role"],
    )
    db.add(user)
    print(f"  + created {u['email']} / {u['password']} ({u['role'].value})")
db.commit()

print("Seeding vehicles...")
sample_vehicles = [
    {"registration_number": "VAN-05", "name": "Tata Ace Gold", "type": "Van", "max_load_capacity": 500, "odometer": 12500, "acquisition_cost": 650000, "region": "North"},
    {"registration_number": "TRK-11", "name": "Ashok Leyland Dost", "type": "Truck", "max_load_capacity": 2000, "odometer": 45000, "acquisition_cost": 1800000, "region": "South"},
    {"registration_number": "VAN-09", "name": "Mahindra Bolero Pickup", "type": "Van", "max_load_capacity": 700, "odometer": 30200, "acquisition_cost": 800000, "region": "East"},
]
for v in sample_vehicles:
    existing = db.query(models.Vehicle).filter(models.Vehicle.registration_number == v["registration_number"]).first()
    if existing:
        continue
    db.add(models.Vehicle(**v))
db.commit()

print("Seeding drivers...")
sample_drivers = [
    {"name": "Alex Kumar", "license_number": "DL-1420110012345", "license_category": "LMV", "license_expiry_date": datetime.date.today() + datetime.timedelta(days=400), "contact_number": "9876500001", "safety_score": 92},
    {"name": "Suresh Rao", "license_number": "DL-1420110099887", "license_category": "HMV", "license_expiry_date": datetime.date.today() + datetime.timedelta(days=180), "contact_number": "9876500002", "safety_score": 88},
    {"name": "Meera Iyer", "license_number": "DL-1420110055221", "license_category": "LMV", "license_expiry_date": datetime.date.today() - datetime.timedelta(days=10), "contact_number": "9876500003", "safety_score": 75},
]
for d in sample_drivers:
    existing = db.query(models.Driver).filter(models.Driver.license_number == d["license_number"]).first()
    if existing:
        continue
    db.add(models.Driver(**d))
db.commit()

print("Done. Demo login credentials:")
for u in DEMO_USERS:
    print(f"  {u['role'].value:20s} -> {u['email']} / {u['password']}")

db.close()
