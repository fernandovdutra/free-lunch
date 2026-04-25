"""LevelSensor module: trigger-driven topography measurement returning a z-map token."""

from __future__ import annotations

from typing import ClassVar

from twin.subsystems.base import Inputs, Outputs, Parameters
from twin.subsystems.level_sensor.schema import (
    LevelSensorInputs,
    LevelSensorOutputs,
    LevelSensorParameters,
)


class LevelSensor:
    name = "level_sensor"
    InputSchema: ClassVar[type[Inputs]] = LevelSensorInputs
    OutputSchema: ClassVar[type[Outputs]] = LevelSensorOutputs
    ParameterSchema: ClassVar[type[Parameters]] = LevelSensorParameters

    def __init__(self) -> None:
        self._params = LevelSensorParameters()
        self._busy_elapsed_s = 0.0
        self._was_triggered = False
        self._latched_wafer_id = ""

    def reset(self, params: Parameters) -> Outputs:
        assert isinstance(params, LevelSensorParameters)
        self._params = params
        self._busy_elapsed_s = 0.0
        self._was_triggered = False
        self._latched_wafer_id = ""
        return LevelSensorOutputs()

    def make_inputs(self, snap: object) -> Inputs:
        from twin.bus import BusSnapshot

        assert isinstance(snap, BusSnapshot)
        return LevelSensorInputs.from_snapshot(snap)

    def step(self, dt: float, inputs: Inputs) -> Outputs:
        assert isinstance(inputs, LevelSensorInputs)
        wafer_id = (
            inputs.stage_a_wafer_id if inputs.measure_stage == "A" else inputs.stage_b_wafer_id
        )

        if inputs.trigger and not self._was_triggered:
            self._busy_elapsed_s = 0.0
            self._latched_wafer_id = wafer_id
        self._was_triggered = inputs.trigger

        if inputs.trigger and self._busy_elapsed_s < self._params.measure_duration_s:
            self._busy_elapsed_s += dt
            return LevelSensorOutputs(
                measuring=True,
                wafer_id_seen=self._latched_wafer_id,
            )
        if inputs.trigger and self._busy_elapsed_s >= self._params.measure_duration_s:
            return LevelSensorOutputs(
                measuring=False,
                wafer_id_seen=self._latched_wafer_id,
                z_map_token=f"zmap:{self._latched_wafer_id}",
                ready=True,
            )
        return LevelSensorOutputs()
