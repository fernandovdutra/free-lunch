"""ReticleMasking (REMA) schema. 6-DOF maglev blade module that scan-syncs with reticle."""

from __future__ import annotations

from typing import TYPE_CHECKING

from twin.subsystems.base import Inputs, Outputs, Parameters, fmi_field

if TYPE_CHECKING:
    from twin.bus import BusSnapshot


class ReticleMaskingInputs(Inputs):
    blade_x_minus_set: float = fmi_field(0.0, unit="m", causality="input")
    blade_x_plus_set: float = fmi_field(0.0, unit="m", causality="input")
    blade_y_minus_set: float = fmi_field(0.0, unit="m", causality="input")
    blade_y_plus_set: float = fmi_field(0.0, unit="m", causality="input")
    reticle_y: float = fmi_field(0.0, unit="m", causality="input")
    reticle_scan_velocity: float = fmi_field(0.0, unit="m/s", causality="input")

    @classmethod
    def from_snapshot(cls, snap: BusSnapshot) -> ReticleMaskingInputs:
        mc = snap.machine_control
        return cls(
            blade_x_minus_set=mc.rema_blade_x_minus,
            blade_x_plus_set=mc.rema_blade_x_plus,
            blade_y_minus_set=mc.rema_blade_y_minus,
            blade_y_plus_set=mc.rema_blade_y_plus,
            reticle_y=snap.reticle_stage.pos_y,
            reticle_scan_velocity=snap.reticle_stage.scan_velocity,
        )


class ReticleMaskingOutputs(Outputs):
    blade_x_minus: float = fmi_field(0.0, unit="m")
    blade_x_plus: float = fmi_field(0.0, unit="m")
    blade_y_minus: float = fmi_field(0.0, unit="m")
    blade_y_plus: float = fmi_field(0.0, unit="m")
    synced_to_reticle: bool = fmi_field(False, variability="discrete", fmi_type="Boolean")


class ReticleMaskingParameters(Parameters):
    pass
