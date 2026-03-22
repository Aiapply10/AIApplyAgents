"""File upload and serve endpoints."""

import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, File, UploadFile
from fastapi.responses import Response

from dependencies import CurrentUser, TenantId
from services.storage import get_storage

router = APIRouter(prefix="/uploads", tags=["uploads"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"}
ALLOWED_DOC_TYPES = {"application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
ALL_ALLOWED = ALLOWED_IMAGE_TYPES | ALLOWED_DOC_TYPES
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

MIME_TO_EXT = {
    "image/jpeg": ".jpg", "image/png": ".png", "image/gif": ".gif",
    "image/webp": ".webp", "image/svg+xml": ".svg",
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
}


@router.post("")
async def upload_file(
    _user: CurrentUser,
    _tenant_id: TenantId,
    file: UploadFile = File(...),
) -> dict:
    """Upload a file and return its URL.

    Supports images (JPEG, PNG, GIF, WebP, SVG) and documents (PDF, DOCX).
    """
    if not file.filename:
        raise HTTPException(422, "No file provided")

    content_type = file.content_type or ""
    if content_type not in ALL_ALLOWED:
        raise HTTPException(422, f"Unsupported file type: {content_type}. Allowed: images, PDF, DOCX.")

    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(422, "File too large. Maximum 10 MB.")

    ext = MIME_TO_EXT.get(content_type, Path(file.filename).suffix)
    key = f"{uuid.uuid4().hex}{ext}"

    storage = get_storage()
    url = await storage.put(key, data, content_type)

    return {"key": key, "url": url, "content_type": content_type, "size": len(data)}


@router.get("/{key}")
async def serve_file(key: str) -> Response:
    """Serve a file from local storage. Only used when storage_backend=local."""
    storage = get_storage()

    data = await storage.get(key)
    if data is None:
        raise HTTPException(404, "File not found")

    ext = Path(key).suffix.lower()
    content_type = {
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
        ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
        ".pdf": "application/pdf", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }.get(ext, "application/octet-stream")

    return Response(content=data, media_type=content_type)
