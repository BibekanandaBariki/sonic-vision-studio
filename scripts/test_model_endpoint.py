import os
import urllib.request
import urllib.error
import json

def test_pmodel():
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

    # Exact URL from AiService.java
    # "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key="
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={api_key}"
    
    print(f"Testing URL: {url.replace(api_key, 'API_KEY')}")

    data = {
        "contents": [{
            "parts": [{"text": "Hello"}]
        }]
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )

    try:
        with urllib.request.urlopen(req) as response:
            print(f"✅ Status: {response.status}")
            print(response.read().decode())
    except urllib.error.HTTPError as e:
        print(f"❌ Error: {e.code} - {e.reason}")
        print(e.read().decode())

if __name__ == "__main__":
    test_pmodel()
