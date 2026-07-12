import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

import mimetypes
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("text/css", ".css")

from . import models
from .database import engine
from .routers import (
    auth_router, vehicles_router, drivers_router, trips_router,
    maintenance_router, fuel_router, expenses_router, reports_router,
)

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="TransitOps API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(vehicles_router.router)
app.include_router(drivers_router.router)
app.include_router(trips_router.router)
app.include_router(maintenance_router.router)
app.include_router(fuel_router.router)
app.include_router(expenses_router.router)
app.include_router(reports_router.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


# Serve the frontend (single-page app) from the same server
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "frontend")

if os.path.isdir(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

    @app.get("/")
    def serve_index():
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        candidate = os.path.join(FRONTEND_DIR, full_path)
        if os.path.isfile(candidate):
            if candidate.endswith(".js"):
                return FileResponse(candidate, media_type="application/javascript")
            if candidate.endswith(".css"):
                return FileResponse(candidate, media_type="text/css")
            if candidate.endswith(".mjs"):
                return FileResponse(candidate, media_type="application/javascript")
            return FileResponse(candidate)
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
