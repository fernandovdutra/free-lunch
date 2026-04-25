"""Orchestrator tick loop and FMI metadata sanity checks."""

from __future__ import annotations

from twin.orchestrator import Orchestrator, build_default_modules


def test_default_module_set_has_17_instances_and_16_types() -> None:
    modules = build_default_modules()
    assert len(modules) == 17
    type_names = {type(m).__name__ for m in modules}
    assert len(type_names) == 16


def test_module_names_match_bus_snapshot_fields() -> None:
    from twin.bus import BusSnapshot

    bus_fields = set(BusSnapshot.model_fields) - {"tick", "sim_time"}
    module_names = {m.name for m in build_default_modules()}
    assert module_names == bus_fields


def test_step_advances_tick_and_sim_time() -> None:
    orch = Orchestrator()
    snap0 = orch.latest
    orch.step_once()
    assert orch.tick == 1
    assert orch.latest.tick == 1
    assert orch.latest.sim_time > snap0.sim_time


def test_run_drives_phase_transitions_when_lot_started() -> None:
    orch = Orchestrator()
    orch.machine_control().queue_event(
        {"type": "start_lot", "wafer_ids": ["W001"], "reticle_id": "R001"}
    )
    final = orch.run_until_done(max_ticks=5_000)
    assert final.machine_control.lot_done is True
    assert final.machine_control.current_phase == "done"


def test_outputs_carry_fmi_metadata() -> None:
    """Every Outputs class field has fmi_causality / fmi_variability / fmi_type."""
    from twin.subsystems.wafer_stage.schema import WaferStageOutputs

    for name, info in WaferStageOutputs.model_fields.items():
        extra = info.json_schema_extra or {}
        assert "fmi_causality" in extra, f"{name} missing fmi_causality"
        assert "fmi_variability" in extra, f"{name} missing fmi_variability"
        assert "fmi_type" in extra, f"{name} missing fmi_type"
