"""ReticleStage module: pose follows setpoints with one-tick lag; clamp + handoff."""

from __future__ import annotations

from typing import ClassVar

from twin.subsystems.base import Inputs, Outputs, Parameters
from twin.subsystems.reticle_stage.schema import (
    ReticleStageInputs,
    ReticleStageOutputs,
    ReticleStageParameters,
)


class ReticleStage:
    name = "reticle_stage"
    InputSchema: ClassVar[type[Inputs]] = ReticleStageInputs
    OutputSchema: ClassVar[type[Outputs]] = ReticleStageOutputs
    ParameterSchema: ClassVar[type[Parameters]] = ReticleStageParameters

    def __init__(self) -> None:
        self._params = ReticleStageParameters()
        self._reticle_id = ""

    def reset(self, params: Parameters) -> Outputs:
        assert isinstance(params, ReticleStageParameters)
        self._params = params
        self._reticle_id = ""
        return ReticleStageOutputs()

    def make_inputs(self, snap: object) -> Inputs:
        from twin.bus import BusSnapshot

        assert isinstance(snap, BusSnapshot)
        return ReticleStageInputs.from_snapshot(snap)

    def step(self, dt: float, inputs: Inputs) -> Outputs:
        assert isinstance(inputs, ReticleStageInputs)
        # Handoff: when reticle handler offers a reticle and we're clamped, latch it.
        if inputs.clamp_cmd and inputs.handoff_reticle_id:
            self._reticle_id = inputs.handoff_reticle_id
        elif not inputs.clamp_cmd:
            # Releasing clamp returns the reticle to the handler.
            self._reticle_id = ""

        scanning = abs(inputs.scan_velocity_cmd) > 1e-6
        mode = "expose" if scanning else ("idle" if not inputs.clamp_cmd else "ready")

        return ReticleStageOutputs(
            pos_x=inputs.setpoint_x,
            pos_y=inputs.setpoint_y,
            pos_z=inputs.setpoint_z,
            rx=inputs.setpoint_rx,
            ry=inputs.setpoint_ry,
            rz=inputs.setpoint_rz,
            scan_velocity=inputs.scan_velocity_cmd,
            clamped=inputs.clamp_cmd,
            reticle_id=self._reticle_id,
            mode=mode,
        )
