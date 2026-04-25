"""Frames schema. Metro + force + base + AVIS + balance-mass. Phase 0: parameters only."""

from __future__ import annotations

from typing import TYPE_CHECKING

from twin.subsystems.base import Inputs, Outputs, Parameters, fmi_field

if TYPE_CHECKING:
    from twin.bus import BusSnapshot


class FramesInputs(Inputs):
    @classmethod
    def from_snapshot(cls, snap: BusSnapshot) -> FramesInputs:
        return cls()


class FramesOutputs(Outputs):
    avis_ok: bool = fmi_field(True, variability="discrete", fmi_type="Boolean")


class FramesParameters(Parameters):
    metro_frame_x: float = fmi_field(0.0, unit="m", causality="parameter", variability="fixed")
    metro_frame_y: float = fmi_field(0.0, unit="m", causality="parameter", variability="fixed")
    metro_frame_z: float = fmi_field(0.0, unit="m", causality="parameter", variability="fixed")
    force_frame_z: float = fmi_field(-0.4, unit="m", causality="parameter", variability="fixed")
    base_frame_z: float = fmi_field(-1.0, unit="m", causality="parameter", variability="fixed")
    drive_laser_cabinet_x: float = fmi_field(
        4.0, unit="m", causality="parameter", variability="fixed"
    )
    drive_laser_cabinet_y: float = fmi_field(
        0.0, unit="m", causality="parameter", variability="fixed"
    )
    chuck_pitch_m: float = fmi_field(
        0.5, unit="m", causality="parameter", variability="fixed"
    )
    balance_mass_x: float = fmi_field(
        0.0, unit="m", causality="parameter", variability="fixed"
    )
