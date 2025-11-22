"""FastAPI application entry point"""

import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router, set_instances
from app.config import get_settings
from app.core.feature_detector import FeatureDetector
from app.core.inference import InferencePipeline
from app.core.model_manager import ModelManager
from app.core.sae_converter import SAEConverter
from app.core.sae_manager import SAEManager

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

    # Step 1: Convert SAEs (one-time, idempotent)
    logger.info("Step 1: Converting SAEs...")
    try:
        converter = SAEConverter(settings)
        layers = settings.get_sae_conversion_layers()
        success = converter.convert_saes(
            layers=layers, force=settings.force_sae_conversion
        )
        if not success:
            logger.error("SAE conversion failed. Service may not function correctly.")
            # Continue anyway - maybe some layers converted
    except Exception as e:
        logger.error(f"SAE conversion error: {e}", exc_info=True)
        raise

    # Step 2: Load model
    logger.info("Step 2: Loading model...")
    try:
        model_manager = ModelManager(settings)
        model_manager.load_model()
        logger.info("Model loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load model: {e}", exc_info=True)
        raise

    # Step 3: Load SAE for default layer
    logger.info(f"Step 3: Loading SAE for layer {settings.layer}...")
    try:
        sae_manager = SAEManager(settings)
        sae_manager.load_sae(settings.layer)
        logger.info(f"SAE loaded successfully for layer {settings.layer}")
    except Exception as e:
        logger.error(f"Failed to load SAE: {e}", exc_info=True)
        raise

    # Step 4: Initialize feature detector
    logger.info("Step 4: Initializing feature detector...")
    try:
        feature_detector = FeatureDetector(
            quarantined_features_path=settings.quarantined_features_path,
            activation_threshold=settings.activation_threshold,
        )
        logger.info("Feature detector initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize feature detector: {e}", exc_info=True)
        raise

    # Step 5: Initialize inference pipeline
    logger.info("Step 5: Initializing inference pipeline...")
    try:
        inference_pipeline = InferencePipeline(
            model_manager=model_manager,
            sae_manager=sae_manager,
            feature_detector=feature_detector,
            settings=settings,
        )
        logger.info("Inference pipeline initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize inference pipeline: {e}", exc_info=True)
        raise

    # Set global instances for routes
    set_instances(model_manager, sae_manager, feature_detector, inference_pipeline)

    logger.info("Modx service started successfully!")

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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)

