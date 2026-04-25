"""VacuumGas schema. Both chamber compartments, DGL + DGL-m, hydrogen flow."""

from __future__ import annotations

from typing import TYPE_CHECKING

from twin.subsystems.base import Inputs, Outputs, Parameters, fmi_field

if TYPE_CHECKING:
    from twin.bus import BusSnapshot


class VacuumGasInputs(Inputs):
    enable: bool = fmi_field(False, causality="input", variability="discrete", fmi_type="Boolean")

    @classmethod
    def from_snapshot(cls, snap: BusSnapshot) -> VacuumGasInputs:
        return cls(enable=snap.machine_control.vacuum_gas_enable)


class VacuumGasOutputs(Outputs):
    pob_pressure_Pa: float = fmi_field(101_325.0, unit="Pa")
    wafer_compartment_pressure_Pa: float = fmi_field(101_325.0, unit="Pa")
    h2_flow_sccm: float = fmi_field(0.0, unit="sccm")
    dgl_active: bool = fmi_field(False, variability="discrete", fmi_type="Boolean")
    dgl_m_present: bool = fmi_field(True, variability="discrete", fmi_type="Boolean")
    ok: bool = fmi_field(False, variability="discrete", fmi_type="Boolean")


class VacuumGasParameters(Parameters):
    pumpdown_s: float = fmi_field(2.0, unit="s", causality="parameter", variability="fixed")
    operating_pob_pressure_Pa: float = fmi_field(
        1e-7, unit="Pa", causality="parameter", variability="fixed"
    )
    operating_wafer_pressure_Pa: float = fmi_field(
        1e-3, unit="Pa", causality="parameter", variability="fixed"
    )
    nominal_h2_flow_sccm: float = fmi_field(
        500.0, unit="sccm", causality="parameter", variability="fixed"
    )
