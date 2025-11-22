"""PyTorch hook utilities for activation capture"""

import logging
from typing import Dict, Optional

import torch

logger = logging.getLogger(__name__)


class ActivationHook:
    """Hook to capture activations from a specific layer"""

    def __init__(self, layer_name: str):
        self.layer_name = layer_name
        self.activations: Optional[torch.Tensor] = None
        self.hook_handle: Optional[torch.utils.hooks.RemovableHandle] = None

    def __call__(self, module, input, output):
        """Hook function that captures the output"""
        # output is typically a tensor or tuple
        if isinstance(output, torch.Tensor):
            self.activations = output.detach()
        elif isinstance(output, tuple) and len(output) > 0:
            self.activations = output[0].detach()
        else:
            logger.warning(f"Unexpected output type from {self.layer_name}: {type(output)}")
            self.activations = None

    def attach(self, model) -> bool:
        """Attach hook to model at specified layer"""
        try:
            # Navigate to the layer
            parts = self.layer_name.split(".")
            module = model
            for part in parts:
                if hasattr(module, part):
                    module = getattr(module, part)
                else:
                    logger.error(f"Could not find layer '{part}' in path '{self.layer_name}'")
                    return False

            # Register forward hook
            self.hook_handle = module.register_forward_hook(self)
            logger.info(f"Attached activation hook to {self.layer_name}")
            return True

        except Exception as e:
            logger.error(f"Failed to attach hook to {self.layer_name}: {e}")
            return False

    def detach(self):
        """Remove hook from model"""
        if self.hook_handle is not None:
            self.hook_handle.remove()
            self.hook_handle = None
            logger.debug(f"Detached activation hook from {self.layer_name}")

    def clear(self):
        """Clear captured activations"""
        self.activations = None

    def get_activations(self) -> Optional[torch.Tensor]:
        """Get captured activations"""
        return self.activations


def create_hook_name(layer: int, hook_point: str = "hook_resid_post") -> str:
    """
    Create hook name for a specific layer.

    Args:
        layer: Layer index
        hook_point: Hook point name (default: "hook_resid_post")

    Returns:
        Hook name string, e.g., "blocks.21.hook_resid_post"
    """
    return f"blocks.{layer}.{hook_point}"

