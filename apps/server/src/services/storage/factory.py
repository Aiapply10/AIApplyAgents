"""Storage backend factory — returns the configured backend instance."""

from services.storage.base import StorageBackend

_instance: StorageBackend | None = None


def get_storage() -> StorageBackend:
    """Return the singleton storage backend, configured from settings."""
    global _instance
    if _instance is not None:
        return _instance

    from config import settings

    backend = getattr(settings, "storage_backend", "local")

    if backend == "s3":
        from services.storage.s3 import S3StorageBackend
        _instance = S3StorageBackend(
            bucket=settings.s3_bucket,
            region=settings.s3_region,
            access_key=settings.s3_access_key,
            secret_key=settings.s3_secret_key,
            endpoint_url=getattr(settings, "s3_endpoint_url", None) or None,
            public_url=getattr(settings, "s3_public_url", None) or None,
        )
    else:
        from services.storage.local import LocalStorageBackend
        root = getattr(settings, "upload_dir", "uploads")
        _instance = LocalStorageBackend(
            root_dir=root,
            base_url=settings.api_domain,
        )

    return _instance
