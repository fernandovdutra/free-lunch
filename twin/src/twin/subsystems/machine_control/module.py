"""MachineControl module: lot-flow phase machine + setpoint publisher.

Phase 0 sequencer. Reads readiness flags, publishes setpoints for every
actuator. The scenario runner pushes high-level events via
:meth:`MachineControl.queue_event`; MC unrolls them into per-tick state.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, ClassVar

from twin.subsystems.base import Inputs, Outputs, Parameters
from twin.subsystems.machine_control.schema import (
    MachineControlInputs,
    MachineControlOutputs,
    MachineControlParameters,
)


@dataclass
class _Lot:
    wafer_ids: list[str] = field(default_factory=list)
    reticle_id: str = ""


class MachineControl:
    name = "machine_control"
    InputSchema: ClassVar[type[Inputs]] = MachineControlInputs
    OutputSchema: ClassVar[type[Outputs]] = MachineControlOutputs
    ParameterSchema: ClassVar[type[Parameters]] = MachineControlParameters

    def __init__(self) -> None:
        self._params = MachineControlParameters()
        self._phase = "idle"
        self._phase_elapsed_s = 0.0
        self._wafer_index = 0
        self._field_index = 0
        self._field_subphase = "step"
        self._field_subphase_elapsed_s = 0.0
        self._events: list[dict[str, Any]] = []
        self._lot = _Lot()

    def reset(self, params: Parameters) -> Outputs:
        assert isinstance(params, MachineControlParameters)
        self._params = params
        self._phase = "idle"
        self._phase_elapsed_s = 0.0
        self._wafer_index = 0
        self._field_index = 0
        self._field_subphase = "step"
        self._field_subphase_elapsed_s = 0.0
        self._events = []
        self._lot = _Lot()
        return MachineControlOutputs()

    def make_inputs(self, snap: object) -> Inputs:
        from twin.bus import BusSnapshot

        assert isinstance(snap, BusSnapshot)
        return MachineControlInputs.from_snapshot(snap)

    def queue_event(self, event: dict[str, Any]) -> None:
        """Scenario runner pushes high-level events here."""
        self._events.append(event)

    @property
    def phase(self) -> str:
        return self._phase

    def _current_wafer_id(self) -> str:
        if 0 <= self._wafer_index < len(self._lot.wafer_ids):
            return self._lot.wafer_ids[self._wafer_index]
        return ""

    def _current_stage(self) -> str:
        return "A" if self._wafer_index % 2 == 0 else "B"

    def _other_stage(self) -> str:
        return "B" if self._current_stage() == "A" else "A"

    def _enter(self, phase: str) -> None:
        self._phase = phase
        self._phase_elapsed_s = 0.0

    def step(self, dt: float, inputs: Inputs) -> Outputs:
        assert isinstance(inputs, MachineControlInputs)

        while self._events:
            event = self._events.pop(0)
            self._handle_event(event)

        self._phase_elapsed_s += dt
        self._advance(dt, inputs)
        return self._publish()

    def _handle_event(self, event: dict[str, Any]) -> None:
        kind = event.get("type")
        if kind == "start_lot":
            self._lot = _Lot(
                wafer_ids=list(event.get("wafer_ids", [])),
                reticle_id=str(event.get("reticle_id", "")),
            )
            self._wafer_index = 0
            self._enter("power_up")
        elif kind == "abort":
            self._enter("power_down")

    def _advance(self, dt: float, inp: MachineControlInputs) -> None:
        p = self._params
        phase = self._phase
        cur_stage = self._current_stage()

        # Pull stage-specific input bits for the active wafer.
        cur_clamped = inp.wafer_stage_a_clamped if cur_stage == "A" else inp.wafer_stage_b_clamped
        cur_wafer_id = (
            inp.wafer_stage_a_wafer_id if cur_stage == "A" else inp.wafer_stage_b_wafer_id
        )

        if phase == "idle":
            return
        if phase == "power_up":
            if inp.illuminator_ready and inp.vacuum_ok and inp.thermal_ok:
                self._enter("reticle_load")
            return
        if phase == "reticle_load":
            if (
                inp.reticle_stage_reticle_id == self._lot.reticle_id
                and not inp.reticle_handler_busy
                and inp.reticle_stage_clamped
            ):
                self._enter("wafer_load")
            return
        if phase == "wafer_load":
            if (
                cur_wafer_id == self._current_wafer_id()
                and not inp.wafer_handler_busy
                and cur_clamped
            ):
                self._enter("align")
            return
        if phase == "align":
            if inp.alignment_ready:
                self._enter("level")
            return
        if phase == "level":
            if inp.level_ready:
                self._enter("swap_to_expose")
            return
        if phase == "swap_to_expose":
            if self._phase_elapsed_s >= p.chuck_swap_duration_s:
                self._enter("expose")
                self._field_index = 0
                self._field_subphase = "step"
                self._field_subphase_elapsed_s = 0.0
            return
        if phase == "expose":
            self._field_subphase_elapsed_s += dt
            if self._field_subphase == "step":
                if self._field_subphase_elapsed_s >= p.field_step_duration_s:
                    self._field_subphase = "scan"
                    self._field_subphase_elapsed_s = 0.0
            else:  # scan
                if self._field_subphase_elapsed_s >= p.field_scan_duration_s:
                    self._field_index += 1
                    if self._field_index >= p.n_fields_per_wafer:
                        self._enter("swap_to_measure")
                    else:
                        self._field_subphase = "step"
                        self._field_subphase_elapsed_s = 0.0
            return
        if phase == "swap_to_measure":
            if self._phase_elapsed_s >= p.chuck_swap_duration_s:
                self._enter("wafer_unload")
            return
        if phase == "wafer_unload":
            if (not inp.wafer_handler_busy) and (cur_wafer_id == "") and inp.wafer_handler_held == "":
                self._wafer_index += 1
                if self._wafer_index >= len(self._lot.wafer_ids):
                    self._enter("reticle_unload")
                else:
                    self._enter("wafer_load")
            return
        if phase == "reticle_unload":
            if (
                not inp.reticle_handler_busy
                and not inp.reticle_stage_clamped
                and inp.reticle_stage_reticle_id == ""
            ):
                self._enter("power_down")
            return
        if phase == "power_down":
            if not inp.source_available and not inp.drive_laser_available:
                self._enter("done")
            return

    def _publish(self) -> MachineControlOutputs:
        p = self._params
        phase = self._phase
        cur_stage = self._current_stage()
        cur_wafer = self._current_wafer_id()

        # Defaults: everything off, stages parked at their home positions.
        out = dict(
            current_phase=phase,
            wafer_in_progress=cur_wafer if phase not in ("idle", "done") else "",
            field_index=self._field_index,
            lot_done=phase == "done",
            measure_side=cur_stage,
        )

        powered = phase not in ("idle", "power_down", "done")
        out.update(
            drive_laser_enable=powered,
            source_vessel_enable=powered,
            illuminator_enable=powered,
            illuminator_pupil_mode="annular",
            vacuum_gas_enable=powered,
            thermal_enable=powered,
        )

        # Reticle handler / stage defaults: parked, clamped if reticle on it.
        rh_action = "idle"
        rh_target = ""
        rs_clamp = phase in (
            "reticle_load",
            "wafer_load",
            "align",
            "level",
            "swap_to_expose",
            "expose",
            "swap_to_measure",
            "wafer_unload",
        )
        rs_setpoint_y = 0.0
        rs_scan_velocity = 0.0

        if phase == "reticle_load":
            rh_action = "fetch"
            rh_target = self._lot.reticle_id
        elif phase == "reticle_unload":
            rh_action = "return"
            rs_clamp = False

        out.update(
            reticle_handler_action=rh_action,
            reticle_handler_target_id=rh_target,
            reticle_stage_setpoint_x=0.0,
            reticle_stage_setpoint_y=rs_setpoint_y,
            reticle_stage_setpoint_z=0.0,
            reticle_stage_setpoint_rx=0.0,
            reticle_stage_setpoint_ry=0.0,
            reticle_stage_setpoint_rz=0.0,
            reticle_stage_scan_velocity=rs_scan_velocity,
            reticle_stage_clamp_cmd=rs_clamp,
        )

        # Wafer handler defaults.
        wh_action = "idle"
        wh_wafer = ""
        wh_target = ""
        if phase == "wafer_load":
            wh_action = "load"
            wh_wafer = cur_wafer
            wh_target = cur_stage
        elif phase == "wafer_unload":
            wh_action = "unload"
            wh_wafer = cur_wafer
            wh_target = cur_stage
        out.update(
            wafer_handler_action=wh_action,
            wafer_handler_target_wafer_id=wh_wafer,
            wafer_handler_target_stage=wh_target,
        )

        # Wafer stage setpoints. (scan_y_amp is unused at this layer; kept in the
        # tuple for symmetry with future use during lens-heating compensation.)
        cur_x, other_x, cur_y, scan_vel, _scan_y_amp = self._stage_positions(cur_stage)
        cur_clamp = phase in (
            "wafer_load",
            "align",
            "level",
            "swap_to_expose",
            "expose",
            "swap_to_measure",
        )
        out.update(self._stage_setpoints("A", cur_stage, cur_x, other_x, cur_y, cur_clamp))
        out.update(self._stage_setpoints("B", cur_stage, cur_x, other_x, cur_y, cur_clamp))

        # Reticle scans 4x faster, opposite direction during expose-scan.
        if phase == "expose" and self._field_subphase == "scan":
            reticle_y = -cur_y * p.reticle_scan_reduction
            out["reticle_stage_setpoint_y"] = reticle_y
            out["reticle_stage_scan_velocity"] = -scan_vel * p.reticle_scan_reduction

        # Sensors.
        out.update(
            alignment_sensor_trigger=phase == "align",
            level_sensor_trigger=phase == "level",
            on_stage_metro_trigger="dose" if phase == "expose" else "none",
        )

        return MachineControlOutputs(**out)

    def _stage_positions(
        self, cur_stage: str
    ) -> tuple[float, float, float, float, float]:
        """Return (cur_x, other_x, cur_y, scan_vel, scan_amp) for current phase."""
        p = self._params
        phase = self._phase
        measure_x = p.measure_x_m
        expose_x = p.expose_x_m

        if phase in ("wafer_load", "align", "level", "wafer_unload"):
            return measure_x, expose_x, 0.0, 0.0, 0.0
        if phase == "swap_to_expose":
            ratio = min(self._phase_elapsed_s / p.chuck_swap_duration_s, 1.0)
            cur_x = measure_x + (expose_x - measure_x) * ratio
            other_x = expose_x + (measure_x - expose_x) * ratio
            return cur_x, other_x, 0.0, 0.0, 0.0
        if phase == "swap_to_measure":
            ratio = min(self._phase_elapsed_s / p.chuck_swap_duration_s, 1.0)
            cur_x = expose_x + (measure_x - expose_x) * ratio
            other_x = measure_x + (expose_x - measure_x) * ratio
            return cur_x, other_x, 0.0, 0.0, 0.0
        if phase == "expose":
            cur_x, cur_y, scan_vel = self._expose_kinematics()
            return cur_x, measure_x, cur_y, scan_vel, p.field_pitch_m / 2.0
        return measure_x, expose_x, 0.0, 0.0, 0.0

    def _expose_kinematics(self) -> tuple[float, float, float]:
        p = self._params
        # Field grid: 1D row across X in expose region, centered on expose_x.
        n = max(p.n_fields_per_wafer, 1)
        offset = (self._field_index - (n - 1) / 2.0) * p.field_pitch_m
        cur_x = p.expose_x_m + offset

        if self._field_subphase == "step":
            # Settle at this field's column; no Y scan.
            return cur_x, 0.0, 0.0

        # scan subphase: linear traversal in Y at scan_velocity.
        amp = p.field_pitch_m / 2.0
        ratio = min(self._field_subphase_elapsed_s / p.field_scan_duration_s, 1.0)
        cur_y = -amp + 2.0 * amp * ratio
        return cur_x, cur_y, p.scan_velocity_m_s

    def _stage_setpoints(
        self,
        target_instance: str,
        cur_stage: str,
        cur_x: float,
        other_x: float,
        cur_y: float,
        cur_clamp: bool,
    ) -> dict[str, Any]:
        is_active = target_instance == cur_stage
        x = cur_x if is_active else other_x
        y = cur_y if is_active else 0.0
        clamp = cur_clamp if is_active else False
        mode = self._stage_mode_for(is_active)
        prefix = f"wafer_stage_{target_instance.lower()}_"
        return {
            prefix + "setpoint_x": x,
            prefix + "setpoint_y": y,
            prefix + "setpoint_z": 0.0,
            prefix + "setpoint_rx": 0.0,
            prefix + "setpoint_ry": 0.0,
            prefix + "setpoint_rz": 0.0,
            prefix + "clamp_cmd": clamp,
            prefix + "mode_cmd": mode,
        }

    def _stage_mode_for(self, is_active: bool) -> str:
        if not is_active:
            return "parked"
        return {
            "wafer_load": "load",
            "align": "measure",
            "level": "measure",
            "swap_to_expose": "swap",
            "expose": "expose",
            "swap_to_measure": "swap",
            "wafer_unload": "unload",
        }.get(self._phase, "idle")

