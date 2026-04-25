"""MachineControl phase-machine end-to-end. Drives every transition."""

from __future__ import annotations

from twin.orchestrator import Orchestrator


def _start(orch: Orchestrator, n_wafers: int = 2) -> None:
    orch.machine_control().queue_event(
        {
            "type": "start_lot",
            "wafer_ids": [f"W{i:03d}" for i in range(1, n_wafers + 1)],
            "reticle_id": "R001",
        }
    )


def test_lot_completes_with_two_wafers_alternating_stages() -> None:
    orch = Orchestrator()
    _start(orch, n_wafers=2)

    seen_phases: set[str] = set()
    saw_a_held = False
    saw_b_held = False
    for _ in range(5_000):
        snap = orch.step_once()
        seen_phases.add(snap.machine_control.current_phase)
        if snap.wafer_stage_a.wafer_id:
            saw_a_held = True
        if snap.wafer_stage_b.wafer_id:
            saw_b_held = True
        if snap.machine_control.lot_done:
            break
    assert {"power_up", "reticle_load", "wafer_load", "align", "level",
            "swap_to_expose", "expose", "swap_to_measure", "wafer_unload",
            "reticle_unload", "power_down", "done"} <= seen_phases
    # Both chuck instances see a wafer at some point in the lot.
    assert saw_a_held and saw_b_held
    assert orch.latest.machine_control.lot_done


def test_field_index_reaches_configured_count() -> None:
    orch = Orchestrator()
    _start(orch, n_wafers=1)
    n_target = orch.machine_control()._params.n_fields_per_wafer  # type: ignore[attr-defined]

    max_field_seen = 0
    for _ in range(5_000):
        snap = orch.step_once()
        if snap.machine_control.current_phase == "expose":
            max_field_seen = max(max_field_seen, snap.machine_control.field_index)
        if snap.machine_control.lot_done:
            break
    assert max_field_seen >= n_target - 1


def test_reticle_returns_to_handler_at_end_of_lot() -> None:
    orch = Orchestrator()
    _start(orch, n_wafers=1)
    final = orch.run_until_done(max_ticks=5_000)
    assert final.reticle_stage.reticle_id == ""
    assert not final.reticle_stage.clamped
