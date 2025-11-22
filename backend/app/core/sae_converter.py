"""SAE Converter: Convert SAEs from LlamaScope format to Language-Model-SAEs format"""

import logging
import os
import shutil
from pathlib import Path
from typing import List, Optional

from huggingface_hub import snapshot_download
from safetensors.torch import load_file, save_file

from app.config import Settings

logger = logging.getLogger(__name__)


class SAEConverter:
    """Handles one-time conversion of SAEs from LlamaScope format"""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.source_repo = settings.sae_source_repo
        self.target_path = Path(settings.sae_base_path)
        self.temp_path = Path(settings.sae_temp_path) if settings.sae_temp_path else None

    def convert_saes(
        self, layers: Optional[List[int]] = None, force: bool = False
    ) -> bool:
        """
        Convert SAEs from LlamaScope format to Language-Model-SAEs format.

        Args:
            layers: List of layer indices to convert. If None, uses settings.
            force: Force re-conversion even if already done.

        Returns:
            True if conversion successful, False otherwise.
        """
        if layers is None:
            layers = self.settings.get_sae_conversion_layers()

        logger.info(f"Starting SAE conversion for layers: {layers}")

        # Check if conversion already complete
        if not force and self.is_conversion_complete(layers):
            logger.info("SAE conversion already complete, skipping...")
            return True

        # Download SAEs if needed
        source_dir = self._download_saes_if_needed()
        if source_dir is None:
            logger.error("Failed to download SAEs")
            return False

        # Convert each layer
        success_count = 0
        for layer in layers:
            try:
                self.convert_single_sae(layer, source_dir, self.target_path)
                success_count += 1
                logger.info(f"Successfully converted SAE for layer {layer}")
            except Exception as e:
                logger.error(f"Failed to convert SAE for layer {layer}: {e}")
                if not force:
                    # Continue with other layers even if one fails
                    continue
                else:
                    return False

        logger.info(f"SAE conversion complete: {success_count}/{len(layers)} layers converted")
        return success_count == len(layers)

    def is_conversion_complete(self, layers: List[int]) -> bool:
        """
        Check if SAE conversion is already complete for all specified layers.

        Args:
            layers: List of layer indices to check.

        Returns:
            True if all layers are converted, False otherwise.
        """
        for layer in layers:
            sae_dir = self.target_path / f"Llama3_1-8B-Base-L{layer}R-8x"
            safetensors_file = sae_dir / "checkpoints" / "final.safetensors"
            config_file = sae_dir / "config.json"

            if not safetensors_file.exists() or not config_file.exists():
                logger.debug(f"Layer {layer} not yet converted")
                return False

        return True

    def convert_single_sae(self, layer: int, source_dir: Path, target_dir: Path):
        """
        Convert a single layer's SAE.

        Args:
            layer: Layer index
            source_dir: Source directory containing original SAEs
            target_dir: Target directory for converted SAEs

        Raises:
            FileNotFoundError: If source files don't exist
            Exception: If conversion fails
        """
        src_sae_dir = source_dir / f"Llama3_1-8B-Base-L{layer}R-8x"
        dst_sae_dir = target_dir / f"Llama3_1-8B-Base-L{layer}R-8x"

        # Check source files exist
        src_safetensors = src_sae_dir / "checkpoints" / "final.safetensors"
        src_hyperparams = src_sae_dir / "hyperparams.json"
        src_lm_config = src_sae_dir / "lm_config.json"

        if not src_safetensors.exists():
            raise FileNotFoundError(f"Source safetensors not found: {src_safetensors}")

        # Create target directories
        dst_sae_dir.mkdir(parents=True, exist_ok=True)
        (dst_sae_dir / "checkpoints").mkdir(parents=True, exist_ok=True)

        # Load and convert safetensors
        logger.debug(f"Loading safetensors for layer {layer}")
        state_dict = load_file(str(src_safetensors))
        new_state_dict = self._rename_keys(state_dict)

        # Save converted safetensors
        dst_safetensors = dst_sae_dir / "checkpoints" / "final.safetensors"
        logger.debug(f"Saving converted safetensors to {dst_safetensors}")
        save_file(new_state_dict, str(dst_safetensors))

        # Copy config files
        if src_hyperparams.exists():
            shutil.copy(src_hyperparams, dst_sae_dir / "config.json")
        if src_lm_config.exists():
            shutil.copy(src_lm_config, dst_sae_dir / "lm_config.json")

    def _rename_keys(self, state_dict: dict) -> dict:
        """
        Rename keys in state dict according to conversion rules.

        Args:
            state_dict: Original state dict

        Returns:
            New state dict with renamed keys
        """
        key_map = {
            "decoder.bias": "b_D",
            "encoder.bias": "b_E",
        }
        new_state_dict = {}

        for k, v in state_dict.items():
            if k == "encoder.weight":
                # Transpose and make contiguous
                new_state_dict["W_E"] = v.T.contiguous()
            elif k == "decoder.weight":
                # Transpose and make contiguous
                new_state_dict["W_D"] = v.T.contiguous()
            else:
                new_state_dict[key_map.get(k, k)] = v

        return new_state_dict

    def _download_saes_if_needed(self) -> Optional[Path]:
        """
        Download SAEs from HuggingFace if not already present.

        Returns:
            Path to source directory, or None if download failed
        """
        # Determine source directory
        if self.temp_path:
            source_dir = self.temp_path
        else:
            # Use target path parent with "-source" suffix
            source_dir = self.target_path.parent / self.target_path.name.replace(
                "-remapped", ""
            )

        source_dir = Path(source_dir)

        # Check if already downloaded
        if source_dir.exists() and any(source_dir.iterdir()):
            logger.info(f"SAEs already downloaded at {source_dir}")
            return source_dir

        # Download from HuggingFace
        logger.info(f"Downloading SAEs from {self.source_repo} to {source_dir}")
        try:
            snapshot_download(
                repo_id=self.source_repo,
                local_dir=str(source_dir),
                token=self.settings.hf_token,
            )
            logger.info(f"Successfully downloaded SAEs to {source_dir}")
            return source_dir
        except Exception as e:
            logger.error(f"Failed to download SAEs: {e}")
            return None

