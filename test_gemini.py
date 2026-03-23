import requests
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

def test_model(model):
    # Use v1beta (v1 is also available for stable models)
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    payload = {"contents": [{"parts": [{"text": "Say hello only."}]}]}
    try:
        resp = requests.post(url, json=payload)
        print(f"Model {model}: {resp.status_code}")
        if resp.status_code != 200:
            print(f"Error: {resp.text}")
        else:
            print(f"Response: {resp.json().get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', 'N/A').strip()}")
    except Exception as e:
        print(f"Model {model}: Failed - {e}")

if __name__ == "__main__":
    test_model("gemini-1.5-flash")
    test_model("gemini-2.0-flash")
    test_model("gemini-2.0-flash-lite-preview-02-05")
