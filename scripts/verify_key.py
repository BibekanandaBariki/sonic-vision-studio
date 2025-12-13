import os
import urllib.request
import urllib.error
import json

def test_key():
    env_path = os.path.join(os.path.dirname(__file__), '../backend/.env')
    api_key = None
    
    # 1. Read API Key
    try:
        with open(env_path, 'r') as f:
            for line in f:
                if line.strip().startswith('GEMINI_API_KEY='):
                    api_key = line.strip().split('=', 1)[1]
                    break
    except FileNotFoundError:
        print(f"❌ Error: {env_path} not found.")
        return

    if not api_key:
        print("❌ Error: GEMINI_API_KEY not found in backend/.env")
        return

    print(f"🔑 Found API Key: {api_key[:4]}...{api_key[-4:]}")

    # 2. Test Key against Gemini API
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    
    try:
        with urllib.request.urlopen(url) as response:
            if response.status == 200:
                data = json.loads(response.read().decode())
                print("\n✅ SUCCESS! The API Key is valid.")
                print(f"   Connected to Gemini API. Found {len(data.get('models', []))} models.")
            else:
                print(f"\n❌ Failed with status: {response.status}")
    except urllib.error.HTTPError as e:
        print(f"\n❌ API Error: {e.code} - {e.reason}")
        try:
            error_body = e.read().decode()
            print(f"   Details: {error_body}")
        except:
            pass
        print("   Your API Key might be invalid, restricted, or has no quota.")
    except Exception as e:
        print(f"\n❌ Connection Error: {e}")

if __name__ == "__main__":
    test_key()
