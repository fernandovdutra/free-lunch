"""Run lot_flow.yaml with a no-op viewer to prove the renderer is replaceable.

Subsystem code never imports the viewer. Swapping ``RerunLogger`` for
``NullLogger`` (or anything implementing :class:`ViewerLike`) needs zero
changes to ``src/twin/subsystems/``.

Usage::

    python tools/swap_viewer.py [--rerun]
"""

from __future__ import annotations

import argparse
import math
from pathlib import Path

from twin.orchestrator import Orchestrator
from twin.scenario.runner import Scenario, ScenarioRunner
from twin.viewer.rerun_logger import NullLogger, RerunLogger


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--rerun", action="store_true", help="use RerunLogger instead of NullLogger.")
    parser.add_argument(
        "--scenario",
        default=str(Path(__file__).parents[1] / "src" / "twin" / "scenario" / "scenarios" / "lot_flow.yaml"),
    )
    args = parser.parse_args(argv)

    scenario = Scenario.from_yaml(args.scenario)
    orch = Orchestrator()
    orch.attach_scenario(ScenarioRunner(scenario))
    orch.attach_viewer(RerunLogger() if args.rerun else NullLogger())

    n_ticks = math.ceil(scenario.duration_s / orch.dt)
    final = orch.run(n_ticks)

    print(
        f"viewer={'rerun' if args.rerun else 'null'} "
        f"phase={final.machine_control.current_phase} lot_done={final.machine_control.lot_done}"
    )
    return 0 if final.machine_control.lot_done else 1


if __name__ == "__main__":
    raise SystemExit(main())
