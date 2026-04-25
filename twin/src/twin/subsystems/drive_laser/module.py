"""DriveLaser module: warm-up timer + steady-state pulse output."""

from __future__ import annotations

from typing import ClassVar

from twin.subsystems.base import Inputs, Outputs, Parameters
from twin.subsystems.drive_laser.schema import (
    DriveLaserInputs,
    DriveLaserOutputs,
    DriveLaserParameters,
)


class DriveLaser:
    name = "drive_laser"
    InputSchema: ClassVar[type[Inputs]] = DriveLaserInputs
    OutputSchema: ClassVar[type[Outputs]] = DriveLaserOutputs
    ParameterSchema: ClassVar[type[Parameters]] = DriveLaserParameters

    def __init__(self) -> None:
        self._params = DriveLaserParameters()
        self._warmup_elapsed_s = 0.0

    def reset(self, params: Parameters) -> Outputs:
        assert isinstance(params, DriveLaserParameters)
        self._params = params
        self._warmup_elapsed_s = 0.0
        return DriveLaserOutputs()

    def make_inputs(self, snap: object) -> Inputs:
        from twin.bus import BusSnapshot

        assert isinstance(snap, BusSnapshot)
        return DriveLaserInputs.from_snapshot(snap)

    def step(self, dt: float, inputs: Inputs) -> Outputs:
        assert isinstance(inputs, DriveLaserInputs)
        if not inputs.enable:
            self._warmup_elapsed_s = 0.0
            return DriveLaserOutputs()
        self._warmup_elapsed_s += dt
        if self._warmup_elapsed_s < self._params.warmup_s:
            return DriveLaserOutputs(rep_rate_Hz=self._params.nominal_rep_rate_Hz * 0.1)
        return DriveLaserOutputs(
            pulse_energy_mJ=self._params.nominal_pulse_energy_mJ,
            rep_rate_Hz=self._params.nominal_rep_rate_Hz,
            available=True,
            locked_to_droplet=True,
        )
