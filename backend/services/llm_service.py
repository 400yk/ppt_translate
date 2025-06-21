import os
import requests
import json
import ast  # For safe eval fallback
import re  # Move re import to module level
import time  # Add for retry delays
from config import GEMINI_API_URL, GEMINI_API_BATCH_SIZE, GEMINI_API_CHARACTER_BATCH_SIZE

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

def clean_json_response(json_str):
    """
    Clean up common JSON issues in Gemini's response, especially invalid escape sequences.
    """
    # Remove any surrounding whitespace
    cleaned = json_str.strip()
    
    # Remove code block markers if present
    if cleaned.startswith('```'):
        cleaned = cleaned.strip().lstrip('`').lstrip('json').strip()
        if cleaned.endswith('```'):
            cleaned = cleaned[:cleaned.rfind('```')].strip()
    
    # Handle repetitive text patterns that indicate Gemini got stuck in a loop
    def remove_repetitive_patterns(text):
        import re
        # Look for patterns where the same text is repeated many times
        # This handles cases like "かもしれないかもしれないかもしれない..."
        
        # Find patterns where 6+ character sequences repeat 5+ times
        pattern = r'(.{6,}?)\1{4,}'
        
        def replace_repetition(match):
            repeated_text = match.group(1)
            # Keep only 2 repetitions maximum
            return repeated_text * 2
        
        return re.sub(pattern, replace_repetition, text)
    
    # Fix unterminated strings by ensuring proper JSON array closure
    def fix_unterminated_strings(text):
        # If the text appears to be cut off in the middle of a string, try to fix it
        if text.startswith('[') and not text.rstrip().endswith(']'):
            # Count open quotes to see if we're in an unterminated string
            quote_count = 0
            last_string_start = -1
            
            for i, char in enumerate(text):
                if char == '"' and (i == 0 or text[i-1] != '\\'):
                    if quote_count % 2 == 0:
                        last_string_start = i
                    quote_count += 1
            
            # If we have an odd number of quotes, we have an unterminated string
            if quote_count % 2 == 1 and last_string_start != -1:
                # Find the last complete string before the unterminated one
                text = text[:last_string_start].rstrip().rstrip(',')
                if not text.endswith(']'):
                    text += ']'
        
        return text
    
    # Fix common invalid escape sequences
    def fix_escape_sequences(text):
        result = []
        i = 0
        while i < len(text):
            if text[i] == '\\' and i + 1 < len(text):
                next_char = text[i + 1]
                
                # Check if it's a valid escape sequence
                if next_char in '"\\\/bfnrt':
                    # Valid escape sequence, keep as is
                    result.append(text[i:i+2])
                    i += 2
                elif next_char == 'u':
                    # Handle unicode sequences - check if we have exactly 4 hex digits
                    if i + 5 < len(text) and all(c in '0123456789abcdefABCDEF' for c in text[i+2:i+6]):
                        # Valid unicode escape sequence
                        result.append(text[i:i+6])
                        i += 6
                    else:
                        # Invalid unicode sequence, escape the backslash
                        result.append('\\\\')
                        i += 1
                elif next_char.isdigit() or next_char.lower() in 'abcdef':
                    # Handle sequences like \3092 or \304c - these are likely meant to be unicode
                    # Look ahead to see if we have exactly 4 characters that could be hex digits
                    if i + 4 < len(text):
                        hex_candidate = text[i+1:i+5]
                        
                        # Check if it's exactly 4 characters and all are valid hex digits
                        # This catches cases like \3092, \306e, \3044, \307e, \304c from the errors
                        if len(hex_candidate) == 4 and all(c in '0123456789abcdefABCDEF' for c in hex_candidate):
                            # Convert to proper unicode escape sequence
                            result.append(f'\\u{hex_candidate}')
                            i += 5
                        else:
                            # Not a 4-digit hex pattern, escape the backslash
                            result.append('\\\\')
                            i += 1
                    else:
                        # Not enough characters left, escape the backslash
                        result.append('\\\\')
                        i += 1
                else:
                    # Any other invalid escape sequence, escape the backslash
                    result.append('\\\\')
                    i += 1
            else:
                result.append(text[i])
                i += 1
        return ''.join(result)
    
    # Apply all cleaning steps
    cleaned = remove_repetitive_patterns(cleaned)
    cleaned = fix_unterminated_strings(cleaned)
    cleaned = fix_escape_sequences(cleaned)
    
    # Remove trailing commas before ] or }
    cleaned = re.sub(r',(\s*[}\]])', r'\1', cleaned)
    
    # Final validation - ensure we have a properly formed JSON array
    if cleaned.startswith('[') and not cleaned.endswith(']'):
        cleaned += ']'
    
    return cleaned

