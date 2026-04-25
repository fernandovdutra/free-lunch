"""WaferStage schema. Long-stroke + short-stroke + Si:SiC ESC chuck. Instantiated twice."""

from __future__ import annotations

from typing import TYPE_CHECKING, Literal

from twin.subsystems.base import Inputs, Outputs, Parameters, fmi_field

if TYPE_CHECKING:
    from twin.bus import BusSnapshot


WaferStageInstance = Literal["A", "B"]


class WaferStageInputs(Inputs):
    setpoint_x: float = fmi_field(0.0, unit="m", causality="input")
    setpoint_y: float = fmi_field(0.0, unit="m", causality="input")
    setpoint_z: float = fmi_field(0.0, unit="m", causality="input")
    setpoint_rx: float = fmi_field(0.0, unit="rad", causality="input")
    setpoint_ry: float = fmi_field(0.0, unit="rad", causality="input")
    setpoint_rz: float = fmi_field(0.0, unit="rad", causality="input")
    clamp_cmd: bool = fmi_field(
        False, causality="input", variability="discrete", fmi_type="Boolean"
    )
    mode_cmd: str = fmi_field(
        "idle", causality="input", variability="discrete", fmi_type="String"
    )
    handoff_wafer_id: str = fmi_field(
        "", causality="input", variability="discrete", fmi_type="String"
    )
    handoff_target: str = fmi_field(
        "", causality="input", variability="discrete", fmi_type="String"
    )

    @classmethod
    def from_snapshot_for(
        cls, snap: BusSnapshot, instance: WaferStageInstance
    ) -> WaferStageInputs:
        mc = snap.machine_control
        wh = snap.wafer_handler
        prefix = "wafer_stage_a_" if instance == "A" else "wafer_stage_b_"
        return cls(
            setpoint_x=getattr(mc, prefix + "setpoint_x"),
            setpoint_y=getattr(mc, prefix + "setpoint_y"),
            setpoint_z=getattr(mc, prefix + "setpoint_z"),
            setpoint_rx=getattr(mc, prefix + "setpoint_rx"),
            setpoint_ry=getattr(mc, prefix + "setpoint_ry"),
            setpoint_rz=getattr(mc, prefix + "setpoint_rz"),
            clamp_cmd=getattr(mc, prefix + "clamp_cmd"),
            mode_cmd=getattr(mc, prefix + "mode_cmd"),
            handoff_wafer_id=wh.handoff_wafer_id,
            handoff_target=wh.handoff_target,
        )


class WaferStageOutputs(Outputs):
    pos_x: float = fmi_field(0.0, unit="m")
    pos_y: float = fmi_field(0.0, unit="m")
    pos_z: float = fmi_field(0.0, unit="m")
    rx: float = fmi_field(0.0, unit="rad")
    ry: float = fmi_field(0.0, unit="rad")
    rz: float = fmi_field(0.0, unit="rad")
    vel_x: float = fmi_field(0.0, unit="m/s")
    vel_y: float = fmi_field(0.0, unit="m/s")
    clamped: bool = fmi_field(False, variability="discrete", fmi_type="Boolean")
    wafer_id: str = fmi_field("", variability="discrete", fmi_type="String")
    stage_mode: str = fmi_field("idle", variability="discrete", fmi_type="String")


class WaferStageParameters(Parameters):
    chuck_pitch_m: float = fmi_field(
        0.5, unit="m", causality="parameter", variability="fixed"
    )
