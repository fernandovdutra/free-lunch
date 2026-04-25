"""Illuminator schema. FFM + PFM, FlexPupil pupil/sigma settings."""

from __future__ import annotations

from typing import TYPE_CHECKING

from twin.subsystems.base import Inputs, Outputs, Parameters, fmi_field

if TYPE_CHECKING:
    from twin.bus import BusSnapshot


class IlluminatorInputs(Inputs):
    enable: bool = fmi_field(False, causality="input", variability="discrete", fmi_type="Boolean")
    pupil_mode_cmd: str = fmi_field(
        "annular", causality="input", variability="discrete", fmi_type="String"
    )
    source_available: bool = fmi_field(
        False, causality="input", variability="discrete", fmi_type="Boolean"
    )

    @classmethod
    def from_snapshot(cls, snap: BusSnapshot) -> IlluminatorInputs:
        return cls(
            enable=snap.machine_control.illuminator_enable,
            pupil_mode_cmd=snap.machine_control.illuminator_pupil_mode,
            source_available=snap.source_vessel.available,
        )


class IlluminatorOutputs(Outputs):
    pupil_mode: str = fmi_field("annular", variability="discrete", fmi_type="String")
    field_open: bool = fmi_field(False, variability="discrete", fmi_type="Boolean")
    dose_uniformity_pct: float = fmi_field(0.0, unit="%")
    ready: bool = fmi_field(False, variability="discrete", fmi_type="Boolean")


class IlluminatorParameters(Parameters):
    pass
