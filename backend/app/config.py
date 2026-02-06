import os
from dotenv import load_dotenv
from google import genai

# Load environment variables
load_dotenv()

# Configuration
GOOGLE_GENAI_API_KEY = os.getenv("GOOGLE_GENAI_API_KEY")
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 8000))

# Validate required config
if not GOOGLE_GENAI_API_KEY:
    raise ValueError("GOOGLE_GENAI_API_KEY environment variable is required")

# Initialize Google GenAI client
# Note: The API key must be from Google AI Studio (aistudio.google.com), NOT Google Cloud Console
genai_client = genai.Client(api_key=GOOGLE_GENAI_API_KEY)

# Temp directory for file processing
TEMP_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "temp")
os.makedirs(TEMP_DIR, exist_ok=True)
