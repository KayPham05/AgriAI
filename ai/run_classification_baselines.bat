@echo off
setlocal
cd /d "%~dp0\.."

set "PYTHON_EXE=.venv\Scripts\python.exe"
if not exist "%PYTHON_EXE%" (
    echo [ERROR] Missing .venv. Run ai\setup_env.bat first.
    exit /b 1
)

echo [1/4] Training plant baseline...
"%PYTHON_EXE%" -m ai.train --task plant
if errorlevel 1 exit /b 1

echo [2/4] Evaluating plant baseline...
"%PYTHON_EXE%" -m ai.evaluate --task plant
if errorlevel 1 exit /b 1

echo [3/4] Training disease baseline...
"%PYTHON_EXE%" -m ai.train --task disease
if errorlevel 1 exit /b 1

echo [4/4] Evaluating disease baseline...
"%PYTHON_EXE%" -m ai.evaluate --task disease
if errorlevel 1 exit /b 1

echo Completed both classification baselines.
