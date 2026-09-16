#!/bin/bash
# Entrypoint script for the Oracle Monitor Dashboard backend

set -e

# Print Python and uvicorn info for debugging
echo "Python executable: $(which python)"
echo "Python version: $(python --version)"
echo "Checking uvicorn..."
python -c "import uvicorn; print('uvicorn version:', uvicorn.__version__)"
python -c "import sys; print('Python executable:', sys.executable)"

# Start uvicorn using python -m uvicorn
if [ $# -gt 0 ]; then
  exec "$@"
fi
exec python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2