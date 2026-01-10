#!/usr/bin/env python3
"""
Fix ARKit library linking in Unity iOS export.

Unity 6000.2.14f1 exports libUnityARKit.a and libUnityARKitFaceTracking.a to
Libraries/ but doesn't add them to the Xcode project's link phase.

This script patches the project.pbxproj to add the missing library references.
"""

import re
import sys
import uuid
from pathlib import Path

def generate_pbx_id():
    """Generate a unique 24-character hex ID for PBX entries."""
    return uuid.uuid4().hex[:24].upper()

def add_arkit_libraries(pbxproj_path: Path) -> bool:
    """Add libUnityARKit.a and libUnityARKitFaceTracking.a to the Xcode project."""

    content = pbxproj_path.read_text()

    # Check if already patched
    if "libUnityARKit.a" in content:
        print("[INFO] ARKit libraries already in project")
        return True

    # Libraries to add
    libraries = [
        ("libUnityARKit.a", "Libraries/libUnityARKit.a"),
        ("libUnityARKitFaceTracking.a", "Libraries/libUnityARKitFaceTracking.a"),
    ]

    # Generate IDs for each library
    lib_ids = {}
    for lib_name, lib_path in libraries:
        lib_ids[lib_name] = {
            "file_ref": generate_pbx_id(),
            "build_file": generate_pbx_id(),
        }

    # 1. Add PBXFileReference entries (after existing .a references)
    file_ref_entries = []
    for lib_name, lib_path in libraries:
        ids = lib_ids[lib_name]
        file_ref_entries.append(
            f'\t\t{ids["file_ref"]} /* {lib_name} */ = '
            f'{{isa = PBXFileReference; lastKnownFileType = archive.ar; name = "{lib_name}"; '
            f'path = "{lib_path}"; sourceTree = SOURCE_ROOT; }};'
        )

    # Find a good insertion point after existing .a file references
    pattern = r'(\t\tDAB61E49F0B27D71CDA3B02F /\* lib_burst_generated\.a \*/ = \{isa = PBXFileReference;[^}]+\};)'
    match = re.search(pattern, content)
    if match:
        insert_point = match.end()
        content = content[:insert_point] + "\n" + "\n".join(file_ref_entries) + content[insert_point:]
    else:
        print("[ERROR] Could not find PBXFileReference insertion point")
        return False

    # 2. Add PBXBuildFile entries (link in Frameworks)
    build_file_entries = []
    for lib_name, _ in libraries:
        ids = lib_ids[lib_name]
        build_file_entries.append(
            f'\t\t{ids["build_file"]} /* {lib_name} in Frameworks */ = '
            f'{{isa = PBXBuildFile; fileRef = {ids["file_ref"]} /* {lib_name} */; }};'
        )

    # Insert after existing build file entries
    pattern = r'(\t\t63ACF7178776C648B96974EB /\* baselib\.a in Frameworks \*/ = \{isa = PBXBuildFile;[^}]+\};)'
    match = re.search(pattern, content)
    if match:
        insert_point = match.end()
        content = content[:insert_point] + "\n" + "\n".join(build_file_entries) + content[insert_point:]
    else:
        print("[ERROR] Could not find PBXBuildFile insertion point")
        return False

    # 3. Add to UnityFramework's Frameworks build phase
    # Find the UnityFramework frameworks section and add our libraries
    framework_entries = []
    for lib_name, _ in libraries:
        ids = lib_ids[lib_name]
        framework_entries.append(f'\t\t\t\t{ids["build_file"]} /* {lib_name} in Frameworks */,')

    # Insert after baselib.a in the frameworks list
    pattern = r'(\t\t\t\t63ACF7178776C648B96974EB /\* baselib\.a in Frameworks \*/,)'
    match = re.search(pattern, content)
    if match:
        insert_point = match.end()
        content = content[:insert_point] + "\n" + "\n".join(framework_entries) + content[insert_point:]
    else:
        print("[ERROR] Could not find Frameworks build phase insertion point")
        return False

    # 4. Add to Libraries group in PBXGroup
    group_entries = []
    for lib_name, _ in libraries:
        ids = lib_ids[lib_name]
        group_entries.append(f'\t\t\t\t{ids["file_ref"]} /* {lib_name} */,')

    # Find Libraries group and add references
    pattern = r'(\t\t\t\tDAB61E49F0B27D71CDA3B02F /\* lib_burst_generated\.a \*/,)'
    match = re.search(pattern, content)
    if match:
        insert_point = match.end()
        content = content[:insert_point] + "\n" + "\n".join(group_entries) + content[insert_point:]
    else:
        # Try alternative pattern
        pattern = r'(\t\t\t\tD8A1C72A0E8063A1000160D3 /\* libiPhone-lib\.a \*/,)'
        match = re.search(pattern, content)
        if match:
            insert_point = match.end()
            content = content[:insert_point] + "\n" + "\n".join(group_entries) + content[insert_point:]
        else:
            print("[WARN] Could not find Libraries group - libraries may not appear in project navigator")

    # Write back
    pbxproj_path.write_text(content)
    print(f"[SUCCESS] Added ARKit libraries to {pbxproj_path}")
    for lib_name, _ in libraries:
        print(f"  - {lib_name}")

    return True

def main():
    if len(sys.argv) > 1:
        pbxproj_path = Path(sys.argv[1])
    else:
        # Default path
        pbxproj_path = Path("/tmp/unity-ios-export/Unity-iPhone.xcodeproj/project.pbxproj")

    if not pbxproj_path.exists():
        print(f"[ERROR] project.pbxproj not found at: {pbxproj_path}")
        sys.exit(1)

    success = add_arkit_libraries(pbxproj_path)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
