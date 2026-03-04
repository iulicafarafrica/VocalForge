import torch
import numpy as np
from scipy.signal.windows import hann


class SVCChunkEngine:

    def __init__(self, model, device="cuda", precision="fp16"):
        self.model = model
        self.device = device
        self.use_fp16 = precision == "fp16"
        self.prev_rms = None

    def _rms(self, x):
        return np.sqrt(np.mean(x ** 2) + 1e-8)

    def _create_window(self, chunk_samples, overlap_samples):
        window = np.ones(chunk_samples)

        if overlap_samples > 0:
            fade = hann(overlap_samples * 2)
            fade_in = fade[:overlap_samples]
            fade_out = fade[overlap_samples:]
            window[:overlap_samples] *= fade_in
            window[-overlap_samples:] *= fade_out

        return window

    def process(self, audio, sr, chunk_sec=6, overlap_ms=50):

        # Detect mono / stereo
        if len(audio.shape) == 1:
            audio = audio[:, np.newaxis]  # convert to (samples, 1)

        num_channels = audio.shape[1]

        chunk_samples = int(chunk_sec * sr)
        overlap_samples = int((overlap_ms / 1000) * sr)
        step = chunk_samples - overlap_samples

        total_samples = audio.shape[0]

        final_output = np.zeros((total_samples + chunk_samples, num_channels))
        normalization = np.zeros((total_samples + chunk_samples, num_channels))

        window = self._create_window(chunk_samples, overlap_samples)

        position = 0

        while position < total_samples:

            chunk = audio[position:position + chunk_samples]

            if chunk.shape[0] < chunk_samples:
                pad_size = chunk_samples - chunk.shape[0]
                pad = np.zeros((pad_size, num_channels))
                chunk = np.vstack((chunk, pad))

            # Procesăm fiecare canal separat
            processed_chunk = np.zeros_like(chunk)

            for ch in range(num_channels):

                chunk_tensor = torch.tensor(chunk[:, ch], dtype=torch.float32).to(self.device)

                with torch.amp.autocast("cuda", enabled=self.use_fp16):
                    with torch.no_grad():
                        output_tensor = self.model(chunk_tensor.unsqueeze(0))

                output = output_tensor.squeeze().detach().cpu().numpy()

                # RMS leveling
                current_rms = self._rms(output)

                if self.prev_rms is not None:
                    gain = self.prev_rms / (current_rms + 1e-8)
                    gain = np.clip(gain, 0.95, 1.05)
                    output *= gain

                self.prev_rms = self._rms(output)

                output *= window

                processed_chunk[:, ch] = output

            start = position
            end = position + chunk_samples

            final_output[start:end] += processed_chunk
            normalization[start:end] += window[:, np.newaxis]

            position += step

        normalization[normalization == 0] = 1.0
        final_output /= normalization

        final_output = final_output[:total_samples]

        final_output = np.clip(final_output, -1.0, 1.0)

        if self.device == "cuda":
            torch.cuda.empty_cache()

        # Dacă era mono inițial, revenim la mono
        if final_output.shape[1] == 1:
            final_output = final_output[:, 0]

        return final_output
