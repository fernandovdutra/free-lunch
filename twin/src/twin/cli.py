"""``python -m twin run <scenario.yaml>`` entry point."""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

from twin.orchestrator import DEFAULT_DT_S, Orchestrator
from twin.scenario.runner import Scenario, ScenarioRunner


def _bundled_scenario(name: str) -> Path:
    here = Path(__file__).parent / "scenario" / "scenarios" / f"{name}.yaml"
    return here


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="twin")
    sub = parser.add_subparsers(dest="cmd", required=True)

    run = sub.add_parser("run", help="Run a scenario.")
    run.add_argument(
        "scenario",
        nargs="?",
        default="lot_flow",
        help="path to a scenario YAML, or the bare name of a bundled scenario.",
    )
    run.add_argument(
        "--rerun",
        action="store_true",
        help="open a Rerun viewer in parallel with the simulation.",
    )
    run.add_argument(
        "--null-viewer",
        action="store_true",
        help="attach a NullLogger viewer (proves subsystem code is renderer-agnostic).",
    )

    args = parser.parse_args(argv)
    if args.cmd != "run":
        parser.error(f"unknown command {args.cmd!r}")

    scen_path = Path(args.scenario)
    if not scen_path.exists():
        scen_path = _bundled_scenario(args.scenario)
    if not scen_path.exists():
        print(f"scenario not found: {args.scenario}", file=sys.stderr)
        return 2

    scenario = Scenario.from_yaml(scen_path)
    orch = Orchestrator()
    runner = ScenarioRunner(scenario)
    orch.attach_scenario(runner)

    if args.rerun:
        from twin.viewer.rerun_logger import RerunLogger

        orch.attach_viewer(RerunLogger())
    elif args.null_viewer:
        from twin.viewer.rerun_logger import NullLogger

        orch.attach_viewer(NullLogger())

    n_ticks = math.ceil(scenario.duration_s / orch.dt)
    final = orch.run(n_ticks)

    print(
        f"scenario={scenario.name} dt={orch.dt}s ticks={n_ticks} "
        f"sim_time={final.sim_time:.2f}s phase={final.machine_control.current_phase} "
        f"lot_done={final.machine_control.lot_done}"
    )
    if runner.failures:
        for f in runner.failures:
            print(f"  FAIL: {f}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


# Re-export for the [project.scripts] entry point.
__all__ = ["DEFAULT_DT_S", "main"]
