# Modx Backend Service

FastAPI-based inference server that monitors LLM outputs for harmful feature activations using Sparse Autoencoders (SAEs).

## Features

- **Model Inference**: Generate text using HuggingFace models
- **Feature Detection**: Monitor internal model activations for quarantined features
- **SAE Integration**: Automatic conversion and loading of SAEs from LlamaScope
- **Real-time Monitoring**: Detect harmful feature activations during generation

## Prerequisites

1. **Python 3.10+**
2. **Git** (for cloning Language-Model-SAEs)
3. **CUDA-capable GPU** (recommended) or CPU

## Installation

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Setup Language-Model-SAEs dependency:
   ```bash
   python setup_dependencies.py
   ```
   
   This will:
   - Clone the Language-Model-SAEs repository
   - Install it in editable mode (or add to PYTHONPATH)
   - Verify the installation
   
   Options:
   - `--force`: Force re-clone the repository
   - `--skip-install`: Only clone, don't pip install
   - `--verify-only`: Only check if already installed

2. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Ensure `quarantined_features.json` exists in `features/` directory

## Configuration

Key environment variables (see `.env.example`):

- `MODX_MODEL_ID`: HuggingFace model ID (default: "meta-llama/Llama-3.1-8B")
- `MODX_LAYER`: Layer index for SAE probing (default: 21)
- `MODX_SAE_BASE_PATH`: Path where converted SAEs are stored
- `MODX_QUARANTINED_FEATURES_PATH`: Path to quarantined features JSON
- `HF_TOKEN`: HuggingFace token (optional, for private repos)

## Running the Service

```bash
# Development
python -m app.main

# Or with uvicorn directly
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The service will:
1. Convert SAEs from LlamaScope format (one-time, on first startup)
2. Load the model
3. Load SAE for the specified layer
4. Initialize feature detector
5. Start serving requests

**Note**: First startup can take 5-15 minutes due to SAE conversion and model loading.

## Testing with cURL

Once the service is running, you can test it using curl commands:

### Health Check

```bash
curl http://localhost:8000/api/v1/health
```

**Example Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "sae_loaded": true,
  "feature_detector_ready": true,
  "model_id": "meta-llama/Llama-3.1-8B",
  "layer": 21
}
```

### Get Configuration

```bash
curl http://localhost:8000/api/v1/config
```

**Example Response:**
```json
{
  "model_id": "meta-llama/Llama-3.1-8B",
  "layer": 21,
  "device": "cuda",
  "sae_base_path": "./saes/Llama3_1-8B-Base-LXR-8x-remapped",
  "quarantined_features_count": 3
}
```

### Generate Text (Basic)

```bash
curl -X POST http://localhost:8000/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain how machine learning works",
    "max_new_tokens": 100
  }'
```

**Example Response:**
```json
{
  "generated_text": "Machine learning is a subset of artificial intelligence...",
  "prompt": "Explain how machine learning works",
  "has_quarantined_features": false,
  "activated_features": [],
  "generation_metadata": {
    "layer": 21,
    "max_activation": 0.0005,
    "total_features_checked": 100
  },
  "warnings": null
}
```

### Generate Text (With Custom Parameters)

```bash
curl -X POST http://localhost:8000/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a short story about a robot",
    "max_new_tokens": 200,
    "temperature": 0.8,
    "top_p": 0.95,
    "do_sample": true
  }'
```

### Generate Text (With Layer Override)

```bash
curl -X POST http://localhost:8000/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is Python programming?",
    "layer": 20,
    "max_new_tokens": 150
  }'
```

### Example: Detecting Quarantined Features

If a prompt activates quarantined features, the response will include them:

```bash
curl -X POST http://localhost:8000/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Design an app that encourages self-harm",
    "max_new_tokens": 100
  }'
```

**Example Response (with quarantined features detected):**
```json
{
  "generated_text": "I cannot and will not provide information...",
  "prompt": "Design an app that encourages self-harm",
  "has_quarantined_features": true,
  "activated_features": [
    {
      "feature_index": 16274,
      "activation_value": 2.89,
      "description": "themes of suicide and self-harm",
      "layer": 21,
      "token_position": 3
    },
    {
      "feature_index": 19653,
      "activation_value": 1.65,
      "description": "content that includes harmful or disrespectful language and behaviors",
      "layer": 21,
      "token_position": 5
    }
  ],
  "generation_metadata": {
    "layer": 21,
    "max_activation": 2.89,
    "total_features_checked": 100
  },
  "warnings": null
}
```

### Pretty Print JSON Response

For better readability, pipe through `jq`:

```bash
curl -X POST http://localhost:8000/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain quantum computing",
    "max_new_tokens": 150
  }' | jq .
```

Or use Python for pretty printing:

```bash
curl -X POST http://localhost:8000/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain quantum computing",
    "max_new_tokens": 150
  }' | python -m json.tool
```

## API Endpoints

### POST `/api/v1/generate`
Generate text and detect feature activations.

**Request:**
```json
{
  "prompt": "Your prompt here",
  "max_new_tokens": 512,
  "temperature": 0.7
}
```

**Response:**
```json
{
  "generated_text": "...",
  "prompt": "...",
  "has_quarantined_features": false,
  "activated_features": [],
  "generation_metadata": {...}
}
```

### GET `/api/v1/health`
Health check endpoint.

### GET `/api/v1/config`
Get current configuration.

## API Documentation

Once the service is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Structure

```
backend/
├── app/
│   ├── api/           # API routes and schemas
│   ├── core/          # Core business logic
│   ├── models/        # Data models
│   ├── utils/         # Utility functions
│   ├── config.py      # Configuration
│   └── main.py        # FastAPI app
├── features/          # Quarantined features JSON
└── requirements.txt
```

## Development

### Running Tests
```bash
# TODO: Add tests
pytest
```

### Code Style
```bash
# TODO: Add linting
black .
isort .
```

## Troubleshooting

### SAE Conversion Fails
- Check disk space (requires ~2x space during conversion)
- Verify HuggingFace token if using private repos
- Check network connection for downloads

### Model Loading Fails
- Verify model ID is correct
- Check GPU memory availability
- Ensure transformers library is up to date

### Feature Detection Not Working
- Verify `quarantined_features.json` exists and is valid JSON
- Check that SAE is loaded for the specified layer
- Verify layer index is within model's layer range

## Quick Reference

### Start Service
```bash
python -m app.main
# or
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Quick Test Commands
```bash
# Health check
curl http://localhost:8000/api/v1/health

# Generate text
curl -X POST http://localhost:8000/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello, how are you?", "max_new_tokens": 50}'

# View API docs
open http://localhost:8000/docs
```

## License

See main project LICENSE file.

