import os
from dotenv import load_dotenv
from google import genai

# Load environment variables
load_dotenv()

# Configuration
GOOGLE_GENAI_API_KEY = os.getenv("GOOGLE_GENAI_API_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

# Text generation provider: "claude" or "gemini"
# Switch this to change ALL text gen calls at once
TEXT_PROVIDER = os.getenv("TEXT_PROVIDER", "claude")

HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 8000))

# CORS: comma-separated origins, e.g. "https://myapp.vercel.app,http://localhost:3000"
CORS_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")
    if o.strip()
]

# Validate required config
if not GOOGLE_GENAI_API_KEY:
    raise ValueError("GOOGLE_GENAI_API_KEY environment variable is required")

# Initialize Google GenAI client
# Note: The API key must be from Google AI Studio (aistudio.google.com), NOT Google Cloud Console
genai_client = genai.Client(api_key=GOOGLE_GENAI_API_KEY)

# Temp directory for file processing
TEMP_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "temp")
os.makedirs(TEMP_DIR, exist_ok=True)
