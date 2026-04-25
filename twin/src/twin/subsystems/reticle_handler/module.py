"""ReticleHandler module: small phase machine for fetch/return cycles."""

from __future__ import annotations

from typing import ClassVar

from twin.subsystems.base import Inputs, Outputs, Parameters
from twin.subsystems.reticle_handler.schema import (
    ReticleHandlerInputs,
    ReticleHandlerOutputs,
    ReticleHandlerParameters,
)


class ReticleHandler:
    name = "reticle_handler"
    InputSchema: ClassVar[type[Inputs]] = ReticleHandlerInputs
    OutputSchema: ClassVar[type[Outputs]] = ReticleHandlerOutputs
    ParameterSchema: ClassVar[type[Parameters]] = ReticleHandlerParameters

    def __init__(self) -> None:
        self._params = ReticleHandlerParameters()
        self._phase = "idle"
        self._phase_elapsed_s = 0.0
        self._held_reticle_id = ""
        self._last_action = "idle"

    def reset(self, params: Parameters) -> Outputs:
        assert isinstance(params, ReticleHandlerParameters)
        self._params = params
        self._phase = "idle"
        self._phase_elapsed_s = 0.0
        self._held_reticle_id = ""
        self._last_action = "idle"
        return ReticleHandlerOutputs()

    def make_inputs(self, snap: object) -> Inputs:
        from twin.bus import BusSnapshot

        assert isinstance(snap, BusSnapshot)
        return ReticleHandlerInputs.from_snapshot(snap)

    def step(self, dt: float, inputs: Inputs) -> Outputs:
        assert isinstance(inputs, ReticleHandlerInputs)

        # Edge-trigger phase entry on action change.
        if inputs.action != self._last_action:
            if inputs.action == "fetch":
                self._phase = "fetching"
                self._phase_elapsed_s = 0.0
            elif inputs.action == "return":
                self._phase = "returning"
                self._phase_elapsed_s = 0.0
            else:
                self._phase = "idle"
            self._last_action = inputs.action

        handoff_reticle_id = ""
        pod_open = False

        if self._phase == "fetching":
            self._phase_elapsed_s += dt
            pod_open = True
            self._held_reticle_id = inputs.target_reticle_id
            if self._phase_elapsed_s >= self._params.fetch_duration_s:
                handoff_reticle_id = inputs.target_reticle_id
                if inputs.reticle_stage_clamped:
                    self._held_reticle_id = ""
                    self._phase = "idle"
        elif self._phase == "returning":
            self._phase_elapsed_s += dt
            pod_open = True
            if self._phase_elapsed_s >= self._params.return_duration_s:
                self._held_reticle_id = ""
                self._phase = "idle"

        return ReticleHandlerOutputs(
            robot_pose_x=0.0,
            robot_pose_y=self._phase_elapsed_s if self._phase != "idle" else 0.0,
            robot_pose_z=0.0,
            pod_open=pod_open,
            held_reticle_id=self._held_reticle_id,
            handoff_reticle_id=handoff_reticle_id,
            busy=self._phase != "idle",
            phase=self._phase,
        )
