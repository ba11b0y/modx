"""Model Manager: Handle model loading and lifecycle"""

import logging
import sys
from pathlib import Path
from typing import Optional

import torch

# Import Language-Model-SAEs with path handling
from app.utils.import_utils import import_lm_saes

_imports = import_lm_saes()
if _imports is None:
    raise ImportError(
        "Failed to import Language-Model-SAEs. "
        "Please run: python setup_dependencies.py"
    )

LanguageModel, _, LanguageModelConfig, _, _, load_model = _imports

from app.config import Settings

logger = logging.getLogger(__name__)


class ModelManager:
    """Manages model loading and lifecycle"""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.model: Optional[LanguageModel] = None
        self.device = settings.device

    def load_model(self, model_id: Optional[str] = None) -> LanguageModel:
        """
        Load model from HuggingFace.

        Args:
            model_id: HuggingFace model ID. If None, uses settings default.

        Returns:
            Loaded LanguageModel instance

        Raises:
            Exception: If model loading fails
        """
        if model_id is None:
            model_id = self.settings.model_id

        if self.model is not None:
            logger.info(f"Model already loaded: {self.settings.model_id}")
            return self.model

        logger.info(f"Loading model: {model_id}")

        try:
            cfg = LanguageModelConfig()
            cfg.model_name = model_id
            cfg.tokenizer_only = False

            self.model = load_model(cfg)
            
            # Move model to device
            if self.device == "cuda" and torch.cuda.is_available():
                self.model.model = self.model.model.cuda()
                logger.info(f"Model moved to CUDA")
            else:
                self.device = "cpu"
                logger.info(f"Model on CPU")
            
            logger.info(f"Successfully loaded model: {model_id}")

            return self.model

        except Exception as e:
            logger.error(f"Failed to load model {model_id}: {e}")
            raise

    def get_model(self) -> LanguageModel:
        """
        Get current model instance.

        Returns:
            LanguageModel instance

        Raises:
            RuntimeError: If model is not loaded
        """
        if self.model is None:
            raise RuntimeError("Model not loaded. Call load_model() first.")
        return self.model

    def is_loaded(self) -> bool:
        """Check if model is loaded"""
        return self.model is not None

    def reload_model(self, model_id: str) -> None:
        """
        Reload model with new model ID.

        Args:
            model_id: New HuggingFace model ID
        """
        logger.info(f"Reloading model: {model_id}")
        self.model = None
        self.load_model(model_id)

    def get_tokenizer(self):
        """Get model tokenizer"""
        if self.model is None:
            raise RuntimeError("Model not loaded")
        return self.model.tokenizer

