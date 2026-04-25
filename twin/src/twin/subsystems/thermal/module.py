"""Thermal module: stable once enabled."""

from __future__ import annotations

from typing import ClassVar

from twin.subsystems.base import Inputs, Outputs, Parameters
from twin.subsystems.thermal.schema import (
    ThermalInputs,
    ThermalOutputs,
    ThermalParameters,
)


class Thermal:
    name = "thermal"
    InputSchema: ClassVar[type[Inputs]] = ThermalInputs
    OutputSchema: ClassVar[type[Outputs]] = ThermalOutputs
    ParameterSchema: ClassVar[type[Parameters]] = ThermalParameters

    def __init__(self) -> None:
        self._params = ThermalParameters()

    def reset(self, params: Parameters) -> Outputs:
        assert isinstance(params, ThermalParameters)
        self._params = params
        return ThermalOutputs()

    def make_inputs(self, snap: object) -> Inputs:
        from twin.bus import BusSnapshot

        assert isinstance(snap, BusSnapshot)
        return ThermalInputs.from_snapshot(snap)

    def step(self, dt: float, inputs: Inputs) -> Outputs:
        assert isinstance(inputs, ThermalInputs)
        return ThermalOutputs(
            water_temp_C=self._params.setpoint_water_C,
            reticle_temp_C=self._params.setpoint_water_C,
            optic_temp_ok=inputs.enable,
        )
