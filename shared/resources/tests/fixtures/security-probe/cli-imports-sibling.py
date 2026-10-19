#!/usr/bin/env python3
"""Imports a module from its own directory. Under `python3 -I` the script's
directory is not on sys.path and this fails to start; without `-B` the import
writes __pycache__/ beside it, which the escape sentinel reports (task.215)."""
import sys

from cli_sibling_helper import is_bare_host

host = sys.argv[sys.argv.index("--host") + 1] if "--host" in sys.argv else ""
sys.exit(0 if is_bare_host(host) else 3)
