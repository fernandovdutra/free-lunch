"""Scenario runner: parses YAML files and drives the orchestrator.

A scenario file looks like::

    name: lot_flow
    duration_s: 60
    events:
      - at: 0.0
        type: start_lot
        wafer_ids: [W001, W002]
        reticle_id: R001
      - at: 5.0
        assert: { reticle_stage.reticle_id: R001 }

``type`` events are dispatched as inputs to MachineControl.
``assert`` events read from the latest BusSnapshot at their ``at`` time
and raise :class:`AssertionError` on mismatch.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

from twin.bus import BusSnapshot
from twin.subsystems.machine_control.module import MachineControl


@dataclass
class _Event:
    at_s: float
    raw: dict[str, Any]
    fired: bool = False


@dataclass
class Scenario:
    name: str
    duration_s: float
    events: list[_Event] = field(default_factory=list)

    @classmethod
    def from_yaml(cls, path: str | Path) -> Scenario:
        data = yaml.safe_load(Path(path).read_text())
        events = [
            _Event(at_s=float(e.pop("at")), raw=dict(e)) for e in data.get("events", [])
        ]
        return cls(
            name=str(data.get("name", path)),
            duration_s=float(data["duration_s"]),
            events=sorted(events, key=lambda e: e.at_s),
        )


class ScenarioRunner:
    def __init__(self, scenario: Scenario) -> None:
        self.scenario = scenario
        self._failures: list[str] = []
        self._completed = False

    @property
    def failures(self) -> list[str]:
        return list(self._failures)

    @property
    def completed(self) -> bool:
        return self._completed

    def inject(self, mc: MachineControl, sim_time: float) -> None:
        for ev in self.scenario.events:
            if ev.fired or ev.at_s > sim_time:
                continue
            if "type" in ev.raw:
                mc.queue_event(ev.raw)
                ev.fired = True

    def observe(self, snap: BusSnapshot) -> None:
        for ev in self.scenario.events:
            if ev.fired or ev.at_s > snap.sim_time:
                continue
            if "assert" in ev.raw:
                self._check_assertion(ev.raw["assert"], snap)
                ev.fired = True
        if snap.sim_time >= self.scenario.duration_s:
            self._completed = True

    def _check_assertion(self, expected: dict[str, Any], snap: BusSnapshot) -> None:
        for path, want in expected.items():
            got = _resolve_path(snap, path)
            if got != want:
                self._failures.append(
                    f"assertion failed at sim_time={snap.sim_time:.2f}s: "
                    f"{path}={got!r} (expected {want!r})"
                )


def _resolve_path(snap: BusSnapshot, dotted: str) -> Any:
    cur: Any = snap
    for part in dotted.split("."):
        cur = getattr(cur, part)
    return cur
