#!/usr/bin/env python3
"""
qwen_write.py - Solutia finala pentru Qwen + AionUI pe Windows
===============================================================

REGULA DE AUR: Tot ce face Qwen trece prin acest script.
Nicio pipe, niciun here-string, niciun -Command.

UTILIZARE - Qwen trebuie sa apeleze EXACT asa:

  python qwen_write.py set-content <cale_fisier>
  (apoi urmeaza continutul pana la linia: ###END###)

SAU varianta inline (recomandata pentru Qwen):

  python qwen_write.py write <cale_fisier> <cale_temp>

Fluxul corect pentru Qwen:
  1. Scrie continutul in .qwen_temp.txt cu python -c si triple-quotes
  2. Apeleaza: python qwen_write.py move .qwen_temp.txt <destinatie>
"""

import sys
import os
import shutil
import json

BASE = os.path.dirname(os.path.abspath(__file__))
TEMP = os.path.join(BASE, '.qwen_temp.txt')

def ensure_dir(path):
    d = os.path.dirname(os.path.abspath(path))
    if d:
        os.makedirs(d, exist_ok=True)

def report(path, content):
    ab = os.path.abspath(path)
    print(f"[OK] {ab}")
    print(f"[OK] {len(content)} chars | {len(content.splitlines())} linii | {len(content.encode('utf-8'))} bytes")

# ── Comanda: move ──────────────────────────────────────────────────────────────
# Qwen scrie .qwen_temp.txt cu python -c, apoi:
#   python qwen_write.py move .qwen_temp.txt frontend/src/components/Foo.jsx
def cmd_move(args):
    if len(args) < 2:
        print("Utilizare: python qwen_write.py move <sursa> <destinatie>")
        sys.exit(1)
    src, dest = args[0], args[1]
    if not os.path.exists(src):
        print(f"[EROARE] Fisierul sursa nu exista: {src}")
        sys.exit(1)
    ensure_dir(dest)
    with open(src, 'r', encoding='utf-8') as f:
        content = f.read()
    with open(dest, 'w', encoding='utf-8') as f:
        f.write(content)
    os.remove(src)
    report(dest, content)

# ── Comanda: read ──────────────────────────────────────────────────────────────
def cmd_read(args):
    if not args:
        print("Utilizare: python qwen_write.py read <fisier>")
        sys.exit(1)
    with open(args[0], 'r', encoding='utf-8') as f:
        print(f.read())

# ── Comanda: check ─────────────────────────────────────────────────────────────
def cmd_check(args):
    path = args[0] if args else TEMP
    if os.path.exists(path):
        size = os.path.getsize(path)
        print(f"[OK] Exista: {path} ({size} bytes)")
    else:
        print(f"[LIPSA] Nu exista: {path}")

# ── Comanda: delete ────────────────────────────────────────────────────────────
def cmd_delete(args):
    if not args:
        print("Utilizare: python qwen_write.py delete <fisier>")
        sys.exit(1)
    if os.path.exists(args[0]):
        os.remove(args[0])
        print(f"[OK] Sters: {args[0]}")
    else:
        print(f"[INFO] Nu exista: {args[0]}")

# ── Comanda: list ──────────────────────────────────────────────────────────────
def cmd_list(args):
    folder = args[0] if args else '.'
    for root, dirs, files in os.walk(folder):
        dirs[:] = [d for d in dirs if d not in ('node_modules', '.git', '__pycache__', 'dist')]
        level = root.replace(folder, '').count(os.sep)
        indent = '  ' * level
        print(f"{indent}{os.path.basename(root)}/")
        subindent = '  ' * (level + 1)
        for file in files:
            fp = os.path.join(root, file)
            size = os.path.getsize(fp)
            print(f"{subindent}{file} ({size}b)")

COMMANDS = {
    'move': cmd_move,
    'read': cmd_read,
    'check': cmd_check,
    'delete': cmd_delete,
    'list': cmd_list,
}

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(0)
    cmd = sys.argv[1]
    if cmd not in COMMANDS:
        print(f"[EROARE] Comanda necunoscuta: '{cmd}'")
        print("Disponibile:", ', '.join(COMMANDS.keys()))
        sys.exit(1)
    COMMANDS[cmd](sys.argv[2:])

if __name__ == '__main__':
    main()
