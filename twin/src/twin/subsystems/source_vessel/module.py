"""SourceVessel module: warmup gated by drive laser readiness."""

from __future__ import annotations

from typing import ClassVar

from twin.subsystems.base import Inputs, Outputs, Parameters
from twin.subsystems.source_vessel.schema import (
    SourceVesselInputs,
    SourceVesselOutputs,
    SourceVesselParameters,
)


class SourceVessel:
    name = "source_vessel"
    InputSchema: ClassVar[type[Inputs]] = SourceVesselInputs
    OutputSchema: ClassVar[type[Outputs]] = SourceVesselOutputs
    ParameterSchema: ClassVar[type[Parameters]] = SourceVesselParameters

    def __init__(self) -> None:
        self._params = SourceVesselParameters()
        self._warmup_elapsed_s = 0.0

    def reset(self, params: Parameters) -> Outputs:
        assert isinstance(params, SourceVesselParameters)
        self._params = params
        self._warmup_elapsed_s = 0.0
        return SourceVesselOutputs()

    def make_inputs(self, snap: object) -> Inputs:
        from twin.bus import BusSnapshot

        assert isinstance(snap, BusSnapshot)
        return SourceVesselInputs.from_snapshot(snap)

    def step(self, dt: float, inputs: Inputs) -> Outputs:
        assert isinstance(inputs, SourceVesselInputs)
        if not inputs.enable or not inputs.drive_locked_to_droplet:
            self._warmup_elapsed_s = 0.0
            return SourceVesselOutputs(mode="idle")
        self._warmup_elapsed_s += dt
        if self._warmup_elapsed_s < self._params.warmup_s:
            return SourceVesselOutputs(
                power_at_if_W=self._params.nominal_power_W
                * (self._warmup_elapsed_s / self._params.warmup_s),
                dose_stability_pct=2.0,
                mode="warmup",
            )
        return SourceVesselOutputs(
            power_at_if_W=self._params.nominal_power_W,
            dose_stability_pct=0.3,
            available=True,
            mode="ready",
        )
