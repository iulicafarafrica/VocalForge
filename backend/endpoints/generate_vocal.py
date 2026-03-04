from fastapi import APIRouter, UploadFile, Form
from endpoints.utils import safe_execute, process_vocal

router = APIRouter()

@router.post("/generate_vocal")
async def generate_vocal(
    file: UploadFile,
    mode: str = Form("light"),
    seed: int = Form(None)
):
    output_path, metadata = safe_execute(process_vocal, file, mode, seed)
    duration = 10 if mode == "preview" else None
    return {
        "output_path": output_path,
        "metadata": metadata,
        "duration_seconds": duration,
        "execution_device": metadata.get("device", "cpu")
    }
