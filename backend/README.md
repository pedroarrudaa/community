# Community Surf - Backend

## Environment Setup

### Requirements

- Python 3.9+
- pip

### Recommended Configuration

**Important:** Always use the virtual environment executables directly instead of relying on `source venv/bin/activate`.

### Installation

```bash
# Create virtual environment
python3 -m venv venv

# Install dependencies
./venv/bin/pip install -r requirements.txt
```

### Running the Application

```bash
# Method 1: Use the helper script
./run.sh

# Method 2: Call Python directly
./venv/bin/python app.py
```

### Environment Variables

Copy the `.env.example` file to `.env` and configure:

```bash
cp .env.example .env
# Edit the .env file with your credentials
```

## Troubleshooting

### Import Errors in VS Code

If VS Code shows import errors:

1. Check if you're using the Pylance extension
2. Confirm that the settings in `.vscode/settings.json` are correct
3. Restart VS Code after changes

### "ModuleNotFoundError" Error

If you encounter errors like "ModuleNotFoundError: No module named 'X'":

```bash
# Install the missing package directly in the virtual environment
./venv/bin/pip install X
```

## Development

To add new dependencies:

```bash
# Install new dependency
./venv/bin/pip install package-name

# Update requirements.txt
./venv/bin/pip freeze > requirements.txt
```
