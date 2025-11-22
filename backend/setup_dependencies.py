#!/usr/bin/env python3
"""Setup script to install Language-Model-SAEs from git repository"""

import logging
import os
import subprocess
import sys
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# Repository details
LM_SAES_REPO = "https://github.com/OpenMOSS/Language-Model-SAEs.git"
LM_SAES_DIR = Path(__file__).parent / "Language-Model-SAEs"
LM_SAES_SRC = LM_SAES_DIR / "src"


def clone_repo(force: bool = False) -> bool:
    """
    Clone the Language-Model-SAEs repository.

    Args:
        force: If True, remove existing directory and re-clone

    Returns:
        True if successful, False otherwise
    """
    if LM_SAES_DIR.exists():
        if force:
            logger.info(f"Removing existing directory: {LM_SAES_DIR}")
            import shutil
            shutil.rmtree(LM_SAES_DIR)
        else:
            logger.info(f"Repository already exists at {LM_SAES_DIR}")
            return True

    logger.info(f"Cloning {LM_SAES_REPO} to {LM_SAES_DIR}...")
    try:
        subprocess.run(
            ["git", "clone", LM_SAES_REPO, str(LM_SAES_DIR)],
            check=True,
            capture_output=True,
            text=True,
        )
        logger.info("Repository cloned successfully")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to clone repository: {e}")
        logger.error(f"stdout: {e.stdout}")
        logger.error(f"stderr: {e.stderr}")
        return False
    except FileNotFoundError:
        logger.error("git command not found. Please install git.")
        return False


def install_package() -> bool:
    """
    Install the Language-Model-SAEs package in editable mode.

    Returns:
        True if successful, False otherwise
    """
    if not LM_SAES_DIR.exists():
        logger.error(f"Repository not found at {LM_SAES_DIR}. Run clone first.")
        return False

    setup_py = LM_SAES_DIR / "setup.py"
    pyproject_toml = LM_SAES_DIR / "pyproject.toml"

    if not setup_py.exists() and not pyproject_toml.exists():
        logger.warning("No setup.py or pyproject.toml found. Adding to PYTHONPATH instead.")
        return add_to_pythonpath()

    logger.info(f"Installing Language-Model-SAEs from {LM_SAES_DIR}...")
    try:
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "-e", str(LM_SAES_DIR)],
            check=True,
            capture_output=True,
            text=True,
        )
        logger.info("Package installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to install package: {e}")
        logger.error(f"stdout: {e.stdout}")
        logger.error(f"stderr: {e.stderr}")
        logger.warning("Falling back to PYTHONPATH method")
        return add_to_pythonpath()


def add_to_pythonpath() -> bool:
    """
    Add Language-Model-SAEs/src to PYTHONPATH by creating a .pth file.

    Returns:
        True if successful, False otherwise
    """
    if not LM_SAES_SRC.exists():
        logger.error(f"Source directory not found: {LM_SAES_SRC}")
        return False

    # Get site-packages directory
    import site
    site_packages = site.getsitepackages()[0] if site.getsitepackages() else None

    if site_packages is None:
        # Fallback: use user site-packages
        site_packages = site.getusersitepackages()

    if not site_packages:
        logger.error("Could not determine site-packages directory")
        return False

    # Create .pth file
    pth_file = Path(site_packages) / "lm_saes_path.pth"
    try:
        with open(pth_file, "w") as f:
            f.write(str(LM_SAES_SRC.absolute()))
        logger.info(f"Added {LM_SAES_SRC} to PYTHONPATH via {pth_file}")
        return True
    except Exception as e:
        logger.error(f"Failed to create .pth file: {e}")
        return False


def verify_installation() -> bool:
    """
    Verify that Language-Model-SAEs can be imported.

    Returns:
        True if import successful, False otherwise
    """
    # Add to path temporarily for verification
    if LM_SAES_SRC.exists():
        sys.path.insert(0, str(LM_SAES_SRC))

    try:
        import lm_saes
        from lm_saes.backend import LanguageModel
        from lm_saes.config import SAEConfig, LanguageModelConfig
        from lm_saes.sae import SparseAutoEncoder
        logger.info("✓ Language-Model-SAEs imported successfully")
        logger.info(f"  Package location: {lm_saes.__file__}")
        return True
    except ImportError as e:
        logger.error(f"✗ Failed to import Language-Model-SAEs: {e}")
        logger.error("  Please ensure the package is installed or in PYTHONPATH")
        return False


def main():
    """Main setup function"""
    import argparse

    parser = argparse.ArgumentParser(description="Setup Language-Model-SAEs dependency")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force re-clone of repository",
    )
    parser.add_argument(
        "--skip-install",
        action="store_true",
        help="Skip pip install, only clone and add to PYTHONPATH",
    )
    parser.add_argument(
        "--verify-only",
        action="store_true",
        help="Only verify installation, don't install",
    )

    args = parser.parse_args()

    if args.verify_only:
        success = verify_installation()
        sys.exit(0 if success else 1)

    # Step 1: Clone repository
    if not clone_repo(force=args.force):
        logger.error("Failed to clone repository")
        sys.exit(1)

    # Step 2: Install package
    if not args.skip_install:
        if not install_package():
            logger.error("Failed to install package")
            sys.exit(1)

    # Step 3: Verify installation
    if not verify_installation():
        logger.error("Installation verification failed")
        sys.exit(1)

    logger.info("✓ Setup complete!")


if __name__ == "__main__":
    main()

