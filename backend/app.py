import os
import tempfile
from flask import Flask, request, send_file, jsonify
from pptx import Presentation
import requests
import ast  # Added for safe eval fallback
from dotenv import load_dotenv
from pptx.util import Pt
from pptx_utils import measure_text_bbox, fit_font_size_to_bbox

# Import API routes to register them
import api

# Load Gemini API key from .env
load_dotenv()
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

from flask_cors import CORS
app = Flask(__name__)
CORS(app)

def gemini_batch_translate(texts, src_lang, dest_lang):
    """Batch translate a list of texts using Gemini API."""
    # Join texts as a JSON list to preserve order and mapping
    import json
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
            raise Exception(f"Gemini API error: {result['error']['message']}")
        else:
            raise Exception("Unexpected Gemini API response")
    except Exception as e:
        print(f"Gemini translation error: {e}")
        return texts  # fallback to original

def translate_pptx(input_stream, src_lang, dest_lang):
    prs = Presentation(input_stream)
    text_shapes = []
    texts = []
    # Collect all text shapes and their texts
    for slide in prs.slides:
        for shape in slide.shapes:
            if hasattr(shape, "text") and shape.text.strip():
                text_shapes.append(shape)
                texts.append(shape.text)
    # Batch translate
    translated_texts = gemini_batch_translate(texts, src_lang, dest_lang)
    print(f"Collected {len(texts)} texts from PPTX.")
    print(f"Received {len(translated_texts)} translated texts.")
    print(f"Sample original: {texts[:3]}")
    print(f"Sample translated: {translated_texts[:3]}")
    for shape, translated in zip(text_shapes, translated_texts):
        if hasattr(shape, "text_frame") and hasattr(shape.text_frame, "text"):
            text_frame = shape.text_frame
            # Get original font properties from the first run (if available)
            if text_frame.paragraphs and text_frame.paragraphs[0].runs:
                run = text_frame.paragraphs[0].runs[0]
                font_name = run.font.name or "Arial"
                original_font_size = int(run.font.size.pt) if run.font.size else 18
            else:
                font_name = "Arial"
                original_font_size = 18
            # Measure the bounding box of the original text
            original_text = shape.text
            orig_w, orig_h = measure_text_bbox(original_text, font_name, original_font_size)
            # Find the font size for the translated text so its bounding box matches the original
            best_font_size = fit_font_size_to_bbox(orig_w, orig_h, translated, font_name, original_font_size)
            text_frame.clear()
            p = text_frame.paragraphs[0]
            run = p.add_run()
            run.text = translated
            run.font.name = font_name
            run.font.size = Pt(best_font_size)
        else:
            shape.text = translated
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pptx')
    prs.save(temp_file.name)
    temp_file.close()
    return temp_file.name

if __name__ == '__main__':
    app.run(debug=True)
