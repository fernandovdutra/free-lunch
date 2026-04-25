"""WaferHandler module: load/unload sequencer with pre-aligner + handoff."""

from __future__ import annotations

from typing import ClassVar

from twin.subsystems.base import Inputs, Outputs, Parameters
from twin.subsystems.wafer_handler.schema import (
    WaferHandlerInputs,
    WaferHandlerOutputs,
    WaferHandlerParameters,
)


class WaferHandler:
    name = "wafer_handler"
    InputSchema: ClassVar[type[Inputs]] = WaferHandlerInputs
    OutputSchema: ClassVar[type[Outputs]] = WaferHandlerOutputs
    ParameterSchema: ClassVar[type[Parameters]] = WaferHandlerParameters

    def __init__(self) -> None:
        self._params = WaferHandlerParameters()
        self._phase = "idle"
        self._phase_elapsed_s = 0.0
        self._held_wafer_id = ""
        self._last_action = "idle"
        self._target_stage_latched = ""
        self._target_wafer_latched = ""

    def reset(self, params: Parameters) -> Outputs:
        assert isinstance(params, WaferHandlerParameters)
        self._params = params
        self._phase = "idle"
        self._phase_elapsed_s = 0.0
        self._held_wafer_id = ""
        self._last_action = "idle"
        self._target_stage_latched = ""
        self._target_wafer_latched = ""
        return WaferHandlerOutputs()

    def make_inputs(self, snap: object) -> Inputs:
        from twin.bus import BusSnapshot

        assert isinstance(snap, BusSnapshot)
        return WaferHandlerInputs.from_snapshot(snap)

    def step(self, dt: float, inputs: Inputs) -> Outputs:
        assert isinstance(inputs, WaferHandlerInputs)

        if inputs.action != self._last_action:
            if inputs.action == "load":
                self._phase = "loading"
                self._phase_elapsed_s = 0.0
                self._target_stage_latched = inputs.target_stage
                self._target_wafer_latched = inputs.target_wafer_id
                self._held_wafer_id = inputs.target_wafer_id
            elif inputs.action == "unload":
                self._phase = "unloading"
                self._phase_elapsed_s = 0.0
                self._target_stage_latched = inputs.target_stage
                self._target_wafer_latched = inputs.target_wafer_id
            else:
                self._phase = "idle"
            self._last_action = inputs.action

        handoff_wafer_id = ""
        handoff_target = ""
        foup_open = False
        prealigner_busy = False

        if self._phase == "loading":
            self._phase_elapsed_s += dt
            foup_open = True
            prealigner_busy = self._phase_elapsed_s < self._params.load_duration_s * 0.5
            if self._phase_elapsed_s >= self._params.load_duration_s:
                handoff_wafer_id = self._target_wafer_latched
                handoff_target = self._target_stage_latched
                if (
                    self._target_stage_latched == "A" and inputs.stage_a_clamped
                ) or (self._target_stage_latched == "B" and inputs.stage_b_clamped):
                    self._held_wafer_id = ""
                    self._phase = "idle"
        elif self._phase == "unloading":
            self._phase_elapsed_s += dt
            foup_open = True
            if self._phase_elapsed_s < dt * 1.5:
                # Tell the stage to release the wafer back to us.
                handoff_target = self._target_stage_latched
            if self._phase_elapsed_s >= self._params.unload_duration_s:
                self._held_wafer_id = ""
                self._phase = "idle"
            else:
                self._held_wafer_id = self._target_wafer_latched

        return WaferHandlerOutputs(
            robot_pose_x=0.0,
            robot_pose_y=self._phase_elapsed_s if self._phase != "idle" else 0.0,
            robot_pose_z=0.0,
            foup_open=foup_open,
            prealigner_busy=prealigner_busy,
            held_wafer_id=self._held_wafer_id,
            handoff_wafer_id=handoff_wafer_id,
            handoff_target=handoff_target,
            busy=self._phase != "idle",
            phase=self._phase,
        )
