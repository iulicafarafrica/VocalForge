#!/usr/bin/env python3
"""
write_file.py - Helper pentru AionUI/Qwen
Permite crearea de fisiere fara limitarile CMD

Utilizare:
  python write_file.py <cale_fisier> <continut_base64>
  python write_file.py <cale_fisier> --stdin
  python write_file.py --json (citeste JSON din stdin)

Exemple:
  echo "continut" | python write_file.py D:\VocalForge\test.txt --stdin
  python write_file.py D:\VocalForge\test.txt --json
"""

import sys
import os
import json
import base64

def write_file(path, content):
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"[OK] Fisier creat: {path} ({len(content)} bytes)")

def main():
    if len(sys.argv) < 2:
        print("Utilizare: python write_file.py <cale> <continut>")
        print("       sau: python write_file.py --json")
        sys.exit(1)

    # Mod JSON: citeste din stdin un JSON cu { "path": "...", "content": "..." }
    if sys.argv[1] == '--json':
        data = json.loads(sys.stdin.read())
        write_file(data['path'], data['content'])
        return

    path = sys.argv[1]

    # Mod --stdin: citeste continut din stdin
    if len(sys.argv) > 2 and sys.argv[2] == '--stdin':
        content = sys.stdin.read()
        write_file(path, content)
        return

    # Mod direct: continut ca argument
    if len(sys.argv) > 2:
        content = ' '.join(sys.argv[2:])
        write_file(path, content)
        return

    print("Eroare: nu s-a specificat continut")
    sys.exit(1)

if __name__ == '__main__':
    main()
