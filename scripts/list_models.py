import os
import urllib.request
import json

def list_models():
    env_path = os.path.join(os.path.dirname(__file__), '../backend/.env')
    api_key = None
    
    with open(env_path, 'r') as f:
        for line in f:
            if line.strip().startswith('GEMINI_API_KEY='):
                api_key = line.strip().split('=', 1)[1]
                break

    if not api_key:
        print("❌ No API Key found")
        return

    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    
    print(f"Listing Models URL: {url.replace(api_key, 'API_KEY')}")

    try:
        with urllib.request.urlopen(url) as response:
            data = json.loads(response.read().decode())
            print("✅ Available Models:")
            for m in data.get('models', []):
                # Filter for generateContent support
                if "generateContent" in m.get('supportedGenerationMethods', []):
                    print(f" - {m['name']}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    list_models()
