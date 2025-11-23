"""FastAPI application entry point"""

import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router, set_instances
from app.config import get_settings
from app.core.feature_detector import FeatureDetector
from app.core.model_store import ModelStore

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan: startup and shutdown"""
    settings = get_settings()

    # Startup
    logger.info("Starting Modx service...")

    # Step 1: Initialize feature detector (doesn't require LM-SAEs)
    logger.info("Step 1: Initializing feature detector...")
    try:
        feature_detector = FeatureDetector(
            quarantined_features_path=settings.quarantined_features_path,
            activation_threshold=settings.activation_threshold,
        )
        logger.info("Feature detector initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize feature detector: {e}", exc_info=True)
        raise

    # Step 2: Initialize model store
    logger.info("Step 2: Initializing model store...")
    try:
        model_store = ModelStore()
        logger.info("Model store initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize model store: {e}", exc_info=True)
        raise

    # Initialize managers as None - they will be created on-demand when analyzing models
    model_manager = None
    sae_manager = None
    inference_pipeline = None

    # Set global instances for routes
    set_instances(model_manager, sae_manager, feature_detector, inference_pipeline, model_store)

    logger.info("Modx service started successfully! Models and SAEs will be loaded on-demand.")

    yield

    # Shutdown
    logger.info("Shutting down Modx service...")
    # Cleanup if needed
    logger.info("Shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="Modx API",
    description="LLM inference with quarantined feature detection",
    version="0.1.0",
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(router, prefix="/api/v1", tags=["api"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Modx",
        "version": "0.1.0",
        "status": "running",
        "docs": "/docs",
    }

