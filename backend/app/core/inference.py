"""Inference Pipeline: Generate text and detect feature activations"""

import logging
from typing import Any, Dict, List, Optional

import torch

from app.config import Settings
from app.core.feature_detector import FeatureDetector
from app.core.model_manager import ModelManager
from app.core.sae_manager import SAEManager
from app.models.model_state import InferenceResult

# Import Language-Model-SAEs with path handling
from app.utils.import_utils import import_lm_saes

_imports = import_lm_saes()
if _imports is None:
    raise ImportError(
        "Failed to import Language-Model-SAEs. "
        "Please run: python setup_dependencies.py"
    )

_, _, _, _, to_tokens, _ = _imports

logger = logging.getLogger(__name__)


class InferencePipeline:
    """Orchestrates inference with feature detection"""

    def __init__(
        self,
        model_manager: ModelManager,
        sae_manager: SAEManager,
        feature_detector: FeatureDetector,
        settings: Settings,
    ):
        self.model_manager = model_manager
        self.sae_manager = sae_manager
        self.feature_detector = feature_detector
        self.settings = settings
        self.device = settings.device

    def generate_with_probing(
        self,
        prompt: str,
        layer: Optional[int] = None,
        generation_config: Optional[Dict[str, Any]] = None,
    ) -> InferenceResult:
        """
        Generate text and probe for quarantined feature activations.

        Args:
            prompt: Input prompt
            layer: Layer to probe (defaults to settings.layer)
            generation_config: Optional generation parameters

        Returns:
            InferenceResult with generated text and feature detection results
        """
        if layer is None:
            layer = self.settings.layer

        # Get model
        model = self.model_manager.get_model()
        tokenizer = model.tokenizer

        # Prepare generation config
        gen_config = self._prepare_generation_config(generation_config)

        logger.info(f"Generating text for prompt (length: {len(prompt)})")

        # Step 1: Generate text (normal inference)
        generated_text = self._generate_text(model, tokenizer, prompt, gen_config)
        logger.info(f"Generated text (length: {len(generated_text)})")

        # Step 2: Create full sequence (prompt + generated)
        full_sequence = prompt + generated_text

        # Step 3: Re-run model with run_with_cache to capture activations
        logger.info(f"Probing layer {layer} for feature activations")
        activations = self._capture_activations(model, tokenizer, full_sequence, layer)

        if activations is None:
            logger.warning("Failed to capture activations")
            return InferenceResult(
                generated_text=generated_text,
                prompt=prompt,
                has_quarantined_features=False,
                activated_features=[],
                generation_metadata={"error": "Failed to capture activations"},
                warnings=["Failed to capture activations for feature detection"],
            )

        # Step 4: Encode activations through SAE
        feature_activations = self.sae_manager.encode_activations(layer, activations)

        # Step 5: Check for quarantined features
        detection_result = self.feature_detector.detect_quarantined_activations(
            feature_activations,
            layer=layer,
            top_k=self.settings.feature_top_k,
        )

        logger.info(
            f"Feature detection complete: {len(detection_result.activated_features)} "
            f"quarantined features activated"
        )

        return InferenceResult(
            generated_text=generated_text,
            prompt=prompt,
            has_quarantined_features=detection_result.has_quarantined_features,
            activated_features=detection_result.activated_features,
            generation_metadata={
                "layer": layer,
                "max_activation": detection_result.max_activation_value,
                "total_features_checked": detection_result.total_features_checked,
            },
        )

    def _generate_text(
        self, model, tokenizer, prompt: str, gen_config: Dict[str, Any]
    ) -> str:
        """Generate text from prompt"""
        # Tokenize input
        tokens = to_tokens(
            tokenizer=tokenizer,
            text=prompt,
            prepend_bos=False,
            max_length=512,
        )

        # Move tokens to device (ensure same device as model)
        device = torch.device(self.device) if isinstance(self.device, str) else self.device
        tokens = tokens.to(device)

        # Generate using the underlying transformer model
        # LanguageModel wraps a HookedTransformer, accessible via model.model
        with torch.no_grad():
            # Use the underlying transformer's generate method
            # The LanguageModel.model is a HookedTransformer from transformer_lens
            underlying_model = model.model

            # Generate with the specified parameters
            output = underlying_model.generate(
                tokens,
                max_new_tokens=gen_config["max_new_tokens"],
                temperature=gen_config.get("temperature"),
                top_p=gen_config.get("top_p"),
                top_k=gen_config.get("top_k"),
                do_sample=gen_config.get("do_sample", True),
                verbose=False,
            )

            # Decode generated tokens (exclude input tokens)
            # Output shape: [batch, seq_len] - take first batch
            if output.dim() == 2:
                generated_tokens = output[0][tokens.shape[1] :]
            else:
                generated_tokens = output[tokens.shape[1] :]

            generated_text = tokenizer.decode(generated_tokens, skip_special_tokens=True)

        return generated_text

    def _capture_activations(
        self, model, tokenizer, text: str, layer: int
    ) -> Optional[torch.Tensor]:
        """
        Capture activations at specified layer using run_with_cache.
        
        This matches the notebook implementation which uses model.model.run_with_cache()
        to efficiently capture activations at specific hook points.
        """
        try:
            # Tokenize
            tokens = to_tokens(
                tokenizer=tokenizer,
                text=text,
                prepend_bos=False,
                max_length=1024,
            )

            # Move to device (ensure same device as model)
            device = torch.device(self.device) if isinstance(self.device, str) else self.device
            tokens = tokens.to(device)

            # Use run_with_cache to capture activations (as in notebook)
            # This is more efficient than using hooks
            hook_point = f"blocks.{layer}.hook_resid_post"
            
            with torch.no_grad():
                _, activations = model.model.run_with_cache(
                    tokens,
                    names_filter=[hook_point]
                )

            # Extract activations for the specified layer
            layer_activations = activations.get(hook_point)
            
            if layer_activations is None:
                logger.error(f"Failed to capture activations at {hook_point}")
                return None

            # Convert to bfloat16 and ensure on correct device (as in notebook)
            device = torch.device(self.device) if isinstance(self.device, str) else self.device
            layer_activations = layer_activations.to(device).to(torch.bfloat16)

            return layer_activations

        except Exception as e:
            logger.error(f"Error capturing activations: {e}", exc_info=True)
            return None

    def _prepare_generation_config(
        self, user_config: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Prepare generation configuration"""
        config = {
            "max_new_tokens": self.settings.max_new_tokens,
            "temperature": self.settings.temperature,
            "top_p": self.settings.top_p,
            "top_k": self.settings.top_k,
            "do_sample": self.settings.do_sample,
        }

        if user_config:
            config.update(user_config)

        return config

