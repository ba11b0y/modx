"""API route definitions"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, status

from app.api.schemas import (
    AnalyzeModelRequest,
    AnalyzeModelResponse,
    ConfigResponse,
    ErrorResponse,
    GenerateRequest,
    GenerateResponse,
    HealthResponse,
    ListModelsResponse,
)
from app.config import get_settings
from app.core.feature_detector import FeatureDetector
from app.core.inference import InferencePipeline
from app.core.model_loader import ModelLoader
from app.core.model_manager import ModelManager
from app.core.model_store import ModelStore
from app.core.sae_manager import SAEManager

logger = logging.getLogger(__name__)

# Global instances (initialized in main.py)
model_manager: Optional[ModelManager] = None
sae_manager: Optional[SAEManager] = None
feature_detector: Optional[FeatureDetector] = None
inference_pipeline: Optional[InferencePipeline] = None
model_store: Optional[ModelStore] = None
model_loader: Optional[ModelLoader] = None


def set_instances(
    model_mgr: Optional[ModelManager],
    sae_mgr: Optional[SAEManager],
    feat_det: FeatureDetector,
    inf_pipe: Optional[InferencePipeline],
    store: ModelStore,
):
    """Set global instances (called from main.py)"""
    global model_manager, sae_manager, feature_detector, inference_pipeline, model_store, model_loader
    model_manager = model_mgr
    sae_manager = sae_mgr
    feature_detector = feat_det
    inference_pipeline = inf_pipe
    model_store = store
    
    # Initialize model loader for on-demand loading
    if feature_detector is not None:
        settings = get_settings()
        model_loader = ModelLoader(settings, feature_detector)


router = APIRouter()


@router.post("/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest):
    """
    Generate text and detect quarantined feature activations.
    """
    global model_manager, sae_manager, inference_pipeline
    
    # Ensure inference pipeline is available (load on-demand if needed)
    if inference_pipeline is None:
        if model_loader is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Model loader not initialized",
            )
        try:
            model_loader.ensure_inference_pipeline()
            model_manager = model_loader.get_model_manager()
            sae_manager = model_loader.get_sae_manager()
            inference_pipeline = model_loader.get_inference_pipeline()
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Inference pipeline not available: {str(e)}",
            )

    try:
        # Handle model_id override from request
        if request.model_id is not None:
            if model_manager is None:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Model manager not initialized",
                )
            
            # reload_model will check if model is already loaded and skip if same
            try:
                model_manager.reload_model(request.model_id)
            except Exception as e:
                logger.error(f"Failed to load model {request.model_id}: {e}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to load model {request.model_id}: {str(e)}",
                )
        
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

        # Clear model state after serving request to prevent context leakage
        try:
            if model_manager is not None:
                model_manager.clear_model_state()
        except Exception as e:
            logger.warning(f"Failed to clear model state: {e}")

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

    # Service is healthy if feature detector is ready (core service)
    # Models/SAEs are optional and loaded on-demand
    model_loaded = model_manager is not None and model_manager.is_loaded()
    sae_loaded = (
        sae_manager is not None and sae_manager.has_sae(settings.layer)
    )
    feature_detector_ready = feature_detector is not None

    # Service is healthy if core components are ready
    # Models/SAEs being loaded is a bonus but not required for health
    status_str = "healthy" if feature_detector_ready else "degraded"

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


def extract_model_id_from_url(url: str) -> Optional[str]:
    """Extract model ID from Hugging Face URL"""
    try:
        # Handle URLs like: https://huggingface.co/organization/model-name
        if "huggingface.co" in url:
            parts = url.replace("https://", "").replace("http://", "").split("/")
            if len(parts) >= 3:
                # Skip "huggingface.co" and get org/model-name
                return "/".join(parts[1:])
        return None
    except Exception:
        return None


@router.post("/models/analyze", response_model=AnalyzeModelResponse)
async def analyze_model(request: AnalyzeModelRequest):
    """
    Analyze a model by URL. This loads the model and SAEs on-demand.
    """
    global model_manager, sae_manager, inference_pipeline
    
    if model_store is None or model_loader is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model store or loader not initialized",
        )

    # Check if model was already analyzed
    existing_model = model_store.get_model_by_url(request.model_url)
    if existing_model:
        logger.info(f"Model already analyzed: {request.model_url}")
        return AnalyzeModelResponse(**existing_model.to_dict())

    # Extract model ID from URL
    model_id = extract_model_id_from_url(request.model_url)
    if not model_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not extract model ID from URL",
        )

    # Add model to store
    model = model_store.add_model(model_url=request.model_url, model_id=model_id)

    # Update status to analyzing
    model_store.update_model(model.id, status="analyzing")

    try:
        # Load model and SAEs on-demand
        logger.info(f"Loading model {model_id} for analysis...")
        success = model_loader.load_model_for_analysis(model_id)

        if not success:
            raise Exception("Failed to load model for analysis")

        # Update global instances so other endpoints can use them
        model_manager = model_loader.get_model_manager()
        sae_manager = model_loader.get_sae_manager()
        inference_pipeline = model_loader.get_inference_pipeline()

        # Analysis result
        analysis_result = {
            "model_url": request.model_url,
            "model_id": model_id,
            "status": "analyzed",
            "message": "Model loaded and ready for evaluation",
        }

        model_store.update_model(
            model.id,
            status="completed",
            analysis_result=analysis_result,
        )

        logger.info(f"Model analysis completed: {model.id}")
        return AnalyzeModelResponse(**model.to_dict())

    except Exception as e:
        logger.error(f"Error analyzing model: {e}", exc_info=True)
        model_store.update_model(
            model.id,
            status="failed",
            error_message=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Model analysis failed: {str(e)}",
        )


@router.get("/models", response_model=ListModelsResponse)
async def list_models(limit: Optional[int] = None):
    """
    List all checked models.
    """
    if model_store is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model store not initialized",
        )

    models = model_store.list_models(limit=limit)
    return ListModelsResponse(
        models=[AnalyzeModelResponse(**model.to_dict()) for model in models],
        total=model_store.count(),
    )


@router.get("/models/{model_id}", response_model=AnalyzeModelResponse)
async def get_model(model_id: str):
    """
    Get a specific checked model by ID.
    """
    if model_store is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model store not initialized",
        )

    model = model_store.get_model(model_id)
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model with ID {model_id} not found",
        )

    return AnalyzeModelResponse(**model.to_dict())

