"""One step()-level test per subsystem type. Covers the basic Phase 0 behaviour."""

from __future__ import annotations

from twin.bus import BusSnapshot
from twin.subsystems.alignment_sensor.module import AlignmentSensor
from twin.subsystems.alignment_sensor.schema import AlignmentSensorInputs
from twin.subsystems.drive_laser.module import DriveLaser
from twin.subsystems.drive_laser.schema import DriveLaserInputs, DriveLaserParameters
from twin.subsystems.frames.module import Frames
from twin.subsystems.illuminator.module import Illuminator
from twin.subsystems.illuminator.schema import IlluminatorInputs
from twin.subsystems.level_sensor.module import LevelSensor
from twin.subsystems.level_sensor.schema import LevelSensorInputs
from twin.subsystems.on_stage_metro.module import OnStageMetrology
from twin.subsystems.on_stage_metro.schema import OnStageMetrologyInputs
from twin.subsystems.pob.module import POB
from twin.subsystems.reticle_handler.module import ReticleHandler
from twin.subsystems.reticle_handler.schema import (
    ReticleHandlerInputs,
    ReticleHandlerParameters,
)
from twin.subsystems.reticle_masking.module import ReticleMasking
from twin.subsystems.reticle_masking.schema import ReticleMaskingInputs
from twin.subsystems.reticle_stage.module import ReticleStage
from twin.subsystems.reticle_stage.schema import ReticleStageInputs
from twin.subsystems.source_vessel.module import SourceVessel
from twin.subsystems.source_vessel.schema import (
    SourceVesselInputs,
    SourceVesselParameters,
)
from twin.subsystems.thermal.module import Thermal
from twin.subsystems.vacuum_gas.module import VacuumGas
from twin.subsystems.vacuum_gas.schema import VacuumGasInputs, VacuumGasParameters
from twin.subsystems.wafer_handler.module import WaferHandler
from twin.subsystems.wafer_handler.schema import (
    WaferHandlerInputs,
    WaferHandlerParameters,
)
from twin.subsystems.wafer_stage.module import WaferStage
from twin.subsystems.wafer_stage.schema import WaferStageInputs

DT = 0.01


def test_drive_laser_warmup() -> None:
    m = DriveLaser()
    m.reset(DriveLaserParameters(warmup_s=0.05))
    out = m.step(DT, DriveLaserInputs(enable=False))
    assert not out.available
    for _ in range(10):
        out = m.step(DT, DriveLaserInputs(enable=True))
    assert out.available
    assert out.locked_to_droplet


def test_source_vessel_needs_drive_laser_lock() -> None:
    m = SourceVessel()
    m.reset(SourceVesselParameters(warmup_s=0.05))
    # No lock => still idle.
    out = m.step(DT, SourceVesselInputs(enable=True, drive_locked_to_droplet=False))
    assert not out.available
    # With lock and enough time => available with full power.
    for _ in range(20):
        out = m.step(
            DT, SourceVesselInputs(enable=True, drive_pulse_energy_mJ=500.0, drive_locked_to_droplet=True)
        )
    assert out.available
    assert out.power_at_if_W > 0


def test_illuminator_pass_through() -> None:
    m = Illuminator()
    m.reset(m.ParameterSchema())
    out = m.step(
        DT, IlluminatorInputs(enable=True, pupil_mode_cmd="dipole_x", source_available=True)
    )
    assert out.ready
    assert out.pupil_mode == "dipole_x"


def test_reticle_masking_blade_passthrough() -> None:
    m = ReticleMasking()
    m.reset(m.ParameterSchema())
    out = m.step(
        DT,
        ReticleMaskingInputs(
            blade_x_minus_set=-0.04,
            blade_x_plus_set=0.04,
            blade_y_minus_set=-0.06,
            blade_y_plus_set=0.06,
            reticle_y=0.001,
            reticle_scan_velocity=0.7,
        ),
    )
    assert out.blade_x_plus == 0.04
    assert out.synced_to_reticle


def test_reticle_stage_clamps_then_latches_id() -> None:
    m = ReticleStage()
    m.reset(m.ParameterSchema())
    # Hand off a reticle and clamp.
    out = m.step(DT, ReticleStageInputs(clamp_cmd=True, handoff_reticle_id="R001"))
    assert out.reticle_id == "R001"
    assert out.clamped
    # Release: id clears.
    out = m.step(DT, ReticleStageInputs(clamp_cmd=False, handoff_reticle_id=""))
    assert out.reticle_id == ""


