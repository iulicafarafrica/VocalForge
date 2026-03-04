import os
import sys

# 🔥 adaugă root folder în PYTHONPATH
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import torch
import soundfile as sf

from backend.model_loader import load_model


def main():
    print("🔄 Loading model...")
    model = load_model()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"✅ Using device: {device}")

    print("🎵 Generating dummy input...")
    audio_input = torch.randn(1, 44100).to(device)

    print("🚀 Running inference...")
    with torch.no_grad():
        output = model(audio_input)

    print("📦 Output shape:", output.shape)

    audio_np = output.squeeze().detach().cpu().numpy()

    sf.write("output.wav", audio_np, 44100)

    print("✅ Test complet.")
    print("💾 Audio salvat: output.wav")


if __name__ == "__main__":
    main()
