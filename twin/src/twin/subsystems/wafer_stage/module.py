"""WaferStage module: instantiated twice (A, B). Pose follows setpoints with one-tick lag."""

from __future__ import annotations

from typing import ClassVar

from twin.subsystems.base import Inputs, Outputs, Parameters
from twin.subsystems.wafer_stage.schema import (
    WaferStageInputs,
    WaferStageInstance,
    WaferStageOutputs,
    WaferStageParameters,
)


class WaferStage:
    """One physical chuck assembly. Two instances (`A`, `B`) on the platform."""

    InputSchema: ClassVar[type[Inputs]] = WaferStageInputs
    OutputSchema: ClassVar[type[Outputs]] = WaferStageOutputs
    ParameterSchema: ClassVar[type[Parameters]] = WaferStageParameters

    def __init__(self, instance: WaferStageInstance) -> None:
        self._instance: WaferStageInstance = instance
        self.name = "wafer_stage_a" if instance == "A" else "wafer_stage_b"
        self._params = WaferStageParameters()
        self._wafer_id = ""
        self._prev_pos_x = 0.0
        self._prev_pos_y = 0.0

    @property
    def instance(self) -> WaferStageInstance:
        return self._instance

    def reset(self, params: Parameters) -> Outputs:
        assert isinstance(params, WaferStageParameters)
        self._params = params
        self._wafer_id = ""
        self._prev_pos_x = 0.0
        self._prev_pos_y = 0.0
        return WaferStageOutputs()

    def make_inputs(self, snap: object) -> Inputs:
        # Imported lazily to avoid a circular import at module load time.
        from twin.bus import BusSnapshot

        assert isinstance(snap, BusSnapshot)
        return WaferStageInputs.from_snapshot_for(snap, self._instance)

    def step(self, dt: float, inputs: Inputs) -> Outputs:
        assert isinstance(inputs, WaferStageInputs)

        # Wafer handoff: handler offers a wafer to a specific stage instance.
        if (
            inputs.handoff_target == self._instance
            and inputs.clamp_cmd
            and inputs.handoff_wafer_id
        ):
            self._wafer_id = inputs.handoff_wafer_id
        if inputs.handoff_target == self._instance and not inputs.clamp_cmd:
            # Handler taking the wafer back when clamp released by MC.
            self._wafer_id = ""

        vel_x = (inputs.setpoint_x - self._prev_pos_x) / dt if dt > 0 else 0.0
        vel_y = (inputs.setpoint_y - self._prev_pos_y) / dt if dt > 0 else 0.0
        self._prev_pos_x = inputs.setpoint_x
        self._prev_pos_y = inputs.setpoint_y

        return WaferStageOutputs(
            pos_x=inputs.setpoint_x,
            pos_y=inputs.setpoint_y,
            pos_z=inputs.setpoint_z,
            rx=inputs.setpoint_rx,
            ry=inputs.setpoint_ry,
            rz=inputs.setpoint_rz,
            vel_x=vel_x,
            vel_y=vel_y,
            clamped=inputs.clamp_cmd,
            wafer_id=self._wafer_id,
            stage_mode=inputs.mode_cmd,
        )
