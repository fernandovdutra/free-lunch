"""WaferHandler schema. FOUP load port + pre-aligner + air-lock + robot."""

from __future__ import annotations

from typing import TYPE_CHECKING

from twin.subsystems.base import Inputs, Outputs, Parameters, fmi_field

if TYPE_CHECKING:
    from twin.bus import BusSnapshot


class WaferHandlerInputs(Inputs):
    action: str = fmi_field(
        "idle", causality="input", variability="discrete", fmi_type="String"
    )
    target_wafer_id: str = fmi_field(
        "", causality="input", variability="discrete", fmi_type="String"
    )
    target_stage: str = fmi_field(
        "", causality="input", variability="discrete", fmi_type="String"
    )
    stage_a_clamped: bool = fmi_field(
        False, causality="input", variability="discrete", fmi_type="Boolean"
    )
    stage_b_clamped: bool = fmi_field(
        False, causality="input", variability="discrete", fmi_type="Boolean"
    )

    @classmethod
    def from_snapshot(cls, snap: BusSnapshot) -> WaferHandlerInputs:
        mc = snap.machine_control
        return cls(
            action=mc.wafer_handler_action,
            target_wafer_id=mc.wafer_handler_target_wafer_id,
            target_stage=mc.wafer_handler_target_stage,
            stage_a_clamped=snap.wafer_stage_a.clamped,
            stage_b_clamped=snap.wafer_stage_b.clamped,
        )


class WaferHandlerOutputs(Outputs):
    robot_pose_x: float = fmi_field(0.0, unit="m")
    robot_pose_y: float = fmi_field(0.0, unit="m")
    robot_pose_z: float = fmi_field(0.0, unit="m")
    foup_open: bool = fmi_field(False, variability="discrete", fmi_type="Boolean")
    prealigner_busy: bool = fmi_field(False, variability="discrete", fmi_type="Boolean")
    held_wafer_id: str = fmi_field("", variability="discrete", fmi_type="String")
    handoff_wafer_id: str = fmi_field("", variability="discrete", fmi_type="String")
    handoff_target: str = fmi_field("", variability="discrete", fmi_type="String")
    busy: bool = fmi_field(False, variability="discrete", fmi_type="Boolean")
    phase: str = fmi_field("idle", variability="discrete", fmi_type="String")


class WaferHandlerParameters(Parameters):
    load_duration_s: float = fmi_field(
        2.5, unit="s", causality="parameter", variability="fixed"
    )
    unload_duration_s: float = fmi_field(
        2.0, unit="s", causality="parameter", variability="fixed"
    )
