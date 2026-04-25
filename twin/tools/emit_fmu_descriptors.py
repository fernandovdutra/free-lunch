"""Walk BusSnapshot.model_fields and print modelDescription.xml outlines per module.

This is the Phase 0 contract round-trip: prove the FMI metadata
attached to every Pydantic field round-trips to a structure an FMU
exporter could consume. The actual FMU build is Phase 1+.

Usage::

    python tools/emit_fmu_descriptors.py [--module wafer_stage]
"""

from __future__ import annotations

import argparse
import sys
from typing import Any

from pydantic import BaseModel

from twin.bus import BusSnapshot


def _outline_for(name: str, model_cls: type[BaseModel]) -> str:
    lines = [f'<fmiModelDescription modelName="{name}">', "  <ModelVariables>"]
    for fname, info in model_cls.model_fields.items():
        extra: dict[str, Any] = info.json_schema_extra or {}  # type: ignore[assignment]
        causality = extra.get("fmi_causality", "output")
        variability = extra.get("fmi_variability", "continuous")
        ftype = extra.get("fmi_type", "Real")
        unit = extra.get("unit", "")
        unit_attr = f' unit="{unit}"' if unit else ""
        lines.append(
            f'    <ScalarVariable name="{fname}" causality="{causality}" '
            f'variability="{variability}">'
        )
        lines.append(f"      <{ftype}{unit_attr}/>")
        lines.append("    </ScalarVariable>")
    lines.append("  </ModelVariables>")
    lines.append("</fmiModelDescription>")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--module",
        help="bus instance name (e.g. wafer_stage_a). Defaults to all modules.",
    )
    args = parser.parse_args(argv)

    targets: list[tuple[str, type[BaseModel]]] = []
    for fname, info in BusSnapshot.model_fields.items():
        if fname in {"tick", "sim_time"}:
            continue
        cls = info.annotation
        if cls is None or not isinstance(cls, type) or not issubclass(cls, BaseModel):
            continue
        if args.module and fname != args.module:
            continue
        targets.append((fname, cls))

    if args.module and not targets:
        print(f"unknown module {args.module!r}", file=sys.stderr)
        return 2

    for name, cls in targets:
        print(_outline_for(name, cls))
        print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
