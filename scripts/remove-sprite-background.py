"""Remove the connected neutral checkerboard from the generated sprite atlas.

Dependency-free PNG reader/writer for this 8-bit RGB/RGBA asset. Original colors
are preserved; only alpha changes. Always write to a separate output path.
"""
import struct
import sys
import zlib
from collections import deque
from pathlib import Path

source, destination = map(Path, sys.argv[1:3])
assert source.resolve() != destination.resolve(), "Preserve the source image."
data = source.read_bytes()
assert data[:8] == b"\x89PNG\r\n\x1a\n"
offset, compressed = 8, bytearray()
while offset < len(data):
    length = struct.unpack(">I", data[offset:offset + 4])[0]
    kind, payload = data[offset + 4:offset + 8], data[offset + 8:offset + 8 + length]
    if kind == b"IHDR":
        width, height, bits, color, _, _, interlace = struct.unpack(">IIBBBBB", payload)
    if kind == b"IDAT":
        compressed.extend(payload)
    offset += length + 12
assert bits == 8 and color in (2, 6) and interlace == 0
channels = 3 if color == 2 else 4
stride = width * channels
raw = zlib.decompress(compressed)
pixels = bytearray()
previous = bytearray(stride)
offset = 0
for _ in range(height):
    mode = raw[offset]
    row = bytearray(raw[offset + 1:offset + 1 + stride])
    offset += stride + 1
    for x in range(stride):
        left = row[x - channels] if x >= channels else 0
        above = previous[x]
        corner = previous[x - channels] if x >= channels else 0
        if mode == 1:
            predictor = left
        elif mode == 2:
            predictor = above
        elif mode == 3:
            predictor = (left + above) // 2
        elif mode == 4:
            p = left + above - corner
            da, db, dc = abs(p-left), abs(p-above), abs(p-corner)
            predictor = left if da <= db and da <= dc else above if db <= dc else corner
        else:
            assert mode == 0
            predictor = 0
        row[x] = (row[x] + predictor) & 255
    pixels.extend(row)
    previous = row

count = width * height
candidate, transparent = bytearray(count), bytearray(count)
for i in range(count):
    rgb = pixels[i*channels:i*channels+3]
    candidate[i] = int(min(rgb) >= 112 and max(rgb)-min(rgb) <= 8)
queue = deque()
def visit(i):
    if candidate[i] and not transparent[i]:
        transparent[i] = 1
        queue.append(i)
for x in range(width):
    visit(x)
    visit((height-1)*width+x)
for y in range(height):
    visit(y*width)
    visit(y*width+width-1)
while queue:
    i = queue.popleft()
    if i % width:
        visit(i-1)
    if i % width < width-1:
        visit(i+1)
    if i >= width:
        visit(i-width)
    if i < count-width:
        visit(i+width)

rgba = bytearray()
for y in range(height):
    rgba.append(0)
    for x in range(width):
        i = y*width+x
        rgba.extend(pixels[i*channels:i*channels+3])
        rgba.append(0 if transparent[i] else pixels[i*channels+3] if channels == 4 else 255)
def chunk(kind, payload):
    return struct.pack(">I", len(payload)) + kind + payload + struct.pack(">I", zlib.crc32(kind+payload))
destination.write_bytes(b"\x89PNG\r\n\x1a\n" +
    chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)) +
    chunk(b"IDAT", zlib.compress(rgba, 9)) + chunk(b"IEND", b""))
print(f"{width} × {height}, transparent pixels: {sum(transparent):,}/{count:,}, output: {destination}")
