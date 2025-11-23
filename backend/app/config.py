"""Configuration management using Pydantic Settings"""

import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings with environment variable support"""

    model_config = SettingsConfigDict(
        env_prefix="MODX_",
        case_sensitive=False,
        env_file=".env",
        env_file_encoding="utf-8",
    )

    # Model Configuration
    model_id: str = "meta-llama/Llama-3.1-8B-Instruct"
    layer: int = 21
    device: str = "cuda"  # Will be auto-set to "cpu" if CUDA unavailable

    # SAE Configuration
    sae_source_repo: str = "fnlp/Llama3_1-8B-Base-LXR-8x"
    sae_base_path: str = "./saes/Llama3_1-8B-Base-LXR-8x-remapped"
    sae_temp_path: Optional[str] = None  # If None, uses sae_base_path + "-source"
    sae_conversion_layers: str = "0-31"  # Range or comma-separated list
    force_sae_conversion: bool = False

    # Feature Detection
    quarantined_features_path: str = "../features/quarantined_features.json"
    activation_threshold: float = 1e-3
    feature_top_k: int = 10

    # Generation Parameters
    max_new_tokens: int = 512
    temperature: float = 0.7
    top_p: float = 0.9
    top_k: Optional[int] = None
    do_sample: bool = True

    # HuggingFace
    hf_token: Optional[str] = None

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Auto-detect device if not explicitly set
        if self.device == "cuda":
            try:
                import torch

                if not torch.cuda.is_available():
                    self.device = "cpu"
            except ImportError:
                self.device = "cpu"

        # Set default temp path if not provided
        if self.sae_temp_path is None:
            self.sae_temp_path = self.sae_base_path.replace("-remapped", "-source")

    def get_sae_conversion_layers(self) -> List[int]:
        """Parse sae_conversion_layers string into list of integers"""
        if "-" in self.sae_conversion_layers:
            # Range format: "0-31"
            start, end = map(int, self.sae_conversion_layers.split("-"))
            return list(range(start, end + 1))
        else:
            # Comma-separated: "0,1,2,21"
            return [int(x.strip()) for x in self.sae_conversion_layers.split(",")]


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()

