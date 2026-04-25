"""VacuumGas module: ramp pressure down to operating values when enabled."""

from __future__ import annotations

from typing import ClassVar

from twin.subsystems.base import Inputs, Outputs, Parameters
from twin.subsystems.vacuum_gas.schema import (
    VacuumGasInputs,
    VacuumGasOutputs,
    VacuumGasParameters,
)


class VacuumGas:
    name = "vacuum_gas"
    InputSchema: ClassVar[type[Inputs]] = VacuumGasInputs
    OutputSchema: ClassVar[type[Outputs]] = VacuumGasOutputs
    ParameterSchema: ClassVar[type[Parameters]] = VacuumGasParameters

    def __init__(self) -> None:
        self._params = VacuumGasParameters()
        self._pumpdown_elapsed_s = 0.0

    def reset(self, params: Parameters) -> Outputs:
        assert isinstance(params, VacuumGasParameters)
        self._params = params
        self._pumpdown_elapsed_s = 0.0
        return VacuumGasOutputs()

    def make_inputs(self, snap: object) -> Inputs:
        from twin.bus import BusSnapshot

        assert isinstance(snap, BusSnapshot)
        return VacuumGasInputs.from_snapshot(snap)

    def step(self, dt: float, inputs: Inputs) -> Outputs:
        assert isinstance(inputs, VacuumGasInputs)
        if not inputs.enable:
            self._pumpdown_elapsed_s = 0.0
            return VacuumGasOutputs()
        self._pumpdown_elapsed_s += dt
        ratio = min(self._pumpdown_elapsed_s / self._params.pumpdown_s, 1.0)
        atm = 101_325.0
        pob_p = atm * (1.0 - ratio) + self._params.operating_pob_pressure_Pa * ratio
        wafer_p = atm * (1.0 - ratio) + self._params.operating_wafer_pressure_Pa * ratio
        return VacuumGasOutputs(
            pob_pressure_Pa=pob_p,
            wafer_compartment_pressure_Pa=wafer_p,
            h2_flow_sccm=self._params.nominal_h2_flow_sccm * ratio,
            dgl_active=ratio >= 1.0,
            dgl_m_present=True,
            ok=ratio >= 1.0,
        )
