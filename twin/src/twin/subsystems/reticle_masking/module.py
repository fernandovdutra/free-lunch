"""ReticleMasking module: blades follow setpoints; sync flag from reticle scan velocity."""

from __future__ import annotations

from typing import ClassVar

from twin.subsystems.base import Inputs, Outputs, Parameters
from twin.subsystems.reticle_masking.schema import (
    ReticleMaskingInputs,
    ReticleMaskingOutputs,
    ReticleMaskingParameters,
)


class ReticleMasking:
    name = "reticle_masking"
    InputSchema: ClassVar[type[Inputs]] = ReticleMaskingInputs
    OutputSchema: ClassVar[type[Outputs]] = ReticleMaskingOutputs
    ParameterSchema: ClassVar[type[Parameters]] = ReticleMaskingParameters

    def __init__(self) -> None:
        self._params = ReticleMaskingParameters()

    def reset(self, params: Parameters) -> Outputs:
        assert isinstance(params, ReticleMaskingParameters)
        self._params = params
        return ReticleMaskingOutputs()

    def make_inputs(self, snap: object) -> Inputs:
        from twin.bus import BusSnapshot

        assert isinstance(snap, BusSnapshot)
        return ReticleMaskingInputs.from_snapshot(snap)

    def step(self, dt: float, inputs: Inputs) -> Outputs:
        assert isinstance(inputs, ReticleMaskingInputs)
        return ReticleMaskingOutputs(
            blade_x_minus=inputs.blade_x_minus_set,
            blade_x_plus=inputs.blade_x_plus_set,
            blade_y_minus=inputs.blade_y_minus_set,
            blade_y_plus=inputs.blade_y_plus_set,
            synced_to_reticle=abs(inputs.reticle_scan_velocity) > 1e-6,
        )
