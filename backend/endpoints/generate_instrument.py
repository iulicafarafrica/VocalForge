from fastapi import APIRouter, UploadFile, Form
from endpoints.utils import safe_execute, process_instrument

router = APIRouter()

@router.post("/generate_instrument")
async def generate_instrument(
    file: UploadFile,
    instrument: str = Form(...),
    mode: str = Form("light")
):
    output_path, metadata = safe_execute(process_instrument, file, instrument, mode)
    return {
        "output_path": output_path,
        "metadata": metadata,
        "execution_device": metadata.get("device", "cpu")
    }
