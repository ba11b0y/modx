# FastAPI Service Architecture Design

## Overview
A FastAPI-based inference server that monitors LLM outputs for harmful feature activations using Sparse Autoencoders (SAEs) attached to specific model layers.

## Directory Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application entry point
│   ├── config.py               # Configuration management (env vars, defaults)
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes.py           # API route definitions
│   │   └── schemas.py          # Pydantic models for requests/responses
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── model_manager.py    # Model loading and lifecycle management
│   │   ├── sae_converter.py    # One-time SAE conversion from LlamaScope format
│   │   ├── sae_manager.py      # SAE loading and attachment to layers
│   │   ├── feature_detector.py # Quarantined feature detection logic
│   │   └── inference.py        # Inference pipeline with probing
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── model_state.py      # Model state dataclasses
│   │   └── feature_state.py    # Feature detection result models
│   │
│   └── utils/
│       ├── __init__.py
│       ├── hooks.py            # PyTorch hook utilities for activation capture
│       └── loaders.py          # File loading utilities (quarantined features)
│
├── features/
│   └── quarantined_features.json  # Feature index -> description mapping
│
├── requirements.txt            # Python dependencies
├── .env.example               # Environment variable template
└── README.md                  # Service documentation
```

## Component Design

### 1. Configuration (`app/config.py`)

**Purpose**: Centralized configuration management

**Key Settings**:
- `DEFAULT_MODEL`: HuggingFace model string (default: "meta-llama/Llama-3.1-8B")
- `DEFAULT_LAYER`: Layer index for SAE attachment (default: 21)
- `SAE_SOURCE_REPO`: HuggingFace repo for SAEs (default: "fnlp/Llama3_1-8B-Base-LXR-8x")
- `SAE_BASE_PATH`: Base directory for converted SAE checkpoints (where converted SAEs are stored)
- `SAE_TEMP_PATH`: Temporary directory for downloading source SAEs (optional, defaults to SAE_BASE_PATH + "-source")
- `QUARANTINED_FEATURES_PATH`: Path to quarantined_features.json
- `DEVICE`: CUDA/CPU device selection
- `MAX_NEW_TOKENS`: Generation parameters
- `TEMPERATURE`, `TOP_P`, etc.: Generation hyperparameters
- `ACTIVATION_THRESHOLD`: Minimum activation value to consider a feature "active"
- `FEATURE_TOP_K`: Number of top features to check against quarantined set
- `SAE_CONVERSION_LAYERS`: Range of layers to convert (default: 0-31, or specific list)
- `FORCE_SAE_CONVERSION`: Force re-conversion even if already done (default: False)

**Implementation Notes**:
- Use Pydantic Settings for type-safe config
- Support environment variable overrides
- Validate paths and model strings on startup

---

### 2. Model Manager (`app/core/model_manager.py`)

**Purpose**: Handle model loading, caching, and lifecycle

**Key Responsibilities**:
- Load HuggingFace model and tokenizer
- Manage model device placement (CPU/GPU)
- Provide model instance to other components
- Handle model reloading if needed
- Cache loaded models (singleton pattern)

**Key Methods**:
- `load_model(model_id: str) -> LanguageModel`: Load model from HF
- `get_model() -> LanguageModel`: Get current model instance
- `reload_model(model_id: str) -> None`: Reload with new model
- `is_loaded() -> bool`: Check if model is ready

**Dependencies**:
- Uses `lm_saes.backend.LanguageModel` from Language-Model-SAEs library
- Requires transformers, torch

---

### 3. SAE Converter (`app/core/sae_converter.py`)

**Purpose**: One-time conversion of SAEs from LlamaScope format to Language-Model-SAEs format

**Key Responsibilities**:
- Download SAEs from HuggingFace repository (if not already present)
- Convert safetensors files: rename keys, transpose weights
- Copy and rename config files
- Check if conversion already completed (idempotent)
- Handle conversion errors gracefully

**Key Methods**:
- `convert_saes(source_repo: str, target_path: str, layers: List[int], force: bool = False) -> bool`:
  - Check if conversion already done (unless force=True)
  - Download SAEs from HF if needed
  - For each layer:
    - Load safetensors file
    - Apply key renaming and weight transposition
    - Save converted safetensors
    - Copy and rename config files
  - Return True if successful, False otherwise
- `is_conversion_complete(target_path: str, layers: List[int]) -> bool`: Check if all layers are converted
- `convert_single_sae(layer: int, source_dir: str, target_dir: str) -> None`: Convert one layer's SAE

**Conversion Operations** (from notebook):
1. **Key Renaming**:
   - `encoder.weight` → `W_E` (with transpose and make contiguous)
   - `decoder.weight` → `W_D` (with transpose and make contiguous)
   - `encoder.bias` → `b_E`
   - `decoder.bias` → `b_D`

2. **File Operations**:
   - Source: `{source_dir}/Llama3_1-8B-Base-L{layer}R-8x/checkpoints/final.safetensors`
   - Target: `{target_dir}/Llama3_1-8B-Base-L{layer}R-8x/checkpoints/final.safetensors`
   - Copy `hyperparams.json` → `config.json`
   - Copy `lm_config.json` → `lm_config.json`

3. **Idempotency Check**:
   - Check if target safetensors file exists
   - Check if config.json exists
   - Skip conversion if both exist (unless force=True)

**Dependencies**:
- `huggingface_hub` for downloading
- `safetensors` for loading/saving
- `shutil` for file copying
- `os` for directory operations

**Error Handling**:
- Handle missing source files gracefully
- Log conversion progress
- Continue with other layers if one fails
- Return conversion status summary

---

### 4. SAE Manager (`app/core/sae_manager.py`)

**Purpose**: Load and attach SAEs to specific model layers

**Key Responsibilities**:
- Load SAE checkpoints from filesystem
- Attach SAEs to specified model layers
- Manage SAE lifecycle (loading, caching, cleanup)
- Provide SAE encoding functionality

**Key Methods**:
- `load_sae(layer: int, sae_path: str) -> SparseAutoEncoder`: Load SAE for layer
- `attach_sae_to_layer(layer: int, sae: SparseAutoEncoder) -> None`: Attach SAE
- `get_sae_for_layer(layer: int) -> Optional[SparseAutoEncoder]`: Get attached SAE
- `encode_activations(layer: int, activations: Tensor) -> Tensor`: Encode layer activations

**SAE Path Structure**:
- Assumes SAEs are already converted (by SAE Converter)
- Path pattern: `{SAE_BASE_PATH}/Llama3_1-8B-Base-L{layer}R-8x/checkpoints/final.safetensors`
- Config file at: `{SAE_BASE_PATH}/Llama3_1-8B-Base-L{layer}R-8x/config.json`
- Expects converted format with keys: `W_E`, `W_D`, `b_E`, `b_D`

**Dependencies**:
- Uses `lm_saes.sae.SparseAutoEncoder`
- Uses `lm_saes.config.SAEConfig`

---

### 5. Feature Detector (`app/core/feature_detector.py`)

**Purpose**: Load quarantined features and detect activations

**Key Responsibilities**:
- Load quarantined_features.json on startup
- Check feature activations against quarantined set
- Identify which quarantined features are active
- Calculate activation statistics

**Key Methods**:
- `load_quarantined_features(path: str) -> Dict[int, str]`: Load feature dict
- `detect_quarantined_activations(feature_activations: Tensor, top_k: int) -> List[FeatureActivation]`: 
  - Find top-k activated features
  - Check if any are in quarantined set
  - Return list of activated quarantined features with metadata
- `get_feature_description(feature_index: int) -> Optional[str]`: Get description for feature

**Data Structures**:
```python
@dataclass
class FeatureActivation:
    feature_index: int
    activation_value: float
    description: str
    layer: int
