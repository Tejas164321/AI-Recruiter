# Ollama Setup Guide for AI-Recruiter

## Installation Steps

### 1. Install Ollama on Windows

**Option A: Using winget (recommended)**
```powershell
winget install Ollama.Ollama
```

**Option B: Manual Download**
1. Visit: https://ollama.com/download/windows
2. Download OllamaSetup.exe
3. Run the installer

### 2. Configure Ollama to Use D: Drive for Models

By default, Ollama stores models in `C:\Users\<username>\.ollama`. To change this to D: drive:

**Set Environment Variable:**
```powershell
# Open PowerShell as Administrator
[System.Environment]::SetEnvironmentVariable('OLLAMA_MODELS', 'D:\ollama\models', 'User')

# Verify
$env:OLLAMA_MODELS
```

**Create the directory:**
```powershell
New-Item -ItemType Directory -Force -Path "D:\ollama\models"
```

### 3. Enable GPU Acceleration (RTX 3050)

Ollama automatically detects NVIDIA GPUs. Ensure you have:

**Prerequisites:**
- NVIDIA GPU Driver (latest): https://www.nvidia.com/download/index.aspx
- CUDA Toolkit (installed with driver)

**Verify GPU Detection:**
```powershell
# After starting Ollama
nvidia-smi
```

**Set GPU Memory Limit (for 4GB VRAM):**
```powershell
# Optional: Limit VRAM usage to prevent OOM
[System.Environment]::SetEnvironmentVariable('OLLAMA_GPU_MEMORY', '3.5G', 'User')
```

### 4. Start Ollama Server

```powershell
# Start the Ollama service
ollama serve
```

This will start the server at `http://localhost:11434`

### 5. Download Required Models

**Primary Model (Qwen 2.5 14B - 4-bit quantized):**
```powershell
ollama pull qwen2.5:14b-instruct-q4_K_M
```
Size: ~8.5 GB (fits in 4GB VRAM with quantization)

**Fallback Model (Qwen 2.5 7B):**
```powershell
ollama pull qwen2.5:7b-instruct-q4_K_M
```
Size: ~4.5 GB

**Alternatively, use even smaller quantization for RTX 3050:**
```powershell
# 3-bit quantization (better for 4GB VRAM)
ollama pull qwen2.5:14b-instruct-q3_K_M

# Or use 7b as primary
ollama pull qwen2.5:7b-instruct
```

### 6. Test Installation

```powershell
# Test model inference
ollama run qwen2.5:14b-instruct-q4_K_M "Hello, can you respond in JSON format?"
```

### 7. Configure Ollama for Production

**Create Ollama configuration file:**
Location: `D:\ollama\config.json`

```json
{
  "models_path": "D:\\ollama\\models",
  "gpu_layers": -1,
  "num_ctx": 2048,
  "num_thread": 8
}
```

**Environment Variables Summary:**
```powershell
# Set all required environment variables
[System.Environment]::SetEnvironmentVariable('OLLAMA_MODELS', 'D:\ollama\models', 'User')
[System.Environment]::SetEnvironmentVariable('OLLAMA_HOST', '127.0.0.1:11434', 'User')
[System.Environment]::SetEnvironmentVariable('OLLAMA_KEEP_ALIVE', '5m', 'User')
[System.Environment]::SetEnvironmentVariable('OLLAMA_NUM_GPU', '1', 'User')

# Restart PowerShell to apply changes
```

## Verification Checklist

- [ ] Ollama installed successfully (`ollama --version`)
- [ ] Ollama service running (`ollama list`)
- [ ] Models stored in D:\ollama\models
- [ ] GPU detected (`nvidia-smi` shows GPU usage when running inference)
- [ ] Test inference completes successfully
- [ ] Models loaded into VRAM (< 4GB usage)

## Troubleshooting

### Issue: "Out of Memory" Error
**Solution:** Use smaller quantization or reduce context length
```powershell
# Use 3-bit instead of 4-bit
ollama pull qwen2.5:14b-instruct-q3_K_M

# Or reduce context in app config
OLLAMA_NUM_CTX=1024
```

### Issue: GPU Not Detected
**Solution:** Update NVIDIA drivers
```powershell
# Check driver version
nvidia-smi

# Update via GeForce Experience or download from:
# https://www.nvidia.com/download/index.aspx
```

### Issue: Models Not in D: Drive
**Solution:** Verify environment variable
```powershell
# Check current value
$env:OLLAMA_MODELS

# Re-set if needed
[System.Environment]::SetEnvironmentVariable('OLLAMA_MODELS', 'D:\ollama\models', 'User')

# Restart Ollama service
```

## Performance Expectations

**RTX 3050 (4GB VRAM):**
- Qwen 2.5 7B: ~20-30 tokens/sec
- Qwen 2.5 14B (q4): ~10-15 tokens/sec
- Qwen 2.5 14B (q3): ~15-20 tokens/sec

**Per Resume Processing:**
- Embedding generation: ~500ms
- LLM inference: ~2-3 seconds
- Total: ~3-4 seconds per resume

**Batch of 20 resumes:** ~60-80 seconds
