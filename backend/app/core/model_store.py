"""In-memory store for tracking checked models"""

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional
from uuid import uuid4

logger = logging.getLogger(__name__)


@dataclass
class CheckedModel:
    """Represents a model that has been checked/analyzed"""

    id: str = field(default_factory=lambda: str(uuid4()))
    model_url: str = ""
    model_id: Optional[str] = None  # Extracted from URL (e.g., "org/model-name")
    checked_at: datetime = field(default_factory=datetime.now)
    status: str = "pending"  # pending, analyzing, completed, failed
    analysis_result: Optional[Dict] = None
    error_message: Optional[str] = None

    def to_dict(self) -> Dict:
        """Convert to dictionary for API responses"""
        return {
            "id": self.id,
            "model_url": self.model_url,
            "model_id": self.model_id,
            "checked_at": self.checked_at.isoformat(),
            "status": self.status,
            "analysis_result": self.analysis_result,
            "error_message": self.error_message,
        }


class ModelStore:
    """In-memory store for tracking all checked models"""

    def __init__(self):
        self._models: Dict[str, CheckedModel] = {}
        logger.info("ModelStore initialized")

    def add_model(self, model_url: str, model_id: Optional[str] = None) -> CheckedModel:
        """Add a new model to the store"""
        model = CheckedModel(model_url=model_url, model_id=model_id)
        self._models[model.id] = model
        logger.info(f"Added model to store: {model.id} ({model_url})")
        return model

    def get_model(self, model_id: str) -> Optional[CheckedModel]:
        """Get a model by ID"""
        return self._models.get(model_id)

    def update_model(
        self,
        model_id: str,
        status: Optional[str] = None,
        analysis_result: Optional[Dict] = None,
        error_message: Optional[str] = None,
    ) -> Optional[CheckedModel]:
        """Update a model's status and results"""
        model = self._models.get(model_id)
        if not model:
            return None

        if status is not None:
            model.status = status
        if analysis_result is not None:
            model.analysis_result = analysis_result
        if error_message is not None:
            model.error_message = error_message

        logger.info(f"Updated model {model_id}: status={status}")
        return model

    def list_models(self, limit: Optional[int] = None) -> List[CheckedModel]:
        """List all checked models, optionally limited"""
        models = list(self._models.values())
        # Sort by checked_at descending (most recent first)
        models.sort(key=lambda m: m.checked_at, reverse=True)
        if limit:
            return models[:limit]
        return models

    def get_model_by_url(self, model_url: str) -> Optional[CheckedModel]:
        """Get a model by URL (useful for checking if already analyzed)"""
        for model in self._models.values():
            if model.model_url == model_url:
                return model
        return None

    def count(self) -> int:
        """Get total number of checked models"""
        return len(self._models)