```

**Dependencies**:
- JSON file loading
- PyTorch tensor operations

---

### 6. Inference Pipeline (`app/core/inference.py`)

**Purpose**: Orchestrate the full inference + probing workflow

**Key Responsibilities**:
- Generate text from prompt (normal inference)
- Re-run model with hooks to capture activations
- Extract activations at target layer
- Encode activations through SAE
- Check for quarantined feature activations
- Return combined result (text + feature alerts)

**Key Methods**:
- `generate_with_probing(prompt: str, generation_config: Dict) -> InferenceResult`:
  1. Tokenize input prompt
  2. Generate output tokens (normal forward pass)
  3. Decode generated text
  4. Create full sequence (prompt + generated)
  5. Re-run model with activation hooks enabled
  6. Capture activations at target layer
  7. Encode through SAE to get feature activations
  8. Check for quarantined features
  9. Return InferenceResult

**Data Structures**:
```python
@dataclass
class InferenceResult:
    generated_text: str
    prompt: str
    has_quarantined_features: bool
    activated_features: List[FeatureActivation]
    generation_metadata: Dict  # tokens, logprobs, etc.
```

**Hook Management**:
- Use PyTorch forward hooks to capture activations
- Hook at: `blocks.{layer}.hook_resid_post` (based on notebook pattern)
- Store activations in thread-safe storage during forward pass

**Dependencies**:
- Model Manager
- SAE Manager
- Feature Detector
- PyTorch hooks

---

### 7. API Layer (`app/api/`)

#### Schemas (`app/api/schemas.py`)

**Request Models**:
```python
class GenerateRequest(BaseModel):
    prompt: str
    model_id: Optional[str] = None  # Override default model
    layer: Optional[int] = None     # Override default layer
    max_new_tokens: Optional[int] = None
    temperature: Optional[float] = None
    top_p: Optional[float] = None
    # ... other generation params