def test_reticle_handler_fetch_phase() -> None:
    m = ReticleHandler()
    m.reset(ReticleHandlerParameters(fetch_duration_s=0.03))
    for _ in range(10):
        out = m.step(
            DT, ReticleHandlerInputs(action="fetch", target_reticle_id="R001")
        )
    assert out.handoff_reticle_id == "R001"


def test_pob_constant_outputs() -> None:
    m = POB()
    m.reset(m.ParameterSchema())
    out = m.step(DT, m.InputSchema())
    assert out.available
    assert out.aberration_state == "nominal"


def test_wafer_stage_pose_follows_setpoint_with_handoff() -> None:
    m = WaferStage("A")
    m.reset(m.ParameterSchema())
    out = m.step(
        DT,
        WaferStageInputs(
            setpoint_x=-0.5,
            clamp_cmd=True,
            handoff_target="A",
            handoff_wafer_id="W001",
            mode_cmd="measure",
        ),
    )
    assert out.pos_x == -0.5
    assert out.wafer_id == "W001"
    assert out.stage_mode == "measure"
    # Stage B should reject a handoff targeted at A.
    other = WaferStage("B")
    other.reset(other.ParameterSchema())
    out_b = other.step(
        DT,
        WaferStageInputs(
            handoff_target="A",
            handoff_wafer_id="W001",
            clamp_cmd=False,
        ),
    )
    assert out_b.wafer_id == ""


def test_wafer_handler_load_cycle() -> None:
    m = WaferHandler()
    m.reset(WaferHandlerParameters(load_duration_s=0.05))
    seen_handoff = False
    for _ in range(10):
        out = m.step(
            DT,
            WaferHandlerInputs(
                action="load",
                target_wafer_id="W001",
                target_stage="A",
                stage_a_clamped=False,
            ),
        )
        if out.handoff_wafer_id == "W001":
            seen_handoff = True
            assert out.handoff_target == "A"
    assert seen_handoff


def test_alignment_sensor_completes_after_duration() -> None:
    m = AlignmentSensor()
    m.reset(m.ParameterSchema())
    for _ in range(200):
        out = m.step(
            DT,
            AlignmentSensorInputs(trigger=True, measure_stage="A", stage_a_wafer_id="W001"),
        )
    assert out.ready
    assert out.wafer_id_seen == "W001"


def test_level_sensor_emits_z_map_token() -> None:
    m = LevelSensor()
    m.reset(m.ParameterSchema())
    for _ in range(150):
        out = m.step(
            DT,
            LevelSensorInputs(trigger=True, measure_stage="B", stage_b_wafer_id="W002"),
        )
    assert out.ready
    assert out.z_map_token == "zmap:W002"


def test_on_stage_metro_dispatches_on_trigger() -> None:
    m = OnStageMetrology()
    m.reset(m.ParameterSchema())
    out = m.step(DT, OnStageMetrologyInputs(trigger="dose"))
    assert out.dose_value > 0


def test_vacuum_gas_pumpdown_reaches_ok() -> None:
    m = VacuumGas()
    m.reset(VacuumGasParameters(pumpdown_s=0.05))
    for _ in range(20):
        out = m.step(DT, VacuumGasInputs(enable=True))
    assert out.ok
    assert out.dgl_active
    assert out.dgl_m_present


def test_thermal_ok_when_enabled() -> None:
    from twin.subsystems.thermal.schema import ThermalInputs

    m = Thermal()
    m.reset(m.ParameterSchema())
    out = m.step(DT, ThermalInputs(enable=True))
    assert out.optic_temp_ok


def test_frames_emits_avis_ok() -> None:
    from twin.subsystems.frames.schema import FramesInputs

    m = Frames()
    m.reset(m.ParameterSchema())
    out = m.step(DT, FramesInputs())
    assert out.avis_ok


def test_make_inputs_resolves_full_snapshot() -> None:
    """Each module's make_inputs accepts a frozen BusSnapshot (no field_x typos)."""
    from twin.orchestrator import build_default_modules

    snap = BusSnapshot.initial()
    for m in build_default_modules():
        inputs = m.make_inputs(snap)
        assert isinstance(inputs, m.InputSchema)
