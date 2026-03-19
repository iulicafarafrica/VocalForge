@echo off
title OpenCode + Qwen3-8B Local

echo [1/3] Pornesc llama-server cu RTX 3070 (Qwen3-8B)...
start "llama-server" cmd /k "cd /d D:\LLama && .\llama-server.exe -m models/Qwen3-8B-Q4_K_M.gguf -ngl 40 -c 8192 --parallel 1 --flash-attn on --no-mmap --host 0.0.0.0 --port 8080"

echo [2/3] Astept 15 secunde sa se incarce modelul...
timeout /t 15 /nobreak > nul

echo [3/3] Pornesc OpenCode Desktop...
start "" "C:\Users\gigid\AppData\Local\OpenCode\OpenCode.exe"

exit
