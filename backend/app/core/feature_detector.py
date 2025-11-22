"""Feature Detector: Detect quarantined feature activations"""

import logging
from typing import Dict, List, Optional

import torch

from app.models.feature_state import FeatureActivation, FeatureDetectionResult
from app.utils.loaders import load_quarantined_features

logger = logging.getLogger(__name__)


class FeatureDetector:
    """Detects activations of quarantined features"""

    def __init__(self, quarantined_features_path: str, activation_threshold: float = 1e-3):
        """
        Initialize feature detector.

        Args:
            quarantined_features_path: Path to quarantined_features.json
            activation_threshold: Minimum activation value to consider a feature "active"
        """
        self.activation_threshold = activation_threshold
        self.quarantined_features: Dict[int, str] = load_quarantined_features(
            quarantined_features_path
        )
        logger.info(f"Initialized FeatureDetector with {len(self.quarantined_features)} quarantined features")

    def detect_quarantined_activations(
        self,
        feature_activations: torch.Tensor,
        layer: int,
        top_k: int = 10,
        token_positions: Optional[List[int]] = None,
    ) -> FeatureDetectionResult:
        """
        Detect if any quarantined features are activated.

        Args:
            feature_activations: Tensor of shape [batch, seq_len, num_features] or [seq_len, num_features]
            layer: Layer index where activations were captured
            top_k: Number of top features to check per token position
            token_positions: Optional list of token positions to analyze (if None, analyzes all)

        Returns:
            FeatureDetectionResult with detected activations
        """
        # Handle different tensor shapes
        if feature_activations.dim() == 3:
            # [batch, seq_len, num_features] -> take first batch
            feature_activations = feature_activations[0]
        elif feature_activations.dim() != 2:
            raise ValueError(
                f"Expected 2D or 3D tensor, got {feature_activations.dim()}D"
            )

        seq_len, num_features = feature_activations.shape

        # Determine which token positions to analyze
        if token_positions is None:
            token_positions = list(range(seq_len))

        activated_features: List[FeatureActivation] = []
        max_activation = 0.0

        # Analyze each token position
        for token_pos in token_positions:
            if token_pos >= seq_len:
                continue

            # Get activations for this token position
            token_activations = feature_activations[token_pos]

            # Get top-k activated features (matching notebook's get_activated_features)
            # Sort by magnitude, take top-k, then filter by threshold
            sorted_magnitude, sorted_indices = torch.sort(token_activations, descending=True)
            sorted_magnitude = sorted_magnitude[:top_k]
            sorted_indices = sorted_indices[:top_k]
            
            # Filter by threshold (as in notebook: mask = sorted_magnitude > 1e-3)
            mask = sorted_magnitude > self.activation_threshold
            filtered_magnitude = sorted_magnitude[mask]
            filtered_indices = sorted_indices[mask]

            # Check if any filtered features are quarantined
            for value, idx in zip(filtered_magnitude, filtered_indices):
                feature_idx = idx.item()
                activation_value = value.item()

                max_activation = max(max_activation, activation_value)

                # Check if this feature is quarantined
                if feature_idx in self.quarantined_features:
                    activated_features.append(
                        FeatureActivation(
                            feature_index=feature_idx,
                            activation_value=activation_value,
                            description=self.quarantined_features[feature_idx],
                            layer=layer,
                            token_position=token_pos,
                        )
                    )

        # Remove duplicates (same feature activated at multiple positions)
        # Keep the one with highest activation
        unique_features: Dict[int, FeatureActivation] = {}
        for feat in activated_features:
            if feat.feature_index not in unique_features:
                unique_features[feat.feature_index] = feat
            elif feat.activation_value > unique_features[feat.feature_index].activation_value:
                unique_features[feat.feature_index] = feat

        activated_features = list(unique_features.values())

        return FeatureDetectionResult(
            has_quarantined_features=len(activated_features) > 0,
            activated_features=activated_features,
            total_features_checked=len(token_positions) * top_k,
            max_activation_value=max_activation,
        )

    def get_feature_description(self, feature_index: int) -> Optional[str]:
        """
        Get description for a feature index.

        Args:
            feature_index: Feature index

        Returns:
            Description string, or None if not found
        """
        return self.quarantined_features.get(feature_index)

