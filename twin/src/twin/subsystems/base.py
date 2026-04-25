"""Subsystem Protocol, schema base classes, and FMI metadata helpers.

Every subsystem in the twin defines three Pydantic v2 models:

* ``Inputs``     — what it consumes from the bus on a given tick.
* ``Outputs``    — what it publishes to the bus on a given tick.
* ``Parameters`` — fixed, set once via ``reset()``.

Field-level FMI metadata is attached via :func:`fmi_field`. A future
emitter can walk a model's ``model_fields`` and produce one
``modelDescription.xml`` per subsystem without hand-editing.
"""

from __future__ import annotations

from typing import Any, ClassVar, Literal, Protocol, runtime_checkable

from pydantic import BaseModel, ConfigDict, Field

# FMI 2.0 / 3.0 categories used by the metadata helper.
FMICausality = Literal["input", "output", "parameter", "calculatedParameter", "local"]
FMIVariability = Literal["constant", "fixed", "tunable", "discrete", "continuous"]
FMIType = Literal["Real", "Integer", "Boolean", "String", "Enumeration"]


def fmi_field(
    default: Any = ...,
    *,
    unit: str | None = None,
    causality: FMICausality = "output",
    variability: FMIVariability = "continuous",
    fmi_type: FMIType = "Real",
    description: str | None = None,
) -> Any:
    """Return a Pydantic ``Field`` decorated with FMI metadata.

    The metadata lives in ``json_schema_extra`` so that
    ``model.model_fields[name].json_schema_extra`` exposes it untouched
    for the FMU descriptor emitter.
    """
    extra: dict[str, Any] = {
        "fmi_causality": causality,
        "fmi_variability": variability,
        "fmi_type": fmi_type,
    }
    if unit is not None:
        extra["unit"] = unit
    return Field(default, description=description, json_schema_extra=extra)


class FMIBaseModel(BaseModel):
    """Base for all subsystem schemas: frozen Pydantic v2 model."""

    model_config = ConfigDict(frozen=True, extra="forbid")


class Inputs(FMIBaseModel):
    """Marker base class for a subsystem's per-tick inputs."""


class Outputs(FMIBaseModel):
    """Marker base class for a subsystem's per-tick outputs."""


class Parameters(FMIBaseModel):
    """Marker base class for a subsystem's static parameters."""


@runtime_checkable
class Subsystem(Protocol):
    """Protocol every subsystem implements.

    ``name`` is the bus instance name (e.g. ``"wafer_stage_a"``);
    ``InputSchema``, ``OutputSchema``, ``ParameterSchema`` are the
    Pydantic types used to validate I/O.

    Modules are responsible for building their per-tick ``Inputs`` from a
    :class:`twin.bus.BusSnapshot` via :meth:`make_inputs`. For
    single-instance modules this typically delegates to a class-level
    ``InputSchema.from_snapshot`` helper; instance-aware modules
    (e.g. :class:`twin.subsystems.wafer_stage.WaferStage`) dispatch on
    the instance label.
    """

    name: str
    InputSchema: ClassVar[type[Inputs]]
    OutputSchema: ClassVar[type[Outputs]]
    ParameterSchema: ClassVar[type[Parameters]]

    def reset(self, params: Parameters) -> Outputs: ...
    def make_inputs(self, snap: object) -> Inputs: ...
    def step(self, dt: float, inputs: Inputs) -> Outputs: ...
