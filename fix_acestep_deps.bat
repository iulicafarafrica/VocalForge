@echo off
title Fix ACE-Step Dependencies
color 0E

echo ============================================================
echo   Fixing ACE-Step Dependencies
echo ============================================================
echo.

call d:\VocalForge\venv\Scripts\activate.bat

echo [1/6] Upgrading huggingface-hub...
pip install "huggingface-hub>=1.3.0,<2.0" --upgrade

echo.
echo [2/6] Upgrading tokenizers to 0.22.x...
pip install "tokenizers>=0.22.0,<=0.23.0" --upgrade

echo.
echo [3/6] Reinstalling transformers...
pip install transformers --force-reinstall

echo.
echo [4/6] Fixing torchaudio for torch 2.10...
pip install torchaudio --force-reinstall --no-deps
pip install torchaudio

echo.
echo [5/6] Fixing vector_quantize_pytorch...
pip install vector-quantize-pytorch==1.14.24 --force-reinstall

echo.
echo [6/6] Installing missing packages...
pip install peft lightning nvidia-ml-py

echo.
echo ============================================================
echo   Dependencies fixed!
echo ============================================================
echo.
echo Now run START_ALL.bat to start the servers.
echo.
pause