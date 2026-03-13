import os

# Deschidem fișierele
core_file = open("core_dsp.txt", "w", encoding="utf-8")
front_file = open("frontend_ui.txt", "w", encoding="utf-8")
utils_file = open("utils_config.txt", "w", encoding="utf-8")

current_file = None

with open("cod_proiect_curat.txt", "r", encoding="utf-8", errors="ignore") as f:
    for line in f:
        # Detectăm linia care conține numele fișierului
        if "--- FILE:" in line:
            # Determinăm extensia din calea fișierului
            filepath = line.strip()
            if filepath.endswith(".py"):
                current_file = core_file
            elif filepath.endswith((".jsx", ".js")):
                current_file = front_file
            else:
                current_file = utils_file
        
        # Dacă avem un fișier curent activ, scriem linia
        if current_file:
            current_file.write(line)

core_file.close()
front_file.close()
utils_file.close()
print("Împărțire finalizată.")