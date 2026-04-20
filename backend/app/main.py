"""ExpensIQ — FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager
from pathlib import Path

import boto3
from botocore.exceptions import ClientError
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.routes import alerts, analytics, auth, employees, periods, projects, receipts, settings as settings_routes, transactions

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("expensiq")

DASHBOARD_PATH = Path("/app/dashboard.html")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure MinIO bucket exists
    try:
        s3 = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )
        try:
            s3.head_bucket(Bucket=settings.S3_BUCKET)
            logger.info("S3 bucket '%s' already exists", settings.S3_BUCKET)
        except ClientError:
            s3.create_bucket(Bucket=settings.S3_BUCKET)
            logger.info("Created S3 bucket '%s'", settings.S3_BUCKET)
    except Exception as e:
        logger.warning("Could not connect to S3/MinIO: %s", e)

    # Start period scheduler (reminders + auto-close)
    from app.services.email_service import start_scheduler
    start_scheduler()

    logger.info("ExpensIQ API started (env=%s)", settings.APP_ENV)
    yield
    logger.info("ExpensIQ API shutting down")


app = FastAPI(
    title="ExpensIQ API",
    description="AI-powered expense management and reconciliation",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

# Disable Starlette's automatic trailing-slash redirects.
# These redirects use the internal Docker hostname (backend:8000)
# which the browser can't resolve when proxied through Next.js.
app.router.redirect_slashes = False

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(employees.router, prefix="/api/v1/employees", tags=["employees"])
app.include_router(receipts.router, prefix="/api/v1/receipts", tags=["receipts"])
app.include_router(transactions.router, prefix="/api/v1/transactions", tags=["transactions"])
app.include_router(alerts.router, prefix="/api/v1/alerts", tags=["alerts"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["analytics"])
app.include_router(periods.router, prefix="/api/v1/periods", tags=["periods"])
app.include_router(projects.router, prefix="/api/v1/projects", tags=["projects"])
app.include_router(settings_routes.router, prefix="/api/v1/settings", tags=["settings"])


# Static files (receipt images, etc.)
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/", include_in_schema=False)
def serve_dashboard():
    if DASHBOARD_PATH.exists():
        return FileResponse(DASHBOARD_PATH, media_type="text/html")
    return JSONResponse({"error": "dashboard.html not found"}, status_code=404)


@app.post("/api/v1/demo/seed", tags=["demo"])
def seed_demo_data():
    """Load demo data (employees, receipts, transactions, alerts) into the database."""
    from scripts.seed_demo import seed
    result = seed()
    return result or {"status": "ok"}


@app.delete("/api/v1/demo/reset", tags=["demo"])
def reset_demo_data():
    """Clear all data from the database for a fresh start."""
    from app.db.session import SessionLocal
    from app.models.models import Alert, Match, BankTransaction, Receipt, Employee
    db = SessionLocal()
    try:
        db.query(Alert).delete()
        db.query(Match).delete()
        db.query(BankTransaction).delete()
        db.query(Receipt).delete()
        db.query(Employee).delete()
        db.commit()
        return {"status": "ok", "message": "All data cleared"}
    finally:
        db.close()


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )
