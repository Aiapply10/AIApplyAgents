"""Storage service — pluggable file storage backends."""

from services.storage.base import StorageBackend
from services.storage.factory import get_storage

__all__ = ["StorageBackend", "get_storage"]
