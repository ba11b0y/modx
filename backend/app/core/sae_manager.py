"""SAE Manager: Load and manage SAEs for model layers"""

import logging
from pathlib import Path
from typing import Dict, Optional

import torch

from app.config import Settings
from app.utils.import_utils import import_lm_saes

logger = logging.getLogger(__name__)


class SAEManager:
    """Manages SAE loading and attachment to model layers"""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.sae_base_path = Path(settings.sae_base_path)
        self.saes: Dict[int, object] = {}  # Will be SparseAutoEncoder when loaded
        self.device = settings.device
        self._imports = None  # Lazy-loaded imports

    def _ensure_imports(self):
        """Lazy load Language-Model-SAEs imports"""
        if self._imports is None:
            imports = import_lm_saes()
            if imports is None:
                raise ImportError(
                    "Failed to import Language-Model-SAEs. "
                    "Please run: python setup_dependencies.py"
                )
            self._imports = imports
        return self._imports

    def load_sae(self, layer: int):
        """
        Load SAE for a specific layer.

        Args:
            layer: Layer index

        Returns:
            Loaded SparseAutoEncoder instance

        Raises:
            FileNotFoundError: If SAE files don't exist
            Exception: If SAE loading fails
        """
        # Check if already loaded
        if layer in self.saes:
            logger.debug(f"SAE for layer {layer} already loaded")
            return self.saes[layer]

        # Construct SAE path
        sae_dir = self.sae_base_path / f"Llama3_1-8B-Base-L{layer}R-8x"
        if not sae_dir.exists():
            raise FileNotFoundError(
                f"SAE directory not found for layer {layer}: {sae_dir}"
            )

        logger.info(f"Loading SAE for layer {layer} from {sae_dir}")

        # Lazy load imports
        _, SAEConfig, _, SparseAutoEncoder, _, _ = self._ensure_imports()

        try:
            # Load SAE config
            cfg = SAEConfig.from_pretrained(str(sae_dir))
            cfg.strict_loading = False  # Allow missing keys

            # Load SAE
            sae = SparseAutoEncoder.from_config(cfg, fold_activation_scale=False)
            sae.eval()  # Set to evaluation mode

            # Move to device if needed
            if self.device == "cuda" and torch.cuda.is_available():
                sae = sae.cuda()

            self.saes[layer] = sae
            logger.info(f"Successfully loaded SAE for layer {layer}")

            return sae

        except Exception as e:
            logger.error(f"Failed to load SAE for layer {layer}: {e}")
            raise

    def get_sae(self, layer: int) -> Optional[object]:
        """
        Get SAE for a layer (loads if not already loaded).

        Args:
            layer: Layer index

        Returns:
            SparseAutoEncoder instance, or None if loading fails
        """
        try:
            return self.load_sae(layer)
        except Exception as e:
            logger.error(f"Failed to get SAE for layer {layer}: {e}")
            return None

    def encode_activations(
        self, layer: int, activations: torch.Tensor
    ) -> torch.Tensor:
        """
        Encode activations through SAE to get feature activations.

        Args:
            layer: Layer index
            activations: Activation tensor of shape [batch, seq_len, hidden_dim] or [seq_len, hidden_dim]

        Returns:
            Feature activations tensor of shape [batch, seq_len, num_features] or [seq_len, num_features]
        """
        sae = self.get_sae(layer)
        if sae is None:
            raise RuntimeError(f"SAE not available for layer {layer}")

        # Ensure activations are on correct device
        if activations.device != next(sae.parameters()).device:
            activations = activations.to(next(sae.parameters()).device)

        # Encode through SAE
        with torch.no_grad():
            features = sae.encode(activations)

        return features

    def has_sae(self, layer: int) -> bool:
        """Check if SAE is loaded for a layer"""
        return layer in self.saes

