"""DriveLaser schema. Models the TRUMPF CO2 MOPA chain + Beam Transport System."""

from __future__ import annotations

from typing import TYPE_CHECKING

from twin.subsystems.base import Inputs, Outputs, Parameters, fmi_field

if TYPE_CHECKING:
    from twin.bus import BusSnapshot


class DriveLaserInputs(Inputs):
    enable: bool = fmi_field(False, causality="input", variability="discrete", fmi_type="Boolean")

    @classmethod
    def from_snapshot(cls, snap: BusSnapshot) -> DriveLaserInputs:
        return cls(enable=snap.machine_control.drive_laser_enable)


class DriveLaserOutputs(Outputs):
    pulse_energy_mJ: float = fmi_field(0.0, unit="mJ")
    rep_rate_Hz: float = fmi_field(0.0, unit="Hz")
    available: bool = fmi_field(False, variability="discrete", fmi_type="Boolean")
    locked_to_droplet: bool = fmi_field(False, variability="discrete", fmi_type="Boolean")


class DriveLaserParameters(Parameters):
    warmup_s: float = fmi_field(0.5, unit="s", causality="parameter", variability="fixed")
    nominal_pulse_energy_mJ: float = fmi_field(
        500.0, unit="mJ", causality="parameter", variability="fixed"
    )
    nominal_rep_rate_Hz: float = fmi_field(
        50_000.0, unit="Hz", causality="parameter", variability="fixed"
    )
