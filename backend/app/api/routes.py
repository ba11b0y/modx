"""API route definitions"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, status

from app.api.schemas import (
    ConfigResponse,
    ErrorResponse,
    GenerateRequest,
    GenerateResponse,
    HealthResponse,
)
from app.config import get_settings
from app.core.feature_detector import FeatureDetector
from app.core.inference import InferencePipeline
from app.core.model_manager import ModelManager
from app.core.sae_manager import SAEManager

logger = logging.getLogger(__name__)

# Global instances (initialized in main.py)
model_manager: Optional[ModelManager] = None
sae_manager: Optional[SAEManager] = None
feature_detector: Optional[FeatureDetector] = None
inference_pipeline: Optional[InferencePipeline] = None


def set_instances(
    model_mgr: ModelManager,
    sae_mgr: SAEManager,
    feat_det: FeatureDetector,
    inf_pipe: InferencePipeline,
):
    """Set global instances (called from main.py)"""
    global model_manager, sae_manager, feature_detector, inference_pipeline
    model_manager = model_mgr
    sae_manager = sae_mgr
    feature_detector = feat_det
    inference_pipeline = inf_pipe


router = APIRouter()


@router.post("/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest):
    """
    Generate text and detect quarantined feature activations.
    """
    if inference_pipeline is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Inference pipeline not initialized",
        )

    try:
        # Prepare generation config
        gen_config = {}
        if request.max_new_tokens is not None:
            gen_config["max_new_tokens"] = request.max_new_tokens
        if request.temperature is not None:
            gen_config["temperature"] = request.temperature
        if request.top_p is not None:
            gen_config["top_p"] = request.top_p
        if request.top_k is not None:
            gen_config["top_k"] = request.top_k
        if request.do_sample is not None:
            gen_config["do_sample"] = request.do_sample

        # Generate with probing
        result = inference_pipeline.generate_with_probing(
            prompt=request.prompt,
            layer=request.layer,
            generation_config=gen_config if gen_config else None,
        )

        # Convert to response schema
        return GenerateResponse(
            generated_text=result.generated_text,
            prompt=result.prompt,
            has_quarantined_features=result.has_quarantined_features,
            activated_features=[
                {
                    "feature_index": feat.feature_index,
                    "activation_value": feat.activation_value,
                    "description": feat.description,
                    "layer": feat.layer,
                    "token_position": feat.token_position,
                }
                for feat in result.activated_features
            ],
            generation_metadata=result.generation_metadata,
            warnings=result.warnings,
        )

    except Exception as e:
        logger.error(f"Error during generation: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Generation failed: {str(e)}",
        )


@router.get("/health", response_model=HealthResponse)
async def health():
    """
    Health check endpoint.
    """
    settings = get_settings()

    model_loaded = model_manager is not None and model_manager.is_loaded()
    sae_loaded = (
        sae_manager is not None and sae_manager.has_sae(settings.layer)
    )
    feature_detector_ready = feature_detector is not None

    status_str = "healthy" if (model_loaded and sae_loaded and feature_detector_ready) else "degraded"

    return HealthResponse(
        status=status_str,
        model_loaded=model_loaded,
        sae_loaded=sae_loaded,
        feature_detector_ready=feature_detector_ready,
        model_id=settings.model_id if model_loaded else None,
        layer=settings.layer if sae_loaded else None,
    )


@router.get("/config", response_model=ConfigResponse)
async def get_config():
    """
    Get current configuration (non-sensitive).
    """
    settings = get_settings()

    quarantined_count = (
        len(feature_detector.quarantined_features)
        if feature_detector is not None
        else 0
    )

    return ConfigResponse(
        model_id=settings.model_id,
        layer=settings.layer,
        device=settings.device,
        sae_base_path=settings.sae_base_path,
        quarantined_features_count=quarantined_count,
    )

