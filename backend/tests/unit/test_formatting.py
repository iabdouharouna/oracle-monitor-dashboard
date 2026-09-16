import pytest
from app.core.formatting import format_bytes, format_duration, format_number


def test_format_bytes():
    assert format_bytes(0) == "0 B"
    assert format_bytes(1024) == "1.00 KB"
    assert format_bytes(1024 * 1024) == "1.00 MB"
    assert format_bytes(1024 * 1024 * 1024) == "1.00 GB"


def test_format_duration():
    assert format_duration(30) == "30.0s"
    assert format_duration(90) == "1m 30s"
    assert format_duration(3661) == "1h 1m"


def test_format_number():
    assert format_number(1000) == "1,000"
    assert format_number(1000000) == "1,000,000"
    assert format_number(1234.56, 2) == "1,234.56"