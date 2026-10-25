import pytest
from src.storage import init_db


@pytest.fixture
def db(tmp_path):
    path = tmp_path / 'mock_test.sqlite3'
    init_db(path)
    return path