def gemini_batch_translate(texts, src_lang, dest_lang, max_retries=3):
    """Batch translate a list of texts using Gemini API with retry logic for temporary errors."""
    # Check if API key is available
    if not GEMINI_API_KEY:
        print("ERROR: Missing Gemini API key. Translation will return original text.")
        return texts
    
    # Store original count for validation
    original_count = len(texts)
    
    # Join texts as a JSON list to preserve order and mapping
    joined = json.dumps(texts, ensure_ascii=False)
    prompt = f"""Translate the following JSON array from {src_lang} to {dest_lang}. 

IMPORTANT INSTRUCTIONS:
1. Return ONLY a valid JSON array, no explanations or extra text
2. Preserve the exact number of elements in the array ({original_count} elements)
3. Maintain the exact same order as the input array
4. Properly escape all quotes and special characters in the JSON strings
5. Do not add any markdown formatting or code blocks
6. If you cannot translate a specific element, return the original text for that element

Input JSON array:
{joined}

Output (valid JSON array with exactly {original_count} elements):"""
    headers = {
        'Content-Type': 'application/json',
    }
    params = {
        'key': GEMINI_API_KEY
    }
    data = {
        'contents': [{
            'parts': [{
                'text': prompt
            }]
        }],
        'generationConfig': {
            'temperature': 0.1,  # Lower temperature for more consistent output
            'maxOutputTokens': 8192,
            'topP': 0.8,
            'topK': 10
        }
    }
    
    def build_position_mapped_result(translated_list, original_texts):
        """
        Build result array with position-perfect mapping.
        For each position i: use translated[i] if valid, otherwise use original[i]
        """
        result = []
        
        for i in range(len(original_texts)):
            # Check if we have a translation for this position
            if (isinstance(translated_list, list) and 
                i < len(translated_list) and 
                translated_list[i] is not None and 
                isinstance(translated_list[i], str) and 
                translated_list[i].strip() != ""):
                
                # Use the translated text
                result.append(translated_list[i])
                if i == 0:  # Log first few successful translations
                    print(f"Position {i}: '{original_texts[i][:50]}...' -> '{translated_list[i][:50]}...'")
            else:
                # Use original text as fallback
                result.append(original_texts[i])
                if i < 3:  # Log first few fallbacks
                    print(f"Position {i}: Using original text (translation failed/missing)")
        
        # Validate final result
        if len(result) != len(original_texts):
            print(f"ERROR: Result length mismatch! Expected {len(original_texts)}, got {len(result)}")
            return original_texts
        
        translated_count = sum(1 for i in range(len(result)) if result[i] != original_texts[i])
        print(f"Translation summary: {translated_count}/{len(original_texts)} elements successfully translated")
        
        return result
    
    # Retry logic for temporary errors
    for attempt in range(max_retries + 1):  # 0, 1, 2, 3 (total of 4 attempts)
        try:
            resp = requests.post(GEMINI_API_URL, headers=headers, params=params, json=data, timeout=60)
            resp.raise_for_status()
            result = resp.json()
            
            if 'candidates' in result and result['candidates']:
                translated_json = result['candidates'][0]['content']['parts'][0]['text']
                
                # Clean the JSON response to handle common issues
                cleaned_json = clean_json_response(translated_json)
                
                                    # Try to parse the cleaned JSON
                try:
                    parsed_result = json.loads(cleaned_json)
                    final_result = build_position_mapped_result(parsed_result, texts)
                    
                    # Check if the translation actually did anything (not just returned original texts due to API issues)
                    translation_success_count = sum(1 for orig, trans in zip(texts, final_result) if orig != trans)
                    translation_success_rate = translation_success_count / len(texts) if texts else 0
                    
                    # If translation success rate is extremely low (< 5%), it might be an API issue
                    # But only retry if we haven't exhausted retries and we're getting a response
                    if translation_success_rate < 0.05 and len(texts) > 10 and attempt < max_retries:
                        print(f"Very low translation success rate ({translation_success_rate:.1%}) on attempt {attempt + 1}, might be API issues")
                        delay = 2 ** attempt
                        print(f"Retrying in {delay}s due to suspected API issues...")
                        time.sleep(delay)
                        continue
                    
                    return final_result
                except Exception as e:
                    print(f"Error parsing cleaned Gemini JSON: {e}")
                    print(f"Cleaned JSON sample: {cleaned_json[:200]}...")
                    
                    # Try additional fallback methods
                    try:
                        # Extract individual string elements from the array using regex
                        if cleaned_json.startswith('[') and cleaned_json.endswith(']'):
                            # More sophisticated regex to extract strings from JSON array
                            pattern = r'"((?:[^"\\]|\\.)*)"|\'((?:[^\'\\]|\\.)*)\''
                            matches = re.findall(pattern, cleaned_json)
                            
                            if matches:
                                # Extract the actual string content
                                extracted_strings = []
                                for match in matches:
                                    # Each match is a tuple, get the first non-empty group
                                    string_content = match[0] if match[0] else match[1]
                                    # Unescape the string content
                                    string_content = string_content.replace('\\"', '"').replace("\\'", "'").replace('\\\\', '\\')
                                    extracted_strings.append(string_content)
                                
                                print(f"Regex extraction: Found {len(extracted_strings)} strings for {len(texts)} inputs")
                                final_result = build_position_mapped_result(extracted_strings, texts)
                                return final_result
                        
                        # Try ast.literal_eval as a fallback
                        parsed_result = ast.literal_eval(cleaned_json)
                        final_result = build_position_mapped_result(parsed_result, texts)
                        return final_result
                        
                    except Exception as e2:
                        print(f"All JSON parsing methods failed: {e2}")
                        print(f"Falling back to original texts to maintain position mapping")
                        return texts
                        
            elif 'error' in result:
                error_msg = result.get('error', {}).get('message', 'Unknown error')
                print(f"Gemini API error: {error_msg}")
                
                # Special handling for auth errors - don't retry these
                if 'API key not valid' in error_msg or '403' in error_msg:
                    print("Authentication error: Please check your Gemini API key.")
                    return texts
                
                # For other API errors, treat as temporary and retry
                if attempt < max_retries:
                    delay = 2 ** attempt  # Exponential backoff: 1s, 2s, 4s
                    print(f"API error on attempt {attempt + 1}/{max_retries + 1}, retrying in {delay}s...")
                    time.sleep(delay)
                    continue
                else:
                    print("Max retries exceeded for API error, returning original texts")
                    return texts
            else:
                # Unexpected response format, treat as temporary error
                if attempt < max_retries:
                    delay = 2 ** attempt
                    print(f"Unexpected response on attempt {attempt + 1}/{max_retries + 1}, retrying in {delay}s...")
                    time.sleep(delay)
                    continue
                else:
                    print("Max retries exceeded for unexpected response, returning original texts")
                    return texts
                    
        except requests.exceptions.HTTPError as e:
            status_code = e.response.status_code
            
            # Don't retry authentication errors
            if status_code == 403:
                print(f"Gemini API authentication error (403 Forbidden): Please check your API key.")
                print(f"API Response: {e.response.text}")
                return texts
            
            # Retry on temporary server errors (5xx) and rate limiting (429)
            if status_code in [429, 502, 503, 504] and attempt < max_retries:
                # Use longer delays for rate limiting (429) vs other server errors
                if status_code == 429:
                    # For rate limiting, use longer delays: 5s, 15s, 45s
                    delay = 5 * (3 ** attempt)
                    print(f"Rate limiting (HTTP {status_code}) on attempt {attempt + 1}/{max_retries + 1}, retrying in {delay}s...")
                else:
                    # For other server errors, use shorter delays: 1s, 2s, 4s
                    delay = 2 ** attempt
                    print(f"Server error (HTTP {status_code}) on attempt {attempt + 1}/{max_retries + 1}, retrying in {delay}s...")
                time.sleep(delay)
                continue
            else:
                print(f"Gemini HTTP error: {e}")
                return texts
                
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
            # Retry on connection issues
            if attempt < max_retries:
                delay = 2 ** attempt
                print(f"Connection error on attempt {attempt + 1}/{max_retries + 1}, retrying in {delay}s...")
                time.sleep(delay)
                continue
            else:
                print(f"Gemini connection error: {e}")
                return texts
                
        except Exception as e:
            # For unexpected errors, don't retry
            print(f"Gemini translation error: {e}")
            return texts
    
    # Final fallback - always return same length with original texts
    print("All attempts failed, returning original texts to maintain position mapping")
    return texts

