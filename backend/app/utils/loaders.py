"""File loading utilities"""

import json
import logging
from pathlib import Path
from typing import Dict, Optional

logger = logging.getLogger(__name__)


def load_quarantined_features(path: str) -> Dict[int, str]:
    """
    Load quarantined features from JSON file.

    Args:
        path: Path to quarantined_features.json

    Returns:
        Dictionary mapping feature index (int) to description (str)

    Raises:
        FileNotFoundError: If file doesn't exist
        json.JSONDecodeError: If file is invalid JSON
        ValueError: If file format is incorrect
    """
    file_path = Path(path)

    if not file_path.exists():
        raise FileNotFoundError(f"Quarantined features file not found: {path}")

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Convert string keys to integers
        # Format: {"884": "description", "19397": "description"}
        quarantined = {}
        for key, value in data.items():
            try:
                feature_index = int(key)
                quarantined[feature_index] = value
            except (ValueError, TypeError) as e:
                logger.warning(f"Invalid feature index '{key}': {e}")
                continue

        logger.info(f"Loaded {len(quarantined)} quarantined features from {path}")
        return quarantined

    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in quarantined features file: {e}") from e

