"""Frames module: emits avis_ok=True. All real content lives in Parameters."""

from __future__ import annotations

from typing import ClassVar

from twin.subsystems.base import Inputs, Outputs, Parameters
from twin.subsystems.frames.schema import FramesInputs, FramesOutputs, FramesParameters


class Frames:
    name = "frames"
    InputSchema: ClassVar[type[Inputs]] = FramesInputs
    OutputSchema: ClassVar[type[Outputs]] = FramesOutputs
    ParameterSchema: ClassVar[type[Parameters]] = FramesParameters

    def __init__(self) -> None:
        self._params = FramesParameters()

    def reset(self, params: Parameters) -> Outputs:
        assert isinstance(params, FramesParameters)
        self._params = params
        return FramesOutputs()

    def make_inputs(self, snap: object) -> Inputs:
        from twin.bus import BusSnapshot

        assert isinstance(snap, BusSnapshot)
        return FramesInputs.from_snapshot(snap)

    def step(self, dt: float, inputs: Inputs) -> Outputs:
        return FramesOutputs(avis_ok=True)

    @property
    def params(self) -> FramesParameters:
        return self._params