def gemini_batch_translate_with_size(texts, src_lang, dest_lang, batch_size=GEMINI_API_BATCH_SIZE, character_batch_size=GEMINI_API_CHARACTER_BATCH_SIZE):
    """
    Translate texts in smaller batches to handle very long files.
    Each batch is processed independently - if one fails, others continue.
    
    Args:
        texts: List of texts to translate
        src_lang: Source language
        dest_lang: Target language
        batch_size: Maximum number of texts to process in each batch, defaults to GEMINI_API_BATCH_SIZE
        character_batch_size: Maximum number of characters to process in each batch
        
    Returns:
        List of translated texts in the same order as input, with failed batches using original text
    """
    if not texts:
        return [], 0
    
    all_translated = []
    total_characters = sum(len(text) for text in texts)
    batch_start = 0
    batch_number = 0
    successful_batches = 0
    failed_batches = 0
    
    while batch_start < len(texts):
        batch_number += 1
        
        # Start with an empty batch
        current_batch = []
        current_batch_chars = 0
        current_batch_count = 0
        
        # Keep adding texts until we hit either the character limit or text count limit
        for i in range(batch_start, len(texts)):
            text = texts[i]
            text_chars = len(text)
            
            # Check if adding this text would exceed the character limit
            if current_batch_chars + text_chars > character_batch_size:
                # If this is the first text in the batch and it's too big on its own,
                # we still need to process it (we'll just exceed the limit for this one item)
                if current_batch_count == 0:
                    current_batch.append(text)
                    current_batch_chars += text_chars
                    current_batch_count += 1
                break
            
            # Check if adding this text would exceed the count limit
            if current_batch_count >= batch_size:
                break
                
            # Add the text to the current batch
            current_batch.append(text)
            current_batch_chars += text_chars
            current_batch_count += 1
        
        # If we didn't add any texts (shouldn't happen due to the "first text" logic above)
        if not current_batch:
            print(f"ERROR: Empty batch encountered at position {batch_start}, breaking")
            break
        
        # Store the original batch for fallback
        original_batch = current_batch[:]
        
        # Process the current batch with error handling
        print(f"Processing batch {batch_number}: {len(current_batch)} texts, {current_batch_chars} characters")
        
        try:
            translated_batch = gemini_batch_translate(current_batch, src_lang, dest_lang)
            
            # Validate the translated batch
            if (isinstance(translated_batch, list) and 
                len(translated_batch) == len(current_batch)):
                
                # Check if this is actually a successful translation or just fallback
                translation_success = False
                for i, (orig, trans) in enumerate(zip(current_batch, translated_batch)):
                    if orig != trans:  # At least one element was translated
                        translation_success = True
                        break
                
                if translation_success:
                    print(f"Batch {batch_number}: Translation successful")
                    successful_batches += 1
                else:
                    print(f"Batch {batch_number}: Translation returned original texts (API issues)")
                    failed_batches += 1
                
                all_translated.extend(translated_batch)
                
            else:
                # Translation returned wrong format/length
                print(f"Batch {batch_number}: Translation returned invalid format, using original texts")
                print(f"Expected {len(current_batch)} elements, got {len(translated_batch) if isinstance(translated_batch, list) else 'non-list'}")
                failed_batches += 1
                all_translated.extend(original_batch)
                
        except Exception as e:
            # Catch any unexpected errors in batch processing
            print(f"Batch {batch_number}: Unexpected error during translation: {e}")
            print(f"Using original texts for this batch and continuing with next batch")
            failed_batches += 1
            all_translated.extend(original_batch)
        
        # Update the batch start for the next iteration
        batch_start += len(current_batch)
        
        # Add a small delay between batches to avoid rate limiting
        if batch_start < len(texts):
            time.sleep(1)
    
    # Final validation
    if len(all_translated) != len(texts):
        print(f"ERROR: Final result length mismatch! Expected {len(texts)}, got {len(all_translated)}")
        print(f"Falling back to original texts to maintain data integrity")
        return texts, total_characters
    
    # Summary
    total_batches = successful_batches + failed_batches
    success_rate = (successful_batches / total_batches * 100) if total_batches > 0 else 0
    
    print(f"Batch processing complete:")
    print(f"  Total batches: {total_batches}")
    print(f"  Successful: {successful_batches}")
    print(f"  Failed: {failed_batches}")
    print(f"  Success rate: {success_rate:.1f}%")
    
    # Count actual translations vs original texts
    translated_elements = sum(1 for i in range(len(texts)) if texts[i] != all_translated[i])
    translation_rate = (translated_elements / len(texts) * 100) if len(texts) > 0 else 0
    print(f"  Elements translated: {translated_elements}/{len(texts)} ({translation_rate:.1f}%)")
    
    return all_translated, total_characters 