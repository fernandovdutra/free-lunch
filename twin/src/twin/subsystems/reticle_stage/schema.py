"""ReticleStage schema. Long-stroke + short-stroke + Zerodur ESC."""

from __future__ import annotations

from typing import TYPE_CHECKING

from twin.subsystems.base import Inputs, Outputs, Parameters, fmi_field

if TYPE_CHECKING:
    from twin.bus import BusSnapshot


class ReticleStageInputs(Inputs):
    setpoint_x: float = fmi_field(0.0, unit="m", causality="input")
    setpoint_y: float = fmi_field(0.0, unit="m", causality="input")
    setpoint_z: float = fmi_field(0.0, unit="m", causality="input")
    setpoint_rx: float = fmi_field(0.0, unit="rad", causality="input")
    setpoint_ry: float = fmi_field(0.0, unit="rad", causality="input")
    setpoint_rz: float = fmi_field(0.0, unit="rad", causality="input")
    scan_velocity_cmd: float = fmi_field(0.0, unit="m/s", causality="input")
    clamp_cmd: bool = fmi_field(
        False, causality="input", variability="discrete", fmi_type="Boolean"
    )
    handoff_reticle_id: str = fmi_field(
        "", causality="input", variability="discrete", fmi_type="String"
    )

    @classmethod
    def from_snapshot(cls, snap: BusSnapshot) -> ReticleStageInputs:
        mc = snap.machine_control
        return cls(
            setpoint_x=mc.reticle_stage_setpoint_x,
            setpoint_y=mc.reticle_stage_setpoint_y,
            setpoint_z=mc.reticle_stage_setpoint_z,
            setpoint_rx=mc.reticle_stage_setpoint_rx,
            setpoint_ry=mc.reticle_stage_setpoint_ry,
            setpoint_rz=mc.reticle_stage_setpoint_rz,
            scan_velocity_cmd=mc.reticle_stage_scan_velocity,
            clamp_cmd=mc.reticle_stage_clamp_cmd,
            handoff_reticle_id=snap.reticle_handler.handoff_reticle_id,
        )


class ReticleStageOutputs(Outputs):
    pos_x: float = fmi_field(0.0, unit="m")
    pos_y: float = fmi_field(0.0, unit="m")
    pos_z: float = fmi_field(0.0, unit="m")
    rx: float = fmi_field(0.0, unit="rad")
    ry: float = fmi_field(0.0, unit="rad")
    rz: float = fmi_field(0.0, unit="rad")
    scan_velocity: float = fmi_field(0.0, unit="m/s")
    clamped: bool = fmi_field(False, variability="discrete", fmi_type="Boolean")
    reticle_id: str = fmi_field("", variability="discrete", fmi_type="String")
    mode: str = fmi_field("idle", variability="discrete", fmi_type="String")


class ReticleStageParameters(Parameters):
    pass
