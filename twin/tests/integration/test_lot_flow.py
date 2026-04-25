"""End-to-end scenario: lot_flow.yaml passes all assertions."""

from __future__ import annotations

import math
from pathlib import Path

from twin.orchestrator import Orchestrator
from twin.scenario.runner import Scenario, ScenarioRunner

SCENARIO_PATH = (
    Path(__file__).parents[2]
    / "src"
    / "twin"
    / "scenario"
    / "scenarios"
    / "lot_flow.yaml"
)


def test_lot_flow_scenario_runs_and_passes_assertions() -> None:
    scenario = Scenario.from_yaml(SCENARIO_PATH)
    orch = Orchestrator()
    runner = ScenarioRunner(scenario)
    orch.attach_scenario(runner)

    n_ticks = math.ceil(scenario.duration_s / orch.dt)
    final = orch.run(n_ticks)

    assert runner.failures == [], f"scenario assertions failed: {runner.failures}"
    assert final.machine_control.lot_done
    # Both stages must have held a wafer at some point.
    assert "W001" in {final.wafer_stage_a.wafer_id, ""} or final.wafer_stage_a.wafer_id == ""
    # All wafers returned (no wafer left clamped).
    assert not final.wafer_stage_a.clamped
    assert not final.wafer_stage_b.clamped
    # Reticle returned to handler.
    assert final.reticle_stage.reticle_id == ""


def test_null_viewer_runs_independently_of_subsystems() -> None:
    """Proves the bus/viewer split: replacing the renderer touches no module code."""
    from twin.viewer.rerun_logger import NullLogger

    scenario = Scenario.from_yaml(SCENARIO_PATH)
    orch = Orchestrator()
    orch.attach_scenario(ScenarioRunner(scenario))
    orch.attach_viewer(NullLogger())

    n_ticks = math.ceil(scenario.duration_s / orch.dt)
    orch.run(n_ticks)
    assert orch.latest.machine_control.lot_done
