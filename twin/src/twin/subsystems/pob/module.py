"""POB module: trivial constant-output subsystem in Phase 0."""

from __future__ import annotations

from typing import ClassVar

from twin.subsystems.base import Inputs, Outputs, Parameters
from twin.subsystems.pob.schema import POBInputs, POBOutputs, POBParameters


class POB:
    name = "pob"
    InputSchema: ClassVar[type[Inputs]] = POBInputs
    OutputSchema: ClassVar[type[Outputs]] = POBOutputs
    ParameterSchema: ClassVar[type[Parameters]] = POBParameters

    def __init__(self) -> None:
        self._params = POBParameters()

    def reset(self, params: Parameters) -> Outputs:
        assert isinstance(params, POBParameters)
        self._params = params
        return POBOutputs()

    def make_inputs(self, snap: object) -> Inputs:
        from twin.bus import BusSnapshot

        assert isinstance(snap, BusSnapshot)
        return POBInputs.from_snapshot(snap)

    def step(self, dt: float, inputs: Inputs) -> Outputs:
        return POBOutputs()
