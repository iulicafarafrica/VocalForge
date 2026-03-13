import os

with open("cod_proiect_curat.txt", "w", encoding="utf-8") as outfile:
    for root, dirs, files in os.walk("."):
        # Ignorăm folderele mari/inutile
        if any(ignore in root for ignore in ['node_modules', 'venv', 'env', '.git', 'models']):
            continue
            
        for file in files:
            if file.endswith(('.py', '.jsx')):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, "r", encoding="utf-8", errors="ignore") as infile:
                        content = infile.read()
                        # Scriem doar daca are continut
                        if content:
                            outfile.write(f"\n--- FILE: {filepath} ---\n")
                            outfile.write(content)
                            outfile.write("\n")
                            print(f"Am adaugat: {filepath}") # Sa vedem in terminal daca gaseste ceva
                except Exception as e:
                    print(f"Eroare la {filepath}: {e}")

print("Gata! Verifică fișierul cod_proiect_curat.txt")