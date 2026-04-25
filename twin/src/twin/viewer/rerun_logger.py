"""Rerun logger: read-only consumer of BusSnapshot.

Writes static block geometry at setup, then per-tick transforms and
scalars. Never feeds anything back. Same rule USD/Omniverse will follow
when it replaces Rerun.
"""

from __future__ import annotations

from typing import Any

import rerun as rr

from twin.bus import BusSnapshot
from twin.subsystems.base import Subsystem
from twin.viewer.geometry import (
    GEOMETRY,
    RETICLE_HALF_X,
    RETICLE_HALF_Y,
    WAFER_RADIUS_M,
)


class RerunLogger:
    def __init__(self, application_id: str = "twin/lot_flow", spawn: bool = True) -> None:
        self._application_id = application_id
        self._spawn = spawn
        self._initialised = False

    def setup(self, modules: list[Subsystem]) -> None:
        if not self._initialised:
            rr.init(self._application_id, spawn=self._spawn)
            self._initialised = True
        for path, geom in GEOMETRY.items():
            rr.log(
                f"static/{path}",
                rr.Boxes3D(
                    centers=[list(geom.center)],
                    half_sizes=[list(geom.half_size)],
                    colors=[list(geom.color)],
                    labels=[geom.name],
                ),
                static=True,
            )
        # Reticle (block, attached to the reticle stage entity).
        rr.log(
            "dynamic/reticle_stage/reticle",
            rr.Boxes3D(
                centers=[[0.0, 0.0, 0.03]],
                half_sizes=[[RETICLE_HALF_X, RETICLE_HALF_Y, 0.005]],
                colors=[[230, 230, 250]],
                labels=["reticle"],
            ),
            static=True,
        )
        # Wafer disc (logged as a flat box; rerun's Cylinders3D varies by version).
        for stage in ("wafer_stage_a", "wafer_stage_b"):
            rr.log(
                f"dynamic/{stage}/wafer",
                rr.Boxes3D(
                    centers=[[0.0, 0.0, 0.05]],
                    half_sizes=[[WAFER_RADIUS_M, WAFER_RADIUS_M, 0.0004]],
                    colors=[[200, 200, 230]],
                    labels=["wafer_300mm"],
                ),
                static=True,
            )

    def log(self, snap: BusSnapshot) -> None:
        if not self._initialised:
            return
        rr.set_time("sim_time", duration=snap.sim_time)

        rr.log(
            "dynamic/reticle_stage",
            rr.Transform3D(
                translation=[snap.reticle_stage.pos_x, snap.reticle_stage.pos_y, 1.0],
            ),
        )
        rr.log(
            "dynamic/wafer_stage_a",
            rr.Transform3D(
                translation=[snap.wafer_stage_a.pos_x, snap.wafer_stage_a.pos_y, 0.0],
            ),
        )
        rr.log(
            "dynamic/wafer_stage_b",
            rr.Transform3D(
                translation=[snap.wafer_stage_b.pos_x, snap.wafer_stage_b.pos_y, 0.0],
            ),
        )
        rr.log(
            "scalars/source/power_at_if_W",
            rr.Scalars(snap.source_vessel.power_at_if_W),
        )
        rr.log(
            "scalars/source/dose_stability_pct",
            rr.Scalars(snap.source_vessel.dose_stability_pct),
        )
        rr.log(
            "scalars/on_stage_metro/dose_value",
            rr.Scalars(snap.on_stage_metro.dose_value),
        )
        rr.log(
            "scalars/wafer_stage_a/vel_y",
            rr.Scalars(snap.wafer_stage_a.vel_y),
        )
        rr.log(
            "events/phase",
            rr.TextLog(snap.machine_control.current_phase),
        )


class NullLogger:
    """No-op viewer used to prove subsystem code is independent of the renderer."""

    def setup(self, modules: list[Subsystem]) -> None:
        return

    def log(self, snap: BusSnapshot) -> None:
        return

    def __repr__(self) -> str:
        return "NullLogger()"


# Convenience for tools/swap_viewer.py to introspect.
def all_logger_classes() -> dict[str, Any]:
    return {"rerun": RerunLogger, "null": NullLogger}
