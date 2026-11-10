#!/usr/bin/env python3
"""Pre-render a hologram prop from a Tripo GLB.

The live site does not mount three.js (the ceremony scene is unused). These
GLBs are about 3MB each, and most of that is color/ORM/normal textures a
cyan fresnel hologram never samples. This script keeps the mesh, drops the
textures, and bakes a short alpha loop. The page then adds the scan, grain,
and floor in CSS so those can freeze for reduced motion.

Usage:
  python3 scripts/render-hologram-prop.py /path/to/prop_crystal.glb public/assets/forge/hologram
"""

from __future__ import annotations

import json
import struct
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RENDER_C = ROOT / "scripts" / "render-hologram-prop.c"


def load_glb(path: Path):
    data = path.read_bytes()
    chunk_len, chunk_type = struct.unpack_from("<II", data, 12)
    if chunk_type != 0x4E4F534A:
        raise SystemExit(f"{path} is not a glTF JSON chunk")
    doc = json.loads(data[20 : 20 + chunk_len])
    off = 20 + chunk_len
    if off % 4:
        off += 4 - (off % 4)
    bin_len, bin_type = struct.unpack_from("<II", data, off)
    if bin_type != 0x004E4942:
        raise SystemExit(f"{path} is missing a BIN chunk")
    blob = data[off + 8 : off + 8 + bin_len]
    prim = doc["meshes"][0]["primitives"][0]
    accessors = doc["accessors"]
    views = doc["bufferViews"]

    def read(accessor_index: int, fmt: str, width: int):
        acc = accessors[accessor_index]
        view = views[acc["bufferView"]]
        start = view.get("byteOffset", 0) + acc.get("byteOffset", 0)
        count = acc["count"]
        stride = view.get("byteStride", struct.calcsize(fmt))
        out = []
        for i in range(count):
            out.append(struct.unpack_from(fmt, blob, start + i * stride))
        return out

    positions = read(prim["attributes"]["POSITION"], "<fff", 3)
    normals = read(prim["attributes"]["NORMAL"], "<fff", 3)
    indices = read(prim["indices"], "<I", 1)
    indices = [i[0] for i in indices]
    return positions, normals, indices


def write_raw(path: Path, positions, normals, indices):
    path.mkdir(parents=True, exist_ok=True)
    pos = struct.pack(f"<{len(positions) * 3}f", *[c for p in positions for c in p])
    nrm = struct.pack(f"<{len(normals) * 3}f", *[c for n in normals for c in n])
    idx = struct.pack(f"<{len(indices)}I", *indices)
    (path / "pos.bin").write_bytes(pos)
    (path / "nrm.bin").write_bytes(nrm)
    (path / "idx.bin").write_bytes(idx)
    meta = {
        "vertices": len(positions),
        "triangles": len(indices) // 3,
    }
    (path / "meta.json").write_text(json.dumps(meta))
    return meta


def main():
    if len(sys.argv) != 3:
        raise SystemExit("usage: render-hologram-prop.py PROP.glb OUT_DIR")
    glb = Path(sys.argv[1])
    out = Path(sys.argv[2])
    positions, normals, indices = load_glb(glb)
    work = Path("/tmp/holo-render")
    if work.exists():
        for child in work.iterdir():
            if child.is_file():
                child.unlink()
    else:
        work.mkdir(parents=True)
    meta = write_raw(work, positions, normals, indices)
    print(f"mesh {meta['vertices']} verts, {meta['triangles']} tris")
    subprocess.check_call(["gcc", "-O3", "-std=c11", "-o", str(work / "render"), str(RENDER_C), "-lm"])
    subprocess.check_call([str(work / "render"), str(work), "32", "480", "560"])
    out.mkdir(parents=True, exist_ok=True)
    frames = work / "frames"
    # VP9 with alpha stays under the mesh budget. auto-alt-ref must stay off
    # or the alpha plane is dropped. The page screen-blends the clip so a
    # browser that ignores alpha still treats the black field as empty.
    subprocess.check_call([
        "ffmpeg", "-y", "-framerate", "12", "-i", str(frames / "frame%02d.png"),
        "-vf", "scale=280:-2:flags=lanczos",
        "-an", "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p",
        "-b:v", "180k", "-crf", "40", "-auto-alt-ref", "0",
        "-deadline", "good", "-cpu-used", "1",
        str(out / "crystal.webm"),
    ])
    # A three-quarter frame, not the first yaw, so the still reads as a crystal.
    subprocess.check_call([
        "ffmpeg", "-y", "-i", str(frames / "frame08.png"),
        "-vf", "scale=280:-2:flags=lanczos",
        "-an", "-c:v", "libwebp", "-q:v", "55",
        str(out / "crystal-still.webp"),
    ])
    for name in ("crystal.webm", "crystal-still.webp"):
        size = (out / name).stat().st_size
        print(f"{name} {size} bytes")


if __name__ == "__main__":
    main()
