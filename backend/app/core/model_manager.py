"""Model Manager: Handle model loading and lifecycle"""

import logging
import sys
from pathlib import Path
from typing import Optional

import torch

from app.config import Settings
from app.utils.import_utils import import_lm_saes

logger = logging.getLogger(__name__)


class ModelManager:
    """Manages model loading and lifecycle"""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.model = None  # Will be LanguageModel when loaded
        self.current_model_id: Optional[str] = None  # Track currently loaded model
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

    def load_model(self, model_id: Optional[str] = None):
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

        # Check if the requested model is already loaded
        if self.model is not None and self.current_model_id == model_id:
            logger.debug(f"Model {model_id} already loaded, skipping reload")
            return self.model

        logger.info(f"Loading model: {model_id}")

        # Lazy load imports
        LanguageModel, _, LanguageModelConfig, _, _, load_model = self._ensure_imports()

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
            
            # Track the loaded model ID
            self.current_model_id = model_id
            logger.info(f"Successfully loaded model: {model_id}")

            return self.model

        except Exception as e:
            logger.error(f"Failed to load model {model_id}: {e}")
            raise

    def get_model(self):
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
        Reload model with new model ID (only if different from current).

        Args:
            model_id: New HuggingFace model ID
        """
        # Check if this model is already loaded
        if self.current_model_id == model_id and self.model is not None:
            logger.debug(f"Model {model_id} already loaded, skipping reload")
            return
        
        logger.info(f"Loading model: {model_id}" + (f" (replacing {self.current_model_id})" if self.current_model_id else ""))
        self.model = None
        self.current_model_id = None
        self.load_model(model_id)

    def get_tokenizer(self):
        """Get model tokenizer"""
        if self.model is None:
            raise RuntimeError("Model not loaded")
        return self.model.tokenizer

    def clear_model_state(self):
        """
        Clear any cached state or context from the model.
        
        This ensures the model doesn't maintain context between requests.
        """
        if self.model is None:
            return
        
        try:
            # Clear any hooks that might be attached
            if hasattr(self.model.model, 'reset_hooks'):
                self.model.model.reset_hooks()
            
            # Ensure model is in eval mode (no training state)
            if hasattr(self.model.model, 'eval'):
                self.model.model.eval()
            
            # Clear any cached activations or state
            # HookedTransformer might cache activations, clear them
            if hasattr(self.model.model, 'cache'):
                self.model.model.cache = None
            
            # Clear CUDA cache if using GPU
            if self.device == "cuda" and torch.cuda.is_available():
                torch.cuda.empty_cache()
            
            logger.debug("Model state cleared")
        except Exception as e:
            logger.warning(f"Error clearing model state: {e}")

