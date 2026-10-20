"""A sibling module imported by cli-imports-sibling.py (task.215). Its name has
no hyphen because Python cannot import one."""
import re


def is_bare_host(host):
    return bool(re.fullmatch(r"[a-z0-9.-]+(:[0-9]+)?", host or "", re.I)) and ".." not in host
