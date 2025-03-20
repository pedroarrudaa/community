#!/bin/bash

# Path to the virtual environment Python
VENV_PYTHON="$(pwd)/venv/bin/python"

# Check if virtual environment exists
if [ ! -f "$VENV_PYTHON" ]; then
    echo "Virtual environment not found in $(pwd)/venv"
    echo "Creating new virtual environment..."
    python3 -m venv venv
    
    # Install dependencies
    "$(pwd)/venv/bin/pip" install -r requirements.txt
fi

# Run the application using the virtual environment Python
"$VENV_PYTHON" app.py 