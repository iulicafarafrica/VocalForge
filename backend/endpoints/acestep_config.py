"""ACE-Step API configuration."""
import os

# ACE-Step API endpoint
ACE_STEP_API = os.getenv("ACE_STEP_API", "http://localhost:8001")

# API key for authentication (empty = no auth required)
ACE_STEP_API_KEY = os.getenv("ACESTEP_API_KEY", "")

# Output directory
OUTPUT_DIR = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "output"
)

# Ensure output directory exists
os.makedirs(OUTPUT_DIR, exist_ok=True)
