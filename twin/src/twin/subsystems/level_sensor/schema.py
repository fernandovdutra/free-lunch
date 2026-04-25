"""LevelSensor schema. UVLS/UVLS-2 + Confidence Sensor at measure side."""

from __future__ import annotations

from typing import TYPE_CHECKING

from twin.subsystems.base import Inputs, Outputs, Parameters, fmi_field

if TYPE_CHECKING:
    from twin.bus import BusSnapshot


class LevelSensorInputs(Inputs):
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
    def from_snapshot(cls, snap: BusSnapshot) -> LevelSensorInputs:
        return cls(
            trigger=snap.machine_control.level_sensor_trigger,
            measure_stage=snap.machine_control.measure_side,
            stage_a_wafer_id=snap.wafer_stage_a.wafer_id,
            stage_b_wafer_id=snap.wafer_stage_b.wafer_id,
        )


class LevelSensorOutputs(Outputs):
    measuring: bool = fmi_field(False, variability="discrete", fmi_type="Boolean")
    wafer_id_seen: str = fmi_field("", variability="discrete", fmi_type="String")
    z_map_token: str = fmi_field("", variability="discrete", fmi_type="String")
    ready: bool = fmi_field(False, variability="discrete", fmi_type="Boolean")


class LevelSensorParameters(Parameters):
    measure_duration_s: float = fmi_field(
        1.0, unit="s", causality="parameter", variability="fixed"
    )
