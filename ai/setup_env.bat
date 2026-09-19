@echo off
echo ==========================================================
echo   CAI DAT MOI TRUONG PYTORCH CUDA CHO CONVNEXT-TINY
echo   AgriVisionAI - NVIDIA GTX 1650 (Windows 64-bit)
echo ==========================================================

echo [1/3] Dang tao moi truong ao (.venv)...
python -m venv .venv
if errorlevel 1 (
    echo [!] Khong the tao .venv. Vui long kiem tra Python da duoc cai dat chua.
    pause
    exit /b 1
)

echo [2/3] Kich hoat moi truong ao va cai dat PyTorch CUDA 12.4...
call .venv\Scripts\activate
python -m pip install --upgrade pip
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124

echo [3/3] Cai dat cac thu vien bo sung tu requirements.txt...
pip install -r requirements.txt

echo ==========================================================
echo [V] HOAN TAT CAI DAT! Kiem tra card GPU...
python test_gpu.py
echo ==========================================================
pause
