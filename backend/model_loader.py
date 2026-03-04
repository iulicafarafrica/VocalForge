import torch
from backend.modules.sovits_infer import SoVITSModelWrapper


def load_model():
    device = "cuda" if torch.cuda.is_available() else "cpu"

    model_path = "models/so-vits-svc4.1-Minecraft_villager/G_4000.pth"
    config_path = "models/so-vits-svc4.1-Minecraft_villager/config.json"

    return SoVITSModelWrapper(
        model_path=model_path,
        config_path=config_path,
        device=device
    )
