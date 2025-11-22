"""Utilities for handling Language-Model-SAEs imports"""

import logging
import sys
from pathlib import Path

logger = logging.getLogger(__name__)

# Try to add Language-Model-SAEs to path if not already available
LM_SAES_DIR = Path(__file__).parent.parent.parent / "Language-Model-SAEs"
LM_SAES_SRC = LM_SAES_DIR / "src"


def ensure_lm_saes_in_path():
    """
    Ensure Language-Model-SAEs is in Python path.
    
    This checks if the package is already importable, and if not,
    tries to add it to sys.path from the local repository.
    """
    try:
        import lm_saes
        # Already available
        return True
    except ImportError:
        pass

    # Try to add from local repository
    if LM_SAES_SRC.exists() and str(LM_SAES_SRC) not in sys.path:
        logger.info(f"Adding {LM_SAES_SRC} to Python path")
        sys.path.insert(0, str(LM_SAES_SRC))
        try:
            import lm_saes
            logger.info("Successfully imported Language-Model-SAEs from local repository")
            return True
        except ImportError:
            logger.warning(
                f"Language-Model-SAEs not found at {LM_SAES_SRC}. "
                "Please run: python setup_dependencies.py"
            )
            return False

    return False


def import_lm_saes():
    """
    Import Language-Model-SAEs modules with proper error handling.
    
    Returns:
        Tuple of (LanguageModel, SAEConfig, LanguageModelConfig, SparseAutoEncoder, to_tokens, load_model)
        or None if import fails
    """
    if not ensure_lm_saes_in_path():
        return None

    try:
        from lm_saes.backend import LanguageModel
        from lm_saes.backend.language_model import to_tokens
        from lm_saes.config import SAEConfig, LanguageModelConfig
        from lm_saes.resource_loaders import load_model
        from lm_saes.sae import SparseAutoEncoder

        return (
            LanguageModel,
            SAEConfig,
            LanguageModelConfig,
            SparseAutoEncoder,
            to_tokens,
            load_model,
        )
    except ImportError as e:
        logger.error(f"Failed to import Language-Model-SAEs modules: {e}")
        logger.error(
            "Please ensure Language-Model-SAEs is installed. "
            "Run: python setup_dependencies.py"
        )
        return None

