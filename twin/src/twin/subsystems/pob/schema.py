"""POB schema. Starlith 6-mirror 0.33 NA. Static in Phase 0."""

from __future__ import annotations

from typing import TYPE_CHECKING

from twin.subsystems.base import Inputs, Outputs, Parameters, fmi_field

if TYPE_CHECKING:
    from twin.bus import BusSnapshot


class POBInputs(Inputs):
    @classmethod
    def from_snapshot(cls, snap: BusSnapshot) -> POBInputs:
        return cls()


class POBOutputs(Outputs):
    available: bool = fmi_field(True, variability="discrete", fmi_type="Boolean")
    aberration_state: str = fmi_field("nominal", variability="discrete", fmi_type="String")


class POBParameters(Parameters):
    nominal_x: float = fmi_field(0.0, unit="m", causality="parameter", variability="fixed")
    nominal_y: float = fmi_field(0.0, unit="m", causality="parameter", variability="fixed")
    nominal_z: float = fmi_field(0.0, unit="m", causality="parameter", variability="fixed")
    numerical_aperture: float = fmi_field(
        0.33, causality="parameter", variability="fixed", unit="1"
    )
