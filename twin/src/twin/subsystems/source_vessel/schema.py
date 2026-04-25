"""SourceVessel schema. LPP source: droplet gen + collector + DMS + IF + dose loop."""

from __future__ import annotations

from typing import TYPE_CHECKING

from twin.subsystems.base import Inputs, Outputs, Parameters, fmi_field

if TYPE_CHECKING:
    from twin.bus import BusSnapshot


class SourceVesselInputs(Inputs):
    enable: bool = fmi_field(False, causality="input", variability="discrete", fmi_type="Boolean")
    drive_pulse_energy_mJ: float = fmi_field(0.0, unit="mJ", causality="input")
    drive_locked_to_droplet: bool = fmi_field(
        False, causality="input", variability="discrete", fmi_type="Boolean"
    )

    @classmethod
    def from_snapshot(cls, snap: BusSnapshot) -> SourceVesselInputs:
        return cls(
            enable=snap.machine_control.source_vessel_enable,
            drive_pulse_energy_mJ=snap.drive_laser.pulse_energy_mJ,
            drive_locked_to_droplet=snap.drive_laser.locked_to_droplet,
        )


class SourceVesselOutputs(Outputs):
    power_at_if_W: float = fmi_field(0.0, unit="W")
    dose_stability_pct: float = fmi_field(0.0, unit="%")
    available: bool = fmi_field(False, variability="discrete", fmi_type="Boolean")
    collector_health_pct: float = fmi_field(100.0, unit="%")
    mode: str = fmi_field("idle", variability="discrete", fmi_type="String")


class SourceVesselParameters(Parameters):
    warmup_s: float = fmi_field(1.0, unit="s", causality="parameter", variability="fixed")
    nominal_power_W: float = fmi_field(
        250.0, unit="W", causality="parameter", variability="fixed"
    )
