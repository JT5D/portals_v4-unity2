#!/usr/bin/env python3
"""
Quick scene audit to catch missing scripts (GUIDs without matching .meta) before building.

Scans Unity .unity scenes for MonoBehaviour script references and checks whether those GUIDs
exist anywhere under the project or Library/PackageCache. Exits non‑zero on missing GUIDs.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from typing import Dict, Iterable, Set


SCRIPT_GUID_RE = re.compile(r"m_Script: \\{fileID: 11500000, guid: ([0-9a-f]{32}), type: 3\\}")


def collect_guids_from_meta(paths: Iterable[Path]) -> Dict[str, Path]:
    guid_map: Dict[str, Path] = {}
    for meta in paths:
        try:
            text = meta.read_text(errors="ignore")
        except OSError:
            continue
        match = re.search(r"^guid:\\s*([0-9a-f]{32})", text, re.MULTILINE)
        if match:
            guid_map[match.group(1)] = meta
    return guid_map


def collect_scene_guids(scene: Path) -> Set[str]:
    guids: Set[str] = set()
    try:
        text = scene.read_text(errors="ignore")
    except OSError:
        return guids
    for match in SCRIPT_GUID_RE.finditer(text):
        guids.add(match.group(1))
    return guids


def find_missing_guids(project_root: Path, scenes_root: Path) -> Set[str]:
    meta_paths = list(project_root.rglob("*.meta"))
    guid_map = collect_guids_from_meta(meta_paths)

    scene_files = list(scenes_root.rglob("*.unity"))
    scene_guids: Set[str] = set()
    for scene in scene_files:
        scene_guids.update(collect_scene_guids(scene))

    return {guid for guid in scene_guids if guid not in guid_map}


def main() -> int:
    parser = argparse.ArgumentParser(description="Check Unity scenes for missing script GUIDs.")
    parser.add_argument("--project", default="unity", help="Path to Unity project root.")
    parser.add_argument(
        "--scenes", default="unity/Assets/Scenes", help="Path to scenes root to scan."
    )
    args = parser.parse_args()

    project_root = Path(args.project).resolve()
    scenes_root = Path(args.scenes).resolve()

    missing = find_missing_guids(project_root, scenes_root)
    if missing:
        sys.stderr.write("Missing script GUIDs detected in scenes:\\n")
        for guid in sorted(missing):
            sys.stderr.write(f"  {guid}\\n")
        return 1

    print("No missing script GUIDs found.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