```

**Response Models**:
```python
class FeatureActivationResponse(BaseModel):
    feature_index: int
    activation_value: float
    description: str
    layer: int

class GenerateResponse(BaseModel):
    generated_text: str
    prompt: str
    has_quarantined_features: bool
    activated_features: List[FeatureActivationResponse]
    generation_metadata: Dict
    warnings: Optional[List[str]] = None
```

#### Routes (`app/api/routes.py`)

**Endpoints**:

1. **POST `/generate`**
   - Main inference endpoint
   - Accepts GenerateRequest
   - Returns GenerateResponse
   - Handles errors gracefully

2. **GET `/health`**
   - Health check endpoint
   - Returns model status, SAE status, feature detector status

3. **GET `/config`**
   - Returns current configuration (non-sensitive)
   - Shows loaded model, layer, etc.

4. **POST `/reload-model`** (optional, admin)
   - Reload model with new HF string
   - Useful for model switching

---

### 8. Main Application (`app/main.py`)

**Purpose**: FastAPI app initialization and startup/shutdown

**Key Responsibilities**:
- Initialize FastAPI app
- Load configuration
- Initialize Model Manager, SAE Manager, Feature Detector on startup
- Attach SAE to default layer on startup
- Register API routes
- Handle graceful shutdown (cleanup resources)

**Startup Sequence**:
1. Load configuration from env/file
2. **Initialize SAE Converter → Convert SAEs (one-time, idempotent)**
   - Check if conversion needed
   - Download from HF if needed
   - Convert all specified layers
   - Verify conversion success
3. Initialize Model Manager → Load default model
4. Initialize SAE Manager → Load SAE for default layer (from converted path)
5. Attach SAE to model at default layer
6. Initialize Feature Detector → Load quarantined_features.json
7. Register routes
8. Ready to serve requests

**SAE Conversion Details**:
- Runs once on first startup
- Checks if conversion already complete (checks for converted files)
- Only converts missing layers (unless FORCE_SAE_CONVERSION=True)
- Logs progress and any errors
- Server startup will fail if conversion fails (critical dependency)

**Shutdown Sequence**:
1. Cleanup hooks
2. Unload models (if needed)
3. Free GPU memory

---

## Data Flow

### SAE Conversion Flow (Startup):
```
Server Startup
    ↓
