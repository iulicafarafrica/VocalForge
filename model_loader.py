import torch.nn as nn

class DummyModel(nn.Module):
    def forward(self, x):
        return x

def load_model():
    return DummyModel()
