import os
import requests
import json
import ast  # For safe eval fallback
from config import GEMINI_API_URL

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

def gemini_batch_translate(texts, src_lang, dest_lang):
    """Batch translate a list of texts using Gemini API."""
    # Check if API key is available
    if not GEMINI_API_KEY:
        print("ERROR: Missing Gemini API key. Translation will return original text.")
        return texts
        
    # Join texts as a JSON list to preserve order and mapping
    joined = json.dumps(texts, ensure_ascii=False)
    prompt = f"Translate the following JSON list from {src_lang} to {dest_lang}. Only return the translated JSON list, no explanations.\n{joined}"
    headers = {
        'Content-Type': 'application/json',
    }
    params = {
        'key': GEMINI_API_KEY
    }
    data = {
        'contents': [{
            'parts': [{
                # Instruct Gemini to return a strict JSON array
                'text': prompt + "\nReturn the result strictly as a JSON array (not a Python list), no extra text."
            }]
        }]
    }
    try:
        resp = requests.post(GEMINI_API_URL, headers=headers, params=params, json=data, timeout=60)
        resp.raise_for_status()
        result = resp.json()
        if 'candidates' in result and result['candidates']:
            translated_json = result['candidates'][0]['content']['parts'][0]['text']
            # Strip code block markers from Gemini response
            if translated_json.strip().startswith('```'):
                translated_json = translated_json.strip().lstrip('`').lstrip('json').strip()
                if translated_json.endswith('```'):
                    translated_json = translated_json[:translated_json.rfind('```')].strip()
            # Try to parse the JSON list from Gemini's response
            try:
                return json.loads(translated_json)
            except Exception as e:
                print(f"Error parsing Gemini JSON: {e}\nRaw: {translated_json}")
                # Try ast.literal_eval as a fallback for Python-style lists
                try:
                    return ast.literal_eval(translated_json)
                except Exception as e2:
                    print(f"Fallback ast.literal_eval failed: {e2}\nRaw: {translated_json}")
                    return texts  # fallback
        elif 'error' in result:
            error_msg = result.get('error', {}).get('message', 'Unknown error')
            print(f"Gemini API error: {error_msg}")
            
            # Special handling for auth errors
            if 'API key not valid' in error_msg or '403' in error_msg:
                print("Authentication error: Please check your Gemini API key.")
            
            raise Exception(f"Gemini API error: {error_msg}")
        else:
            raise Exception("Unexpected Gemini API response")
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 403:
            print(f"Gemini API authentication error (403 Forbidden): Please check your API key.")
            print(f"API Response: {e.response.text}")
        else:
            print(f"Gemini HTTP error: {e}")
        return texts  # fallback to original
    except Exception as e:
        print(f"Gemini translation error: {e}")
        return texts  # fallback to original 