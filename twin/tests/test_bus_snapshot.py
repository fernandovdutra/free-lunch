"""BusSnapshot is immutable and namespaces both wafer-stage instances."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from twin.bus import BusSnapshot
from twin.subsystems.wafer_stage.schema import WaferStageOutputs


def test_initial_snapshot_has_all_modules() -> None:
    snap = BusSnapshot.initial()
    assert snap.tick == 0
    # Every module field defaults are present.
    assert snap.drive_laser.available is False
    assert snap.wafer_stage_a.wafer_id == ""
    assert snap.wafer_stage_b.wafer_id == ""
    assert snap.machine_control.current_phase == "idle"


def test_snapshot_is_frozen() -> None:
    snap = BusSnapshot.initial()
    with pytest.raises(ValidationError):
        snap.tick = 5  # type: ignore[misc]


def test_wafer_stage_instances_namespaced_independently() -> None:
    snap = BusSnapshot.initial().model_copy(
        update={
            "wafer_stage_a": WaferStageOutputs(pos_x=-0.5, wafer_id="W001", clamped=True),
            "wafer_stage_b": WaferStageOutputs(pos_x=0.5, wafer_id="W002", clamped=True),
        }
    )
    assert snap.wafer_stage_a.pos_x == -0.5
    assert snap.wafer_stage_b.pos_x == 0.5
    assert snap.wafer_stage_a.wafer_id != snap.wafer_stage_b.wafer_id
