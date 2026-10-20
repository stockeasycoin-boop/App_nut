import io
import os
import tempfile
from pathlib import Path

_tmp = Path(tempfile.mkdtemp(prefix="nutrilens-test-"))
os.environ["NUTRILENS_DATABASE_URL"] = f"sqlite:///{_tmp / 'test.db'}"
os.environ["NUTRILENS_MEDIA_DIR"] = str(_tmp / "media")
os.environ["NUTRILENS_VISION_PROVIDER"] = "mock"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from PIL import Image  # noqa: E402

from app.db import Base, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture
def client():
    Base.metadata.drop_all(engine)
    with TestClient(app) as c:  # runs lifespan: creates tables and the demo user
        yield c


@pytest.fixture
def jpeg_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (640, 480), (90, 160, 80)).save(buf, format="JPEG")
    return buf.getvalue()
