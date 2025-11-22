"""Model state and inference result models"""

from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from app.models.feature_state import FeatureActivation


@dataclass
class InferenceResult:
    """Complete inference result with feature detection"""

    generated_text: str
    prompt: str
    has_quarantined_features: bool
    activated_features: List[FeatureActivation]
    generation_metadata: Dict[str, Any]
    warnings: Optional[List[str]] = None

