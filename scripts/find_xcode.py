#!/usr/bin/env python3
import os
import plistlib
import glob
import sys

def get_xcode_version(path):
    try:
        plist_path = os.path.join(path, 'Contents', 'Info.plist')
        if not os.path.exists(plist_path):
            return '0.0'
        with open(plist_path, 'rb') as f:
            plist = plistlib.load(f)
            return plist.get('CFBundleShortVersionString', '0.0')
    except Exception:
        return '0.0'

def parse_version(v):
    return [int(x) for x in v.split('.')]

def find_best_xcode():
    # If DEVELOPER_DIR is already set, respect it
    if 'DEVELOPER_DIR' in os.environ:
        return os.environ['DEVELOPER_DIR']

    # Look for likely Xcode paths
    search_paths = glob.glob('/Applications/Xcode*.app')

    # Also check the default one if it's not in the list (e.g. renamed or standard)
    if '/Applications/Xcode.app' not in search_paths and os.path.exists('/Applications/Xcode.app'):
        search_paths.append('/Applications/Xcode.app')

    xcode_versions = []

    for path in search_paths:
        ver = get_xcode_version(path)
        xcode_versions.append({'path': path, 'version': ver})

    # Sort by version descending
    xcode_versions.sort(key=lambda x: parse_version(x['version']), reverse=True)

    preferred_prefixes = []
    env_preferred = os.environ.get("PREFERRED_XCODE_VERSION")
    if env_preferred:
        preferred_prefixes.append(env_preferred)

    # Prefer Unity-compatible Sequoia linker stability: Xcode 16.4 first.
    preferred_prefixes.extend(["16.4", "16.1"])
    for prefix in preferred_prefixes:
        for xcode in xcode_versions:
            if xcode['version'].startswith(prefix):
                return os.path.join(xcode['path'], 'Contents', 'Developer')

    # Fallback to newest available
    if xcode_versions:
        return os.path.join(xcode_versions[0]['path'], 'Contents', 'Developer')

    # Last resort default
    return '/Applications/Xcode.app/Contents/Developer'

if __name__ == "__main__":
    print(find_best_xcode())
