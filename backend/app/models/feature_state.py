"""Feature detection result models"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class FeatureActivation:
    """Represents an activated quarantined feature"""

    feature_index: int
    activation_value: float
    description: str
    layer: int
    token_position: Optional[int] = None  # Which token position this activation occurred at


@dataclass
class FeatureDetectionResult:
    """Result of feature detection on a sequence"""

    has_quarantined_features: bool
    activated_features: list[FeatureActivation]
    total_features_checked: int
    max_activation_value: float

