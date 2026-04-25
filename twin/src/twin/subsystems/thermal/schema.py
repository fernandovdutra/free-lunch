"""Thermal schema. PCW + reticle-chuck cooling + wafer cooling + optic-heating mitigation."""

from __future__ import annotations

from typing import TYPE_CHECKING

from twin.subsystems.base import Inputs, Outputs, Parameters, fmi_field

if TYPE_CHECKING:
    from twin.bus import BusSnapshot


class ThermalInputs(Inputs):
    enable: bool = fmi_field(False, causality="input", variability="discrete", fmi_type="Boolean")

    @classmethod
    def from_snapshot(cls, snap: BusSnapshot) -> ThermalInputs:
        return cls(enable=snap.machine_control.thermal_enable)


class ThermalOutputs(Outputs):
    water_temp_C: float = fmi_field(22.0, unit="degC")
    reticle_temp_C: float = fmi_field(22.0, unit="degC")
    optic_temp_ok: bool = fmi_field(False, variability="discrete", fmi_type="Boolean")


class ThermalParameters(Parameters):
    setpoint_water_C: float = fmi_field(
        22.0, unit="degC", causality="parameter", variability="fixed"
    )
