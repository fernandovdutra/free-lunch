"""OnStageMetrology schema. TIS1/TIS2 + ILIAS/PARIS + dose/spot, all on the chuck."""

from __future__ import annotations

from typing import TYPE_CHECKING

from twin.subsystems.base import Inputs, Outputs, Parameters, fmi_field

if TYPE_CHECKING:
    from twin.bus import BusSnapshot


class OnStageMetrologyInputs(Inputs):
    trigger: str = fmi_field(
        "none", causality="input", variability="discrete", fmi_type="String"
    )
    reticle_pos_x: float = fmi_field(0.0, unit="m", causality="input")
    reticle_pos_y: float = fmi_field(0.0, unit="m", causality="input")
    measure_stage: str = fmi_field(
        "A", causality="input", variability="discrete", fmi_type="String"
    )
    stage_a_pos_x: float = fmi_field(0.0, unit="m", causality="input")
    stage_b_pos_x: float = fmi_field(0.0, unit="m", causality="input")

    @classmethod
    def from_snapshot(cls, snap: BusSnapshot) -> OnStageMetrologyInputs:
        return cls(
            trigger=snap.machine_control.on_stage_metro_trigger,
            reticle_pos_x=snap.reticle_stage.pos_x,
            reticle_pos_y=snap.reticle_stage.pos_y,
            measure_stage=snap.machine_control.measure_side,
            stage_a_pos_x=snap.wafer_stage_a.pos_x,
            stage_b_pos_x=snap.wafer_stage_b.pos_x,
        )


class OnStageMetrologyOutputs(Outputs):
    tis_value: float = fmi_field(0.0, unit="m")
    dose_value: float = fmi_field(0.0, unit="mJ/cm^2")
    spot_value: float = fmi_field(0.0, unit="m")
    ilias_state: str = fmi_field("idle", variability="discrete", fmi_type="String")
    busy: bool = fmi_field(False, variability="discrete", fmi_type="Boolean")


class OnStageMetrologyParameters(Parameters):
    pass