Load Configuration
    ↓
SAE Converter: Check if conversion needed
    ↓
    ├─→ If already converted: Skip
    └─→ If not converted:
        ├─→ Download SAEs from HF (if not cached)
        ├─→ For each layer (0-31):
        │   ├─→ Load safetensors file
        │   ├─→ Rename keys (encoder.weight → W_E, etc.)
        │   ├─→ Transpose weights (W_E, W_D)
        │   ├─→ Save converted safetensors
        │   └─→ Copy config files (hyperparams.json → config.json)
        └─→ Verify all conversions complete
    ↓
Conversion Complete → Continue startup
```

### Request Flow:
```
Client Request (POST /generate)
    ↓
API Route Handler (routes.py)
    ↓
Inference Pipeline (inference.py)
    ↓
    ├─→ Model Manager: Get model instance
    ├─→ Generate text (normal inference)
    ├─→ Re-run with hooks enabled
    ├─→ SAE Manager: Encode activations
    └─→ Feature Detector: Check quarantined features
    ↓
Combine results
    ↓
Return Response (GenerateResponse)
```

### Activation Capture Flow:
```
Model Forward Pass (with hooks)
    ↓
Hook fires at blocks.{layer}.hook_resid_post
    ↓
Capture activation tensor (shape: [batch, seq_len, hidden_dim])
    ↓
Pass to SAE.encode()
    ↓
Get feature activations (shape: [batch, seq_len, num_features])
    ↓
Extract top-k features per token position
    ↓
Check against quarantined_features set
    ↓
Return activated quarantined features
```

---

## Error Handling

**Error Types**:
1. **SAE Conversion Errors**: HF download failures, file I/O errors, conversion failures
2. **Model Loading Errors**: Invalid HF model string, missing files
3. **SAE Loading Errors**: Missing SAE checkpoints, incompatible configs
4. **Feature Detection Errors**: Missing quarantined_features.json, invalid format
5. **Inference Errors**: CUDA OOM, invalid prompts, generation failures
6. **Hook Errors**: Layer index out of range, hook attachment failures

**Error Response Format**:
```python
class ErrorResponse(BaseModel):
    error: str
    error_type: str
    details: Optional[Dict] = None
