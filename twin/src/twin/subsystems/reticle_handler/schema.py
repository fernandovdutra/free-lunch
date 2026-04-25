"""ReticleHandler schema. Pod opener (EOP/EIP/RSP) + library + robot + RBI."""

from __future__ import annotations

from typing import TYPE_CHECKING

from twin.subsystems.base import Inputs, Outputs, Parameters, fmi_field

if TYPE_CHECKING:
    from twin.bus import BusSnapshot


class ReticleHandlerInputs(Inputs):
    action: str = fmi_field(
        "idle", causality="input", variability="discrete", fmi_type="String"
    )
    target_reticle_id: str = fmi_field(
        "", causality="input", variability="discrete", fmi_type="String"
    )
    reticle_stage_clamped: bool = fmi_field(
        False, causality="input", variability="discrete", fmi_type="Boolean"
    )

    @classmethod
    def from_snapshot(cls, snap: BusSnapshot) -> ReticleHandlerInputs:
        return cls(
            action=snap.machine_control.reticle_handler_action,
            target_reticle_id=snap.machine_control.reticle_handler_target_id,
            reticle_stage_clamped=snap.reticle_stage.clamped,
        )


class ReticleHandlerOutputs(Outputs):
    robot_pose_x: float = fmi_field(0.0, unit="m")
    robot_pose_y: float = fmi_field(0.0, unit="m")
    robot_pose_z: float = fmi_field(0.0, unit="m")
    pod_open: bool = fmi_field(False, variability="discrete", fmi_type="Boolean")
    held_reticle_id: str = fmi_field("", variability="discrete", fmi_type="String")
    handoff_reticle_id: str = fmi_field("", variability="discrete", fmi_type="String")
    busy: bool = fmi_field(False, variability="discrete", fmi_type="Boolean")
    phase: str = fmi_field("idle", variability="discrete", fmi_type="String")


class ReticleHandlerParameters(Parameters):
    fetch_duration_s: float = fmi_field(
        2.0, unit="s", causality="parameter", variability="fixed"
    )
    return_duration_s: float = fmi_field(
        2.0, unit="s", causality="parameter", variability="fixed"
    )
