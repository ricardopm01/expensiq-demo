"""ExpensIQ — S3/MinIO storage service."""

import logging

import boto3
from botocore.exceptions import ClientError

from app.core.config import settings

logger = logging.getLogger("expensiq.storage")


class StorageService:
    def __init__(self):
        self._client = None

    @property
    def client(self):
        if self._client is None:
            self._client = boto3.client(
                "s3",
                endpoint_url=settings.S3_ENDPOINT,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            )
        return self._client

    def upload(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
        self.client.put_object(
            Bucket=settings.S3_BUCKET,
            Key=key,
            Body=data,
            ContentType=content_type,
        )
        url = f"{settings.S3_ENDPOINT}/{settings.S3_BUCKET}/{key}"
        logger.info("Uploaded %s (%d bytes)", key, len(data))
        return url

    def download(self, key: str) -> bytes:
        response = self.client.get_object(Bucket=settings.S3_BUCKET, Key=key)
        return response["Body"].read()


storage_service = StorageService()