```

**HTTP Status Codes**:
- 200: Success
- 400: Bad request (invalid parameters)
- 500: Internal server error (model/SAE issues)
- 503: Service unavailable (model not loaded)

---

## Configuration Management

**Environment Variables**:
- `MODX_MODEL_ID`: HuggingFace model string
- `MODX_LAYER`: Layer index for SAE
- `MODX_SAE_SOURCE_REPO`: HF repo for source SAEs (default: "fnlp/Llama3_1-8B-Base-LXR-8x")
- `MODX_SAE_BASE_PATH`: Base path for converted SAE checkpoints
- `MODX_SAE_TEMP_PATH`: Temporary path for downloading source SAEs (optional)
- `MODX_SAE_CONVERSION_LAYERS`: Comma-separated layer list or range (e.g., "0-31" or "0,1,2,21")
- `MODX_FORCE_SAE_CONVERSION`: Force re-conversion (true/false, default: false)
- `MODX_QUARANTINED_FEATURES_PATH`: Path to quarantined features JSON
- `MODX_DEVICE`: cuda/cpu
- `MODX_ACTIVATION_THRESHOLD`: Minimum activation threshold
- `MODX_FEATURE_TOP_K`: Number of top features to check
- `HF_TOKEN`: HuggingFace token for private repos (optional)

**Default Values**:
- Model: "meta-llama/Llama-3.1-8B"
- Layer: 21
- SAE Source Repo: "fnlp/Llama3_1-8B-Base-LXR-8x"
- SAE Conversion Layers: 0-31 (all layers)
- Force Conversion: False
- Device: "cuda" if available, else "cpu"
- Activation threshold: 1e-3
- Feature top-k: 10

---

## Performance Considerations

1. **SAE Conversion**: One-time operation on startup, can take several minutes
   - Consider pre-converting SAEs in Docker image build
   - Conversion is idempotent - skips if already done
   - Can be done in parallel for multiple layers (future optimization)
2. **Model Caching**: Keep model loaded in memory (singleton)
3. **SAE Caching**: Cache loaded SAEs per layer
4. **Feature Dict Caching**: Load quarantined features once on startup
5. **GPU Memory**: Monitor and handle OOM gracefully
6. **Async Operations**: Use FastAPI async for I/O, but model inference is synchronous
7. **Batch Processing**: Future enhancement - support batch inference
8. **Disk Space**: SAE conversion requires ~2x disk space temporarily (source + converted)

---

## Testing Strategy

**Unit Tests**:
- Feature detector logic
- SAE encoding
- Configuration loading

**Integration Tests**:
- Full inference pipeline
- Hook attachment and activation capture
- Quarantined feature detection

**Load Tests**:
- Concurrent request handling
- Memory usage under load
- Response times

---

## Future Enhancements

1. **Parallel SAE Conversion**: Convert multiple layers in parallel during startup
2. **SAE Pre-conversion**: Convert SAEs during Docker image build to speed up startup
3. **Batch Inference**: Process multiple prompts simultaneously
4. **Multiple Layers**: Support monitoring multiple layers simultaneously
5. **Feature Statistics**: Track activation patterns over time
6. **Model Switching**: Hot-reload models without restart
7. **WebSocket Support**: Streaming generation with real-time feature alerts
8. **Metrics/Logging**: Prometheus metrics, structured logging
9. **Feature Database**: Store and query feature activation history
10. **Incremental SAE Loading**: Only load SAEs for layers that will be monitored

---

## Dependencies

**Core**:
- fastapi
- uvicorn
- pydantic
- torch
- transformers
- huggingface_hub

**SAE Library**:
- Language-Model-SAEs (from notebook, needs to be installed)

**Utilities**:
- python-dotenv (for config)
- safetensors (for SAE loading/conversion)
- shutil (for file operations)

---

## Security Considerations

1. **Input Validation**: Sanitize prompts, validate model strings
2. **Resource Limits**: Max prompt length, max generation tokens
3. **Rate Limiting**: Prevent abuse (future)
4. **Authentication**: Optional API keys (future)
5. **Model Isolation**: Ensure model doesn't execute arbitrary code

---

## Deployment Considerations

1. **Docker**: Containerize with CUDA support
2. **GPU Requirements**: Specify GPU memory requirements
3. **Startup Time**: 
   - Model loading can take time - health checks should account for this
   - **SAE conversion adds significant startup time on first run** (can be 5-15 minutes depending on network/disk)
   - Consider pre-converting SAEs in Docker image build to avoid conversion on every container start
   - Use volume mounts to persist converted SAEs across container restarts
4. **Disk Space**: 
   - SAE conversion requires ~2x disk space temporarily (source + converted)
   - Converted SAEs are ~same size as source, can delete source after conversion
   - Total SAE storage: ~few GB for all layers
5. **Scaling**: Stateless design allows horizontal scaling (with model replication)
6. **Monitoring**: Health endpoints, metrics endpoints
7. **SAE Conversion Strategy**:
   - **Option A**: Convert during Docker build (fastest startup, larger image)
   - **Option B**: Convert on first startup with persistent volume (slower first start, smaller image)
   - **Option C**: Pre-convert and mount as volume (fastest, requires external setup)

