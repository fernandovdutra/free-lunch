"""AlignmentSensor schema. SMASH/ORION on metro frame."""

from __future__ import annotations

from typing import TYPE_CHECKING

from twin.subsystems.base import Inputs, Outputs, Parameters, fmi_field

if TYPE_CHECKING:
    from twin.bus import BusSnapshot


class AlignmentSensorInputs(Inputs):
    trigger: bool = fmi_field(
        False, causality="input", variability="discrete", fmi_type="Boolean"
    )
    measure_stage: str = fmi_field(
        "A", causality="input", variability="discrete", fmi_type="String"
    )
    stage_a_wafer_id: str = fmi_field(
        "", causality="input", variability="discrete", fmi_type="String"
    )
    stage_b_wafer_id: str = fmi_field(
        "", causality="input", variability="discrete", fmi_type="String"
    )

    @classmethod
    def from_snapshot(cls, snap: BusSnapshot) -> AlignmentSensorInputs:
        return cls(
            trigger=snap.machine_control.alignment_sensor_trigger,
            measure_stage=snap.machine_control.measure_side,
            stage_a_wafer_id=snap.wafer_stage_a.wafer_id,
            stage_b_wafer_id=snap.wafer_stage_b.wafer_id,
        )


class AlignmentSensorOutputs(Outputs):
    measuring: bool = fmi_field(False, variability="discrete", fmi_type="Boolean")
    wafer_id_seen: str = fmi_field("", variability="discrete", fmi_type="String")
    dx: float = fmi_field(0.0, unit="m")
    dy: float = fmi_field(0.0, unit="m")
    theta: float = fmi_field(0.0, unit="rad")
    ready: bool = fmi_field(False, variability="discrete", fmi_type="Boolean")


class AlignmentSensorParameters(Parameters):
    measure_duration_s: float = fmi_field(
        1.5, unit="s", causality="parameter", variability="fixed"
    )
