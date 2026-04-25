"""Illuminator module: ready when source available + enable, with one-tick lag."""

from __future__ import annotations

from typing import ClassVar

from twin.subsystems.base import Inputs, Outputs, Parameters
from twin.subsystems.illuminator.schema import (
    IlluminatorInputs,
    IlluminatorOutputs,
    IlluminatorParameters,
)


class Illuminator:
    name = "illuminator"
    InputSchema: ClassVar[type[Inputs]] = IlluminatorInputs
    OutputSchema: ClassVar[type[Outputs]] = IlluminatorOutputs
    ParameterSchema: ClassVar[type[Parameters]] = IlluminatorParameters

    def __init__(self) -> None:
        self._params = IlluminatorParameters()

    def reset(self, params: Parameters) -> Outputs:
        assert isinstance(params, IlluminatorParameters)
        self._params = params
        return IlluminatorOutputs()

    def make_inputs(self, snap: object) -> Inputs:
        from twin.bus import BusSnapshot

        assert isinstance(snap, BusSnapshot)
        return IlluminatorInputs.from_snapshot(snap)

    def step(self, dt: float, inputs: Inputs) -> Outputs:
        assert isinstance(inputs, IlluminatorInputs)
        ready = inputs.enable and inputs.source_available
        return IlluminatorOutputs(
            pupil_mode=inputs.pupil_mode_cmd,
            field_open=ready,
            dose_uniformity_pct=0.5 if ready else 0.0,
            ready=ready,
        )
