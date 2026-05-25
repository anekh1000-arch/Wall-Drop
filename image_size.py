"""Read pixel width/height from JPEG, PNG, WebP, GIF without extra packages."""
from __future__ import annotations

import struct
from pathlib import Path


def read_image_size(path: Path) -> tuple[int, int] | None:
    try:
        with open(path, "rb") as f:
            head = f.read(32)
            if len(head) < 24:
                return None

            if head[:8] == b"\x89PNG\r\n\x1a\n":
                w, h = struct.unpack(">II", head[16:24])
                return int(w), int(h)

            if head[:6] in (b"GIF87a", b"GIF89a"):
                w, h = struct.unpack("<HH", head[6:10])
                return int(w), int(h)

            if head[:2] == b"\xff\xd8":
                return _jpeg_size(path)

            if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
                return _webp_size(path, head)
    except OSError:
        return None
    return None


def _jpeg_size(path: Path) -> tuple[int, int] | None:
    with open(path, "rb") as f:
        f.read(2)
        while True:
            b = f.read(1)
            if not b:
                return None
            if b != b"\xff":
                continue
            marker = f.read(1)
            while marker == b"\xff":
                marker = f.read(1)
            if marker in (
                b"\xc0", b"\xc1", b"\xc2", b"\xc3",
                b"\xc5", b"\xc6", b"\xc7", b"\xc9", b"\xca", b"\xcb",
            ):
                f.read(3)
                h, w = struct.unpack(">HH", f.read(4))
                return int(w), int(h)
            if marker == b"\xda":
                return None
            seg = f.read(2)
            if len(seg) < 2:
                return None
            f.read(struct.unpack(">H", seg)[0] - 2)


def _webp_size(path: Path, head: bytes) -> tuple[int, int] | None:
    with open(path, "rb") as f:
        chunk = head[12:30]
        if head[12:16] == b"VP8 " and len(chunk) >= 10:
            w, h = struct.unpack("<HH", bytes([chunk[7], chunk[8] & 0x3F, chunk[9], chunk[10] & 0x3F]))
            return w & 0x3FFF or 1, h & 0x3FFF or 1
        if head[12:16] == b"VP8L" and len(chunk) >= 5:
            bits = chunk[1] | (chunk[2] << 8) | (chunk[3] << 16) | (chunk[4] << 24)
            return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
        if head[12:16] == b"VP8X":
            f.seek(20)
            b = f.read(6)
            if len(b) >= 6:
                w = 1 + (b[0] | (b[1] << 8) | ((b[2] & 0x0F) << 16))
                h = 1 + (b[3] | (b[4] << 8) | ((b[5] & 0x0F) << 16))
                return w, h
    return None


def format_resolution(w: int, h: int) -> str:
    return f"{w}×{h}"
