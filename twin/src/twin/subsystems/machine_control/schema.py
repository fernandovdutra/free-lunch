"""MachineControl schema. Supervisor: scenario-driven sequencer + setpoint publisher.

Phase 0 MC reads readiness flags from every actuator/sensor and publishes
setpoints to all of them. The scenario runner injects high-level events
(``start_lot`` etc.) via :meth:`MachineControl.queue_event`; MC unrolls them
into per-tick setpoints.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from twin.subsystems.base import Inputs, Outputs, Parameters, fmi_field

if TYPE_CHECKING:
    from twin.bus import BusSnapshot


class MachineControlInputs(Inputs):
    drive_laser_available: bool = fmi_field(False, causality="input", variability="discrete", fmi_type="Boolean")
    source_available: bool = fmi_field(False, causality="input", variability="discrete", fmi_type="Boolean")
    illuminator_ready: bool = fmi_field(False, causality="input", variability="discrete", fmi_type="Boolean")
    vacuum_ok: bool = fmi_field(False, causality="input", variability="discrete", fmi_type="Boolean")
    thermal_ok: bool = fmi_field(False, causality="input", variability="discrete", fmi_type="Boolean")
    reticle_handler_busy: bool = fmi_field(False, causality="input", variability="discrete", fmi_type="Boolean")
    reticle_stage_clamped: bool = fmi_field(False, causality="input", variability="discrete", fmi_type="Boolean")
    reticle_stage_reticle_id: str = fmi_field("", causality="input", variability="discrete", fmi_type="String")
    wafer_handler_busy: bool = fmi_field(False, causality="input", variability="discrete", fmi_type="Boolean")
    wafer_handler_held: str = fmi_field("", causality="input", variability="discrete", fmi_type="String")
    wafer_stage_a_clamped: bool = fmi_field(False, causality="input", variability="discrete", fmi_type="Boolean")
    wafer_stage_a_wafer_id: str = fmi_field("", causality="input", variability="discrete", fmi_type="String")
    wafer_stage_a_pos_x: float = fmi_field(0.0, unit="m", causality="input")
    wafer_stage_b_clamped: bool = fmi_field(False, causality="input", variability="discrete", fmi_type="Boolean")
    wafer_stage_b_wafer_id: str = fmi_field("", causality="input", variability="discrete", fmi_type="String")
    wafer_stage_b_pos_x: float = fmi_field(0.0, unit="m", causality="input")
    alignment_ready: bool = fmi_field(False, causality="input", variability="discrete", fmi_type="Boolean")
    level_ready: bool = fmi_field(False, causality="input", variability="discrete", fmi_type="Boolean")

    @classmethod
    def from_snapshot(cls, snap: BusSnapshot) -> MachineControlInputs:
        return cls(
            drive_laser_available=snap.drive_laser.available,
            source_available=snap.source_vessel.available,
            illuminator_ready=snap.illuminator.ready,
            vacuum_ok=snap.vacuum_gas.ok,
            thermal_ok=snap.thermal.optic_temp_ok,
            reticle_handler_busy=snap.reticle_handler.busy,
            reticle_stage_clamped=snap.reticle_stage.clamped,
            reticle_stage_reticle_id=snap.reticle_stage.reticle_id,
            wafer_handler_busy=snap.wafer_handler.busy,
            wafer_handler_held=snap.wafer_handler.held_wafer_id,
            wafer_stage_a_clamped=snap.wafer_stage_a.clamped,
            wafer_stage_a_wafer_id=snap.wafer_stage_a.wafer_id,
            wafer_stage_a_pos_x=snap.wafer_stage_a.pos_x,
            wafer_stage_b_clamped=snap.wafer_stage_b.clamped,
            wafer_stage_b_wafer_id=snap.wafer_stage_b.wafer_id,
            wafer_stage_b_pos_x=snap.wafer_stage_b.pos_x,
            alignment_ready=snap.alignment_sensor.ready,
            level_ready=snap.level_sensor.ready,
        )


class MachineControlOutputs(Outputs):
    # Recipe state
    current_phase: str = fmi_field("idle", variability="discrete", fmi_type="String")
    wafer_in_progress: str = fmi_field("", variability="discrete", fmi_type="String")
    field_index: int = fmi_field(0, variability="discrete", fmi_type="Integer", unit="1")
    lot_done: bool = fmi_field(False, variability="discrete", fmi_type="Boolean")

    # Subsystem enables
    drive_laser_enable: bool = fmi_field(False, variability="discrete", fmi_type="Boolean")
    source_vessel_enable: bool = fmi_field(False, variability="discrete", fmi_type="Boolean")
    illuminator_enable: bool = fmi_field(False, variability="discrete", fmi_type="Boolean")
    illuminator_pupil_mode: str = fmi_field("annular", variability="discrete", fmi_type="String")
    vacuum_gas_enable: bool = fmi_field(False, variability="discrete", fmi_type="Boolean")
    thermal_enable: bool = fmi_field(False, variability="discrete", fmi_type="Boolean")

    # Reticle handler / stage
    reticle_handler_action: str = fmi_field("idle", variability="discrete", fmi_type="String")
    reticle_handler_target_id: str = fmi_field("", variability="discrete", fmi_type="String")
    reticle_stage_setpoint_x: float = fmi_field(0.0, unit="m")
    reticle_stage_setpoint_y: float = fmi_field(0.0, unit="m")
    reticle_stage_setpoint_z: float = fmi_field(0.0, unit="m")
    reticle_stage_setpoint_rx: float = fmi_field(0.0, unit="rad")
    reticle_stage_setpoint_ry: float = fmi_field(0.0, unit="rad")
    reticle_stage_setpoint_rz: float = fmi_field(0.0, unit="rad")
    reticle_stage_scan_velocity: float = fmi_field(0.0, unit="m/s")
    reticle_stage_clamp_cmd: bool = fmi_field(False, variability="discrete", fmi_type="Boolean")

    # REMA
    rema_blade_x_minus: float = fmi_field(-0.05, unit="m")
    rema_blade_x_plus: float = fmi_field(0.05, unit="m")
    rema_blade_y_minus: float = fmi_field(-0.05, unit="m")
    rema_blade_y_plus: float = fmi_field(0.05, unit="m")

    # Wafer handler
    wafer_handler_action: str = fmi_field("idle", variability="discrete", fmi_type="String")
    wafer_handler_target_wafer_id: str = fmi_field("", variability="discrete", fmi_type="String")
    wafer_handler_target_stage: str = fmi_field("", variability="discrete", fmi_type="String")

    # Wafer stage A
    wafer_stage_a_setpoint_x: float = fmi_field(0.0, unit="m")
    wafer_stage_a_setpoint_y: float = fmi_field(0.0, unit="m")
    wafer_stage_a_setpoint_z: float = fmi_field(0.0, unit="m")
    wafer_stage_a_setpoint_rx: float = fmi_field(0.0, unit="rad")
    wafer_stage_a_setpoint_ry: float = fmi_field(0.0, unit="rad")
    wafer_stage_a_setpoint_rz: float = fmi_field(0.0, unit="rad")
    wafer_stage_a_clamp_cmd: bool = fmi_field(False, variability="discrete", fmi_type="Boolean")
    wafer_stage_a_mode_cmd: str = fmi_field("idle", variability="discrete", fmi_type="String")

    # Wafer stage B
    wafer_stage_b_setpoint_x: float = fmi_field(0.0, unit="m")
    wafer_stage_b_setpoint_y: float = fmi_field(0.0, unit="m")
    wafer_stage_b_setpoint_z: float = fmi_field(0.0, unit="m")
    wafer_stage_b_setpoint_rx: float = fmi_field(0.0, unit="rad")
    wafer_stage_b_setpoint_ry: float = fmi_field(0.0, unit="rad")
    wafer_stage_b_setpoint_rz: float = fmi_field(0.0, unit="rad")
    wafer_stage_b_clamp_cmd: bool = fmi_field(False, variability="discrete", fmi_type="Boolean")
    wafer_stage_b_mode_cmd: str = fmi_field("idle", variability="discrete", fmi_type="String")

    # Sensors
    measure_side: str = fmi_field("A", variability="discrete", fmi_type="String")
    alignment_sensor_trigger: bool = fmi_field(False, variability="discrete", fmi_type="Boolean")
    level_sensor_trigger: bool = fmi_field(False, variability="discrete", fmi_type="Boolean")
    on_stage_metro_trigger: str = fmi_field("none", variability="discrete", fmi_type="String")


class MachineControlParameters(Parameters):
    n_fields_per_wafer: int = fmi_field(
        4, causality="parameter", variability="fixed", fmi_type="Integer", unit="1"
    )
    field_step_duration_s: float = fmi_field(
        0.20, unit="s", causality="parameter", variability="fixed"
    )
    field_scan_duration_s: float = fmi_field(
        0.30, unit="s", causality="parameter", variability="fixed"
    )
    chuck_swap_duration_s: float = fmi_field(
        1.0, unit="s", causality="parameter", variability="fixed"
    )
    measure_x_m: float = fmi_field(
        -0.5, unit="m", causality="parameter", variability="fixed"
    )
    expose_x_m: float = fmi_field(
        0.5, unit="m", causality="parameter", variability="fixed"
    )
    field_pitch_m: float = fmi_field(
        0.026, unit="m", causality="parameter", variability="fixed"
    )
    scan_velocity_m_s: float = fmi_field(
        0.7, unit="m/s", causality="parameter", variability="fixed"
    )
    reticle_scan_reduction: float = fmi_field(
        4.0, causality="parameter", variability="fixed", unit="1"
    )
