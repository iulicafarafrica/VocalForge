"""
VocalForge v1.6 - BaseAudioModule
Standard interface for all pipeline modules.
"""

from abc import ABC, abstractmethod


class BaseAudioModule(ABC):
    """
    All modules must inherit this class.
    Required:
      - name (str)
      - supports_chunking (bool)
      - process(track, config, device) -> track
    Optional:
      - initialize(config)
      - cleanup()
    """

    name: str = "BaseModule"
    supports_chunking: bool = False

    def initialize(self, config: dict):
        """Called before first use. Override for lazy loading."""
        pass

    @abstractmethod
    def process(self, track: dict, config: dict, device: str = "cpu") -> dict:
        """
        Process audio track.
        Args:
            track: dict with keys 'audio' (tensor), 'sample_rate', 'metadata'
            config: module-specific config dict
            device: 'cpu' or 'cuda'
        Returns:
            Updated track dict
        """
        pass

    def cleanup(self):
        """Called after processing. Override for GPU cleanup."""
        pass
