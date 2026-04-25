"""Orchestrator: tick loop over a set of subsystems with a Jacobi snapshot bus."""

from __future__ import annotations

from collections import deque
from typing import Protocol

from twin.bus import BusSnapshot
from twin.subsystems.alignment_sensor.module import AlignmentSensor
from twin.subsystems.base import Outputs, Parameters, Subsystem
from twin.subsystems.drive_laser.module import DriveLaser
from twin.subsystems.frames.module import Frames
from twin.subsystems.illuminator.module import Illuminator
from twin.subsystems.level_sensor.module import LevelSensor
from twin.subsystems.machine_control.module import MachineControl
from twin.subsystems.on_stage_metro.module import OnStageMetrology
from twin.subsystems.pob.module import POB
from twin.subsystems.reticle_handler.module import ReticleHandler
from twin.subsystems.reticle_masking.module import ReticleMasking
from twin.subsystems.reticle_stage.module import ReticleStage
from twin.subsystems.source_vessel.module import SourceVessel
from twin.subsystems.thermal.module import Thermal
from twin.subsystems.vacuum_gas.module import VacuumGas
from twin.subsystems.wafer_handler.module import WaferHandler
from twin.subsystems.wafer_stage.module import WaferStage

DEFAULT_DT_S = 0.01


class ScenarioRunnerLike(Protocol):
    def inject(self, mc: MachineControl, sim_time: float) -> None: ...
    def observe(self, snap: BusSnapshot) -> None: ...


class ViewerLike(Protocol):
    def setup(self, modules: list[Subsystem]) -> None: ...
    def log(self, snap: BusSnapshot) -> None: ...


def build_default_modules() -> list[Subsystem]:
    """Construct the canonical Phase 0 module set (16 types, 17 instances)."""
    modules: list[Subsystem] = [
        DriveLaser(),
        SourceVessel(),
        Illuminator(),
        ReticleMasking(),
        ReticleStage(),
        ReticleHandler(),
        POB(),
        WaferStage("A"),
        WaferStage("B"),
        WaferHandler(),
        AlignmentSensor(),
        LevelSensor(),
        OnStageMetrology(),
        VacuumGas(),
        Thermal(),
        Frames(),
        MachineControl(),
    ]
    return modules


class Orchestrator:
    def __init__(
        self,
        modules: list[Subsystem] | None = None,
        dt: float = DEFAULT_DT_S,
        history_size: int = 100,
    ) -> None:
        self.modules: list[Subsystem] = modules if modules is not None else build_default_modules()
        self.dt = dt
        self._tick = 0
        self._latest = BusSnapshot.initial()
        self.history: deque[BusSnapshot] = deque(maxlen=history_size)
        self.history.append(self._latest)
        self.scenario: ScenarioRunnerLike | None = None
        self.viewer: ViewerLike | None = None
        for m in self.modules:
            m.reset(m.ParameterSchema())

    @property
    def latest(self) -> BusSnapshot:
        return self._latest

    @property
    def tick(self) -> int:
        return self._tick

    @property
    def sim_time(self) -> float:
        return self._tick * self.dt

    def machine_control(self) -> MachineControl:
        for m in self.modules:
            if isinstance(m, MachineControl):
                return m
        raise RuntimeError("MachineControl not present in module set")

    def attach_scenario(self, scenario: ScenarioRunnerLike) -> None:
        self.scenario = scenario

    def attach_viewer(self, viewer: ViewerLike) -> None:
        self.viewer = viewer
        viewer.setup(self.modules)

    def step_once(self) -> BusSnapshot:
        if self.scenario is not None:
            self.scenario.inject(self.machine_control(), self.sim_time)

        prev = self._latest
        new_outputs: dict[str, Outputs] = {}
        for m in self.modules:
            inputs = m.make_inputs(prev)
            new_outputs[m.name] = m.step(self.dt, inputs)

        self._tick += 1
        snap = BusSnapshot(
            tick=self._tick,
            sim_time=self.sim_time,
            **new_outputs,
        )
        self._latest = snap
        self.history.append(snap)

        if self.viewer is not None:
            self.viewer.log(snap)
        if self.scenario is not None:
            self.scenario.observe(snap)
        return snap

    def run(self, n_ticks: int) -> BusSnapshot:
        for _ in range(n_ticks):
            self.step_once()
        return self._latest

    def run_until_done(self, max_ticks: int) -> BusSnapshot:
        """Run until ``machine_control.lot_done`` or until ``max_ticks`` elapsed."""
        for _ in range(max_ticks):
            snap = self.step_once()
            if snap.machine_control.lot_done:
                return snap
        return self._latest

    def set_parameters(self, name: str, params: Parameters) -> None:
        for m in self.modules:
            if m.name == name:
                m.reset(params)
                return
        raise KeyError(f"no module named {name!r}")
