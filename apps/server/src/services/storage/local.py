"""Local filesystem storage backend — for development."""

import aiofiles
import aiofiles.os
from pathlib import Path

from services.storage.base import StorageBackend


class LocalStorageBackend(StorageBackend):
    """Stores files on the local filesystem under a configurable root directory."""

    def __init__(self, root_dir: str, base_url: str):
        self._root = Path(root_dir)
        self._base_url = base_url.rstrip("/")
        self._root.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        # Prevent path traversal
        safe_key = Path(key).name
        return self._root / safe_key

    async def put(self, key: str, data: bytes, content_type: str) -> str:
        path = self._path(key)
        async with aiofiles.open(path, "wb") as f:
            await f.write(data)
        return await self.get_url(key)

    async def get(self, key: str) -> bytes | None:
        path = self._path(key)
        if not path.exists():
            return None
        async with aiofiles.open(path, "rb") as f:
            return await f.read()

    async def delete(self, key: str) -> bool:
        path = self._path(key)
        if not path.exists():
            return False
        await aiofiles.os.remove(path)
        return True

    async def get_url(self, key: str) -> str:
        safe_key = Path(key).name
        return f"{self._base_url}/uploads/{safe_key}"

    async def exists(self, key: str) -> bool:
        return self._path(key).exists()
