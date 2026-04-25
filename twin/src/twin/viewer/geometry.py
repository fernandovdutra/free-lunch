"""1:1 block geometry per subsystem instance.

Each entry describes a box at ``center`` with half-extents ``half_size``
in metres, optionally with a ``color`` (RGB 0-255). Geometry is logged
once at setup; per-tick :class:`rr.Transform3D` updates animate stages.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class BlockGeom:
    name: str
    center: tuple[float, float, float]
    half_size: tuple[float, float, float]
    color: tuple[int, int, int]


# Layout is in machine coordinates: +X = expose-side, -X = measure-side,
# +Z = up. Distances in metres. Numbers are illustrative public-data
# scales (NXE roughly 4 m wide x 6 m long footprint).
GEOMETRY: dict[str, BlockGeom] = {
    "frames.metro": BlockGeom("metro_frame", (0.0, 0.0, 0.5), (1.5, 1.0, 0.05), (160, 160, 200)),
    "frames.force": BlockGeom("force_frame", (0.0, 0.0, -0.4), (1.6, 1.1, 0.1), (140, 140, 140)),
    "frames.base": BlockGeom("base_frame", (0.0, 0.0, -1.0), (1.7, 1.2, 0.15), (100, 100, 100)),

    "drive_laser": BlockGeom("drive_laser", (4.0, 0.0, -0.4), (0.6, 0.4, 0.6), (220, 80, 80)),
    "source_vessel": BlockGeom("source_vessel", (1.4, 0.0, 0.0), (0.5, 0.5, 0.4), (200, 120, 60)),
    "illuminator": BlockGeom("illuminator", (0.7, 0.0, 0.4), (0.4, 0.4, 0.3), (180, 200, 120)),
    "reticle_masking": BlockGeom("reticle_masking", (0.0, 0.0, 0.95), (0.15, 0.15, 0.02), (60, 60, 60)),
    "reticle_stage": BlockGeom("reticle_stage", (0.0, 0.0, 1.0), (0.2, 0.4, 0.05), (200, 200, 220)),
    "reticle_handler": BlockGeom("reticle_handler", (0.0, 1.5, 0.9), (0.4, 0.4, 0.2), (120, 160, 200)),
    "pob": BlockGeom("pob", (0.0, 0.0, 0.55), (0.5, 0.5, 0.4), (90, 130, 200)),
    "wafer_stage_a": BlockGeom("wafer_stage_a", (-0.5, 0.0, 0.0), (0.2, 0.2, 0.04), (180, 220, 240)),
    "wafer_stage_b": BlockGeom("wafer_stage_b", (0.5, 0.0, 0.0), (0.2, 0.2, 0.04), (240, 200, 180)),
    "wafer_handler": BlockGeom("wafer_handler", (-1.5, 1.0, 0.0), (0.5, 0.5, 0.3), (120, 180, 140)),
    "alignment_sensor": BlockGeom("alignment_sensor", (-0.5, 0.6, 0.4), (0.05, 0.05, 0.08), (200, 80, 200)),
    "level_sensor": BlockGeom("level_sensor", (-0.5, -0.6, 0.4), (0.05, 0.05, 0.08), (80, 200, 200)),
    "on_stage_metro": BlockGeom("on_stage_metro", (-0.5, 0.0, 0.05), (0.04, 0.04, 0.02), (255, 220, 80)),
    "vacuum_gas": BlockGeom("vacuum_gas_dgl", (0.0, 0.0, 0.3), (0.4, 0.4, 0.005), (200, 200, 200)),
    "thermal": BlockGeom("thermal_pcw_manifold", (1.5, -1.0, -0.5), (0.3, 0.2, 0.2), (160, 200, 240)),
}


WAFER_RADIUS_M: float = 0.150
RETICLE_HALF_X: float = 0.054
RETICLE_HALF_Y: float = 0.066
