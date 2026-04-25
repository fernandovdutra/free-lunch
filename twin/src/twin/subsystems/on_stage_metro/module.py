"""OnStageMetrology module: dispatches on trigger string to TIS / dose / ILIAS readout."""

from __future__ import annotations

from typing import ClassVar

from twin.subsystems.base import Inputs, Outputs, Parameters
from twin.subsystems.on_stage_metro.schema import (
    OnStageMetrologyInputs,
    OnStageMetrologyOutputs,
    OnStageMetrologyParameters,
)


class OnStageMetrology:
    name = "on_stage_metro"
    InputSchema: ClassVar[type[Inputs]] = OnStageMetrologyInputs
    OutputSchema: ClassVar[type[Outputs]] = OnStageMetrologyOutputs
    ParameterSchema: ClassVar[type[Parameters]] = OnStageMetrologyParameters

    def __init__(self) -> None:
        self._params = OnStageMetrologyParameters()

    def reset(self, params: Parameters) -> Outputs:
        assert isinstance(params, OnStageMetrologyParameters)
        self._params = params
        return OnStageMetrologyOutputs()

    def make_inputs(self, snap: object) -> Inputs:
        from twin.bus import BusSnapshot

        assert isinstance(snap, BusSnapshot)
        return OnStageMetrologyInputs.from_snapshot(snap)

    def step(self, dt: float, inputs: Inputs) -> Outputs:
        assert isinstance(inputs, OnStageMetrologyInputs)
        if inputs.trigger == "tis":
            return OnStageMetrologyOutputs(
                tis_value=inputs.reticle_pos_x * 1e-9,
                ilias_state="idle",
                busy=True,
            )
        if inputs.trigger == "ilias":
            return OnStageMetrologyOutputs(
                ilias_state="measuring",
                busy=True,
            )
        if inputs.trigger == "dose":
            return OnStageMetrologyOutputs(
                dose_value=30.0,
                busy=True,
            )
        return OnStageMetrologyOutputs()
