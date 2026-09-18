"""Remove the connected neutral checkerboard from the generated sprite atlas.

Dependency-free PNG reader/writer for this 8-bit RGB/RGBA asset. Original colors
are preserved; only alpha changes. Always write to a separate output path.
"""
import argparse
import hashlib
import json
import struct
import zlib
from collections import deque
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('source', type=Path)
parser.add_argument('destination', type=Path)
parser.add_argument('--seeds', type=Path, help='Reviewed enclosed background regions (JSON).')
args = parser.parse_args()
source, destination = args.source, args.destination
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
if args.seeds:
    recipe = json.loads(args.seeds.read_text())
    assert recipe['source_sha256'] == hashlib.sha256(data).hexdigest(), 'Wrong source image.'
    assert recipe['size'] == [width, height], 'Wrong image dimensions.'
    # Interior openings cannot be reached from the outside. Seed only the
    # visually reviewed pockets, never all neutral pixels (metal/stone/fabric).
    for region in recipe['regions']:
        # Tiny disconnected remnants inside reviewed openings need their own
        # seeds. The tolerance is local: never key out grey across the atlas.
        for left, top, right, bottom in region.get('openings', []):
            assert 0 <= left <= right < width and 0 <= top <= bottom < height
            for y in range(top, bottom + 1):
                for x in range(left, right + 1):
                    if any(l <= x <= r and t <= y <= b for l, t, r, b in region.get('preserve', [])):
                        continue
                    i = y*width+x
                    rgb = pixels[i*channels:i*channels+3]
                    if min(rgb) >= 112 and max(rgb)-min(rgb) <= region.get('tolerance', 8):
                        candidate[i] = 1
                        visit(i)
        for x, y in region['points']:
            assert 0 <= x < width and 0 <= y < height, region['name']
            assert candidate[y*width+x], f"Not neutral background: {region['name']} ({x}, {y})"
            visit(y*width+x)
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
