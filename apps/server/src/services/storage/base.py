"""Abstract storage backend interface."""

from abc import ABC, abstractmethod


class StorageBackend(ABC):
    """Interface for file storage backends (local, S3, GCS, etc.)."""

    @abstractmethod
    async def put(self, key: str, data: bytes, content_type: str) -> str:
        """Store a file. Returns the public URL or storage key."""

    @abstractmethod
    async def get(self, key: str) -> bytes | None:
        """Retrieve file bytes by key. Returns None if not found."""

    @abstractmethod
    async def delete(self, key: str) -> bool:
        """Delete a file. Returns True if deleted."""

    @abstractmethod
    async def get_url(self, key: str) -> str:
        """Get the public/signed URL for a stored file."""

    @abstractmethod
    async def exists(self, key: str) -> bool:
        """Check if a file exists."""
