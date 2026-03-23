import requests
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

def list_models():
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    try:
        resp = requests.get(url)
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            models = resp.json().get("models", [])
            for m in models:
                print(f"Name: {m['name']} - Methods: {m['supportedGenerationMethods']}")
        else:
            print(f"Error: {resp.text}")
    except Exception as e:
        print(f"Failed - {e}")

if __name__ == "__main__":
    list_models()
