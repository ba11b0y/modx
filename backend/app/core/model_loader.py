"""Lazy loader for models and SAEs - initializes on-demand"""

import logging
from typing import Optional

from app.config import Settings
from app.core.feature_detector import FeatureDetector
from app.core.inference import InferencePipeline
from app.core.model_manager import ModelManager
from app.core.sae_converter import SAEConverter
from app.core.sae_manager import SAEManager

logger = logging.getLogger(__name__)


class ModelLoader:
    """Lazy loader for models and SAEs - only loads when needed"""

    def __init__(self, settings: Settings, feature_detector: FeatureDetector):
        self.settings = settings
        self.feature_detector = feature_detector
        self.model_manager: Optional[ModelManager] = None
        self.sae_manager: Optional[SAEManager] = None
        self.inference_pipeline: Optional[InferencePipeline] = None
        self._saes_converted = False

    def ensure_saes_converted(self) -> bool:
        """Ensure SAEs are converted (idempotent)"""
        if self._saes_converted:
            return True

        logger.info("Converting SAEs (one-time, idempotent)...")
        try:
            converter = SAEConverter(self.settings)
            layers = self.settings.get_sae_conversion_layers()
            success = converter.convert_saes(
                layers=layers, force=self.settings.force_sae_conversion
            )
            if not success:
                logger.warning("SAE conversion had some failures, but continuing...")
            self._saes_converted = True
            return True
        except Exception as e:
            logger.error(f"SAE conversion error: {e}", exc_info=True)
            raise

    def ensure_model_loaded(self, model_id: Optional[str] = None) -> ModelManager:
        """Ensure model is loaded, loading if necessary"""
        if self.model_manager is None:
            logger.info("Initializing ModelManager...")
            self.model_manager = ModelManager(self.settings)

        if not self.model_manager.is_loaded():
            model_id_to_load = model_id or self.settings.model_id
            logger.info(f"Loading model: {model_id_to_load}")
            self.model_manager.load_model(model_id_to_load)
            logger.info("Model loaded successfully")

        return self.model_manager

    def ensure_sae_loaded(self, layer: Optional[int] = None) -> SAEManager:
        """Ensure SAE manager is initialized and SAE is loaded for the layer"""
        if self.sae_manager is None:
            logger.info("Initializing SAEManager...")
            self.sae_manager = SAEManager(self.settings)

        layer_to_load = layer or self.settings.layer
        if not self.sae_manager.has_sae(layer_to_load):
            logger.info(f"Loading SAE for layer {layer_to_load}...")
            self.sae_manager.load_sae(layer_to_load)
            logger.info(f"SAE loaded successfully for layer {layer_to_load}")

        return self.sae_manager

    def ensure_inference_pipeline(self) -> InferencePipeline:
        """Ensure inference pipeline is initialized"""
        if self.inference_pipeline is None:
            logger.info("Initializing InferencePipeline...")
            # Ensure model and SAE are loaded first
            self.ensure_model_loaded()
            self.ensure_saes_converted()
            self.ensure_sae_loaded()

            self.inference_pipeline = InferencePipeline(
                model_manager=self.model_manager,
                sae_manager=self.sae_manager,
                feature_detector=self.feature_detector,
                settings=self.settings,
            )
            logger.info("Inference pipeline initialized successfully")

        return self.inference_pipeline

    def load_model_for_analysis(self, model_id: str) -> bool:
        """
        Load a model for analysis. This is the main entry point for model analysis.
        
        Args:
            model_id: HuggingFace model ID to load
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Step 1: Convert SAEs if needed
            self.ensure_saes_converted()

            # Step 2: Load the model
            self.ensure_model_loaded(model_id)

            # Step 3: Load SAE for default layer
            self.ensure_sae_loaded()

            # Step 4: Initialize inference pipeline
            self.ensure_inference_pipeline()

            logger.info(f"Model {model_id} ready for analysis")
            return True

        except Exception as e:
            logger.error(f"Failed to load model {model_id} for analysis: {e}", exc_info=True)
            return False

    def get_model_manager(self) -> Optional[ModelManager]:
        """Get model manager if loaded"""
        return self.model_manager

    def get_sae_manager(self) -> Optional[SAEManager]:
        """Get SAE manager if initialized"""
        return self.sae_manager

    def get_inference_pipeline(self) -> Optional[InferencePipeline]:
        """Get inference pipeline if initialized"""
        return self.inference_pipeline

