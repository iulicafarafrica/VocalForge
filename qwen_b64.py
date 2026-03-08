#!/usr/bin/env python3
"""
qwen_b64.py - Solutia finala fara pipe, fara triple-quotes, fara -c
====================================================================

FLUX pentru Qwen:
  1. Qwen encodează conținutul în base64 (în capul lui)
  2. Scrie base64 string cu echo (e doar text ASCII, CMD nu-l rupe)
  3. Acest script decodează și scrie fișierul final

COMANDA pentru Qwen (CMD-friendly, o singură linie scurtă):
  echo BASE64_STRING | python qwen_b64.py calea/fisierului.jsx

SAU fără pipe (și mai sigur):
  echo BASE64_STRING> .qwen_b64.txt && python qwen_b64.py calea/fisierului.jsx --from-file

Qwen trebuie să:
  1. Genereze base64 din conținut (știe să facă asta intern)
  2. Scrie: echo <base64> > .qwen_b64.txt
  3. Ruleze: python qwen_b64.py <dest> --from-file
"""

import sys
import os
import base64

def ensure_dir(path):
    d = os.path.dirname(os.path.abspath(path))
    if d:
        os.makedirs(d, exist_ok=True)

def decode_and_write(b64_string, dest):
    # Curata spatii/newlines din base64
    b64_clean = b64_string.strip().replace('\n', '').replace('\r', '').replace(' ', '')
    try:
        content = base64.b64decode(b64_clean).decode('utf-8')
    except Exception as e:
        print(f"[EROARE] Base64 invalid: {e}")
        sys.exit(1)
    ensure_dir(dest)
    with open(dest, 'w', encoding='utf-8') as f:
        f.write(content)
    ab = os.path.abspath(dest)
    print(f"[OK] {ab}")
    print(f"[OK] {len(content)} chars | {len(content.splitlines())} linii | {len(content.encode('utf-8'))} bytes")

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    dest = sys.argv[1]

    # Metoda: citeste din fisier temp .qwen_b64.txt
    if '--from-file' in sys.argv:
        temp = '.qwen_b64.txt'
        if len(sys.argv) > 3:
            temp = sys.argv[3]
        if not os.path.exists(temp):
            print(f"[EROARE] Fisier temp lipsa: {temp}")
            sys.exit(1)
        with open(temp, 'r', encoding='utf-8') as f:
            b64 = f.read()
        decode_and_write(b64, dest)
        os.remove(temp)
        print(f"[OK] Temp sters: {temp}")
        return

    # Metoda: base64 ca argument direct
    if len(sys.argv) >= 3:
        decode_and_write(sys.argv[2], dest)
        return

    # Metoda: citeste din stdin
    b64 = sys.stdin.read()
    decode_and_write(b64, dest)

if __name__ == '__main__':
    main()
