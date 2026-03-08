#!/usr/bin/env python3
"""
qwen_helper.py - Solutia finala pentru AionUI/Qwen pe Windows
==============================================================

PROBLEMA REZOLVATA:
- CMD: "command line too long"
- PowerShell -Command: here-strings nu merg, ghilimelele se strica
- PowerShell -File: FUNCTIONEAZA cu orice continut

FLUX CORECT:
1. Qwen apeleaza acest script cu Python (Python nu are limitari de linie)
2. Scriptul scrie fisierul direct cu open() Python
3. GATA - fara CMD, fara PowerShell -Command

UTILIZARE:
  python qwen_helper.py write <cale_fisier> <cale_continut_sau_->
  python qwen_helper.py write-inline <cale_fisier>
  (continutul vine din stdin)

EXEMPLE pentru Qwen:
  # Scrie GPUMonitorTab.jsx direct:
  python qwen_helper.py write-inline frontend/src/components/GPUMonitorTab.jsx << CONTENT
  import React...
  CONTENT

  # Sau cu fisier sursa:
  python qwen_helper.py write frontend/src/components/GPUMonitorTab.jsx content.txt
"""

import sys
import os
import json
import subprocess

def ensure_dir(path):
    d = os.path.dirname(os.path.abspath(path))
    if d:
        os.makedirs(d, exist_ok=True)

def cmd_write(args):
    """Scrie un fisier direct din Python - cea mai simpla metoda."""
    if len(args) < 2:
        print("Utilizare: python qwen_helper.py write <dest> <sursa|-|--json>")
        sys.exit(1)

    dest = args[0]
    source = args[1]

    if source == '-' or source == '--stdin':
        content = sys.stdin.read()
    elif source == '--json':
        data = json.loads(sys.stdin.read())
        dest = data.get('path', dest)
        content = data['content']
    elif os.path.exists(source):
        with open(source, 'r', encoding='utf-8') as f:
            content = f.read()
    else:
        content = source  # continut direct ca string

    ensure_dir(dest)
    with open(dest, 'w', encoding='utf-8') as f:
        f.write(content)

    abs_dest = os.path.abspath(dest)
    print(f"[OK] {abs_dest} ({len(content)} chars, {len(content.splitlines())} linii)")

def cmd_write_inline(args):
    """Citeste continut din stdin si scrie la destinatie."""
    if len(args) < 1:
        print("Utilizare: python qwen_helper.py write-inline <dest>")
        sys.exit(1)
    dest = args[0]
    content = sys.stdin.read()
    ensure_dir(dest)
    with open(dest, 'w', encoding='utf-8') as f:
        f.write(content)
    abs_dest = os.path.abspath(dest)
    print(f"[OK] {abs_dest} ({len(content)} chars)")

def cmd_run_ps1(args):
    """
    Scrie un .ps1 temp si il executa cu powershell -File.
    Asta rezolva problema here-string in -Command.
    """
    if len(args) < 1:
        print("Utilizare: python qwen_helper.py run-ps1 <script.ps1|-|--inline>")
        sys.exit(1)

    source = args[0]
    if source == '-' or source == '--inline':
        script_content = sys.stdin.read()
    elif os.path.exists(source):
        with open(source, 'r', encoding='utf-8') as f:
            script_content = f.read()
    else:
        script_content = source

    # Scrie .ps1 temp
    temp_ps1 = os.path.join(os.getcwd(), '.qwen_temp_run.ps1')
    with open(temp_ps1, 'w', encoding='utf-8') as f:
        f.write(script_content)

    print(f"[INFO] Execut: powershell -File {temp_ps1}")
    result = subprocess.run(
        ['powershell.exe', '-ExecutionPolicy', 'Bypass', '-File', temp_ps1],
        capture_output=False
    )

    try:
        os.remove(temp_ps1)
    except:
        pass

    sys.exit(result.returncode)

def cmd_append(args):
    """Adauga continut la un fisier existent."""
    if len(args) < 2:
        print("Utilizare: python qwen_helper.py append <dest> <continut>")
        sys.exit(1)
    dest = args[0]
    content = ' '.join(args[1:]) if args[1] != '-' else sys.stdin.read()
    ensure_dir(dest)
    with open(dest, 'a', encoding='utf-8') as f:
        f.write(content + '\n')
    print(f"[OK] Adaugat la {dest}")

def cmd_read(args):
    """Citeste si afiseaza un fisier."""
    if len(args) < 1:
        print("Utilizare: python qwen_helper.py read <fisier>")
        sys.exit(1)
    with open(args[0], 'r', encoding='utf-8') as f:
        print(f.read())

COMMANDS = {
    'write': cmd_write,
    'write-inline': cmd_write_inline,
    'run-ps1': cmd_run_ps1,
    'append': cmd_append,
    'read': cmd_read,
}

def main():
    if len(sys.argv) < 2 or sys.argv[1] in ('-h', '--help', 'help'):
        print(__doc__)
        print("Comenzi disponibile:", ', '.join(COMMANDS.keys()))
        sys.exit(0)

    cmd = sys.argv[1]
    if cmd not in COMMANDS:
        print(f"[EROARE] Comanda necunoscuta: {cmd}")
        print("Comenzi disponibile:", ', '.join(COMMANDS.keys()))
        sys.exit(1)

    COMMANDS[cmd](sys.argv[2:])

if __name__ == '__main__':
    main()
