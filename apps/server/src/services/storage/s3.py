"""S3-compatible storage backend — for production (AWS S3, MinIO, R2, etc.)."""

from services.storage.base import StorageBackend


class S3StorageBackend(StorageBackend):
    """Stores files in an S3-compatible object store."""

    def __init__(self, bucket: str, region: str, access_key: str, secret_key: str,
                 endpoint_url: str | None = None, public_url: str | None = None):
        self._bucket = bucket
        self._region = region
        self._endpoint_url = endpoint_url
        self._public_url = public_url

        import aiobotocore.session
        self._session = aiobotocore.session.get_session()
        self._client_kwargs = {
            "service_name": "s3",
            "region_name": region,
            "aws_access_key_id": access_key,
            "aws_secret_access_key": secret_key,
        }
        if endpoint_url:
            self._client_kwargs["endpoint_url"] = endpoint_url

    def _client(self):
        return self._session.create_client(**self._client_kwargs)

    async def put(self, key: str, data: bytes, content_type: str) -> str:
        async with self._client() as client:
            await client.put_object(
                Bucket=self._bucket,
                Key=key,
                Body=data,
                ContentType=content_type,
            )
        return await self.get_url(key)

    async def get(self, key: str) -> bytes | None:
        async with self._client() as client:
            try:
                resp = await client.get_object(Bucket=self._bucket, Key=key)
                async with resp["Body"] as stream:
                    return await stream.read()
            except client.exceptions.NoSuchKey:
                return None

    async def delete(self, key: str) -> bool:
        async with self._client() as client:
            await client.delete_object(Bucket=self._bucket, Key=key)
        return True

    async def get_url(self, key: str) -> str:
        if self._public_url:
            return f"{self._public_url.rstrip('/')}/{key}"
        if self._endpoint_url:
            return f"{self._endpoint_url.rstrip('/')}/{self._bucket}/{key}"
        return f"https://{self._bucket}.s3.{self._region}.amazonaws.com/{key}"

    async def exists(self, key: str) -> bool:
        async with self._client() as client:
            try:
                await client.head_object(Bucket=self._bucket, Key=key)
                return True
            except Exception:
                return False
