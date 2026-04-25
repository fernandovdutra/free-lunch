"""AlignmentSensor module: trigger-driven measurement with canned dx/dy/theta result."""

from __future__ import annotations

from typing import ClassVar

from twin.subsystems.alignment_sensor.schema import (
    AlignmentSensorInputs,
    AlignmentSensorOutputs,
    AlignmentSensorParameters,
)
from twin.subsystems.base import Inputs, Outputs, Parameters


class AlignmentSensor:
    name = "alignment_sensor"
    InputSchema: ClassVar[type[Inputs]] = AlignmentSensorInputs
    OutputSchema: ClassVar[type[Outputs]] = AlignmentSensorOutputs
    ParameterSchema: ClassVar[type[Parameters]] = AlignmentSensorParameters

    def __init__(self) -> None:
        self._params = AlignmentSensorParameters()
        self._busy_elapsed_s = 0.0
        self._was_triggered = False
        self._latched_wafer_id = ""

    def reset(self, params: Parameters) -> Outputs:
        assert isinstance(params, AlignmentSensorParameters)
        self._params = params
        self._busy_elapsed_s = 0.0
        self._was_triggered = False
        self._latched_wafer_id = ""
        return AlignmentSensorOutputs()

    def make_inputs(self, snap: object) -> Inputs:
        from twin.bus import BusSnapshot

        assert isinstance(snap, BusSnapshot)
        return AlignmentSensorInputs.from_snapshot(snap)

    def step(self, dt: float, inputs: Inputs) -> Outputs:
        assert isinstance(inputs, AlignmentSensorInputs)
        wafer_id = (
            inputs.stage_a_wafer_id if inputs.measure_stage == "A" else inputs.stage_b_wafer_id
        )

        if inputs.trigger and not self._was_triggered:
            self._busy_elapsed_s = 0.0
            self._latched_wafer_id = wafer_id
        self._was_triggered = inputs.trigger

        if inputs.trigger and self._busy_elapsed_s < self._params.measure_duration_s:
            self._busy_elapsed_s += dt
            return AlignmentSensorOutputs(
                measuring=True,
                wafer_id_seen=self._latched_wafer_id,
            )
        if inputs.trigger and self._busy_elapsed_s >= self._params.measure_duration_s:
            return AlignmentSensorOutputs(
                measuring=False,
                wafer_id_seen=self._latched_wafer_id,
                dx=1.2e-9,
                dy=-0.8e-9,
                theta=0.5e-6,
                ready=True,
            )
        return AlignmentSensorOutputs()
