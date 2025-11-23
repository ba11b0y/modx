"""Pydantic schemas for API requests and responses"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class GenerateRequest(BaseModel):
    """Request schema for text generation"""

    prompt: str = Field(..., description="Input prompt for generation")
    model_id: Optional[str] = Field(None, description="Override default model")
    layer: Optional[int] = Field(None, description="Override default layer for probing")
    max_new_tokens: Optional[int] = Field(None, description="Maximum number of tokens to generate")
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0, description="Sampling temperature")
    top_p: Optional[float] = Field(None, ge=0.0, le=1.0, description="Nucleus sampling parameter")
    top_k: Optional[int] = Field(None, ge=1, description="Top-k sampling parameter")
    do_sample: Optional[bool] = Field(None, description="Whether to use sampling")


class FeatureActivationResponse(BaseModel):
    """Response schema for activated feature"""

    feature_index: int = Field(..., description="Feature index")
    activation_value: float = Field(..., description="Activation value")
    description: str = Field(..., description="Feature description")
    layer: int = Field(..., description="Layer where activation occurred")
    token_position: Optional[int] = Field(None, description="Token position in sequence")


class GenerateResponse(BaseModel):
    """Response schema for text generation"""

    generated_text: str = Field(..., description="Generated text")
    prompt: str = Field(..., description="Original prompt")
    has_quarantined_features: bool = Field(
        ..., description="Whether any quarantined features were activated"
    )
    activated_features: List[FeatureActivationResponse] = Field(
        ..., description="List of activated quarantined features"
    )
    generation_metadata: Dict[str, Any] = Field(
        ..., description="Additional generation metadata"
    )
    warnings: Optional[List[str]] = Field(None, description="Warning messages")


class HealthResponse(BaseModel):
    """Response schema for health check"""

    status: str = Field(..., description="Service status")
    model_loaded: bool = Field(..., description="Whether model is loaded")
    sae_loaded: bool = Field(..., description="Whether SAE is loaded")
    feature_detector_ready: bool = Field(..., description="Whether feature detector is ready")
    model_id: Optional[str] = Field(None, description="Loaded model ID")
    layer: Optional[int] = Field(None, description="Probed layer")


class ConfigResponse(BaseModel):
    """Response schema for configuration"""

    model_id: str
    layer: int
    device: str
    sae_base_path: str
    quarantined_features_count: int


class ErrorResponse(BaseModel):
    """Response schema for errors"""

    error: str = Field(..., description="Error message")
    error_type: str = Field(..., description="Error type")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")


class AnalyzeModelRequest(BaseModel):
    """Request schema for model analysis"""

    model_url: str = Field(..., description="Hugging Face model repository URL")


class AnalyzeModelResponse(BaseModel):
    """Response schema for model analysis"""

    id: str = Field(..., description="Unique ID for this analysis")
    model_url: str = Field(..., description="Model URL that was analyzed")
    model_id: Optional[str] = Field(None, description="Extracted model ID")
    status: str = Field(..., description="Analysis status: pending, analyzing, completed, failed")
    checked_at: str = Field(..., description="ISO timestamp when analysis was initiated")
    analysis_result: Optional[Dict[str, Any]] = Field(None, description="Analysis results")
    error_message: Optional[str] = Field(None, description="Error message if analysis failed")


class ListModelsResponse(BaseModel):
    """Response schema for listing checked models"""

    models: List[AnalyzeModelResponse] = Field(..., description="List of checked models")
    total: int = Field(..., description="Total number of checked models")

