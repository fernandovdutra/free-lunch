"""BusSnapshot: the single per-tick frozen state object every module reads from.

The bus uses a Jacobi-style snapshot: each tick, every module reads the
*previous* snapshot and writes its outputs for the *current* tick. The
orchestrator builds the next snapshot from those outputs.

Snapshots are immutable Pydantic models so accidental mutation is a bug.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from twin.subsystems.alignment_sensor.schema import AlignmentSensorOutputs
from twin.subsystems.drive_laser.schema import DriveLaserOutputs
from twin.subsystems.frames.schema import FramesOutputs
from twin.subsystems.illuminator.schema import IlluminatorOutputs
from twin.subsystems.level_sensor.schema import LevelSensorOutputs
from twin.subsystems.machine_control.schema import MachineControlOutputs
from twin.subsystems.on_stage_metro.schema import OnStageMetrologyOutputs
from twin.subsystems.pob.schema import POBOutputs
from twin.subsystems.reticle_handler.schema import ReticleHandlerOutputs
from twin.subsystems.reticle_masking.schema import ReticleMaskingOutputs
from twin.subsystems.reticle_stage.schema import ReticleStageOutputs
from twin.subsystems.source_vessel.schema import SourceVesselOutputs
from twin.subsystems.thermal.schema import ThermalOutputs
from twin.subsystems.vacuum_gas.schema import VacuumGasOutputs
from twin.subsystems.wafer_handler.schema import WaferHandlerOutputs
from twin.subsystems.wafer_stage.schema import WaferStageOutputs


class BusSnapshot(BaseModel):
    """One tick of every subsystem's published outputs."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    tick: int
    sim_time: float

    drive_laser: DriveLaserOutputs
    source_vessel: SourceVesselOutputs
    illuminator: IlluminatorOutputs
    reticle_masking: ReticleMaskingOutputs
    reticle_stage: ReticleStageOutputs
    reticle_handler: ReticleHandlerOutputs
    pob: POBOutputs
    wafer_stage_a: WaferStageOutputs
    wafer_stage_b: WaferStageOutputs
    wafer_handler: WaferHandlerOutputs
    alignment_sensor: AlignmentSensorOutputs
    level_sensor: LevelSensorOutputs
    on_stage_metro: OnStageMetrologyOutputs
    vacuum_gas: VacuumGasOutputs
    thermal: ThermalOutputs
    frames: FramesOutputs
    machine_control: MachineControlOutputs

    @classmethod
    def initial(cls) -> BusSnapshot:
        """Tick-0 snapshot with every module's default outputs."""
        return cls(
            tick=0,
            sim_time=0.0,
            drive_laser=DriveLaserOutputs(),
            source_vessel=SourceVesselOutputs(),
            illuminator=IlluminatorOutputs(),
            reticle_masking=ReticleMaskingOutputs(),
            reticle_stage=ReticleStageOutputs(),
            reticle_handler=ReticleHandlerOutputs(),
            pob=POBOutputs(),
            wafer_stage_a=WaferStageOutputs(),
            wafer_stage_b=WaferStageOutputs(),
            wafer_handler=WaferHandlerOutputs(),
            alignment_sensor=AlignmentSensorOutputs(),
            level_sensor=LevelSensorOutputs(),
            on_stage_metro=OnStageMetrologyOutputs(),
            vacuum_gas=VacuumGasOutputs(),
            thermal=ThermalOutputs(),
            frames=FramesOutputs(),
            machine_control=MachineControlOutputs(),
        )
