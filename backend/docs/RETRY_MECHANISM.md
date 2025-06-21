# Translation Retry Mechanism

This document explains the retry mechanism implemented to handle translation failures, particularly those caused by API rate limiting or temporary issues.

## Problem Description

Sometimes translation tasks fail due to:
- **Rate limiting**: The Gemini API returns rate limiting errors (HTTP 429)
- **Temporary API issues**: Network problems, server errors, or API unavailability
- **Low success rates**: API returns successful response but doesn't actually translate content

In the logs, this appears as:
```
Translation summary: 0/78 elements successfully translated
Batch 1: Translation returned original texts (API issues)
```

## Solution Overview

A multi-level retry mechanism has been implemented:

### 1. API-Level Retries (LLM Service)
**Location**: `services/llm_service.py` in `gemini_batch_translate()`

- **Max retries**: 3 attempts per API call
- **Rate limiting delays**: 5s, 15s, 45s (exponential: 5 × 3^attempt)
- **Server error delays**: 1s, 2s, 4s (exponential: 2^attempt)  
- **Low success rate detection**: Retries if < 5% translation success on large batches

### 2. Task-Level Retries (Celery Tasks)
**Location**: `services/tasks.py` in both translation task functions

- **Max retries**: 2 attempts per task (3 total attempts including initial)
- **Retry triggers**: Translation success rate < 10%
- **Retry delays**: 30s, 60s (exponential: 30 × 2^attempt, max 120s)
- **Failure detection**: Compares original vs translated text to calculate success rate

## How It Works

### Step 1: Translation Execution
1. Task receives file and attempts translation
2. Collects original texts for comparison
3. Performs translation via LLM service
4. Re-reads translated file to verify results

### Step 2: Success Rate Calculation
```python
def calculate_translation_rate(original_texts, translated_texts):
    translated_count = sum(1 for orig, trans in zip(original_texts, translated_texts) 
                          if orig != trans)
    return translated_count / len(original_texts)
```

### Step 3: Retry Decision
- If success rate < 10% → Retry entire task
- If success rate ≥ 10% → Consider successful
- Clean up failed files before retry

### Step 4: Exponential Backoff
- **Attempt 1**: Immediate
- **Attempt 2**: Wait 30 seconds  
- **Attempt 3**: Wait 60 seconds (final attempt)

## Configuration

### Celery Task Decorator
```python
@celery_app.task(
    bind=True, 
    autoretry_for=(Exception,), 
    retry_kwargs={'max_retries': 2, 'countdown': 30}, 
    retry_backoff=True
)
```

### Retry Thresholds
- **Task-level failure threshold**: < 10% success rate
- **API-level failure threshold**: < 5% success rate (for large batches > 10 texts)
- **Rate limiting delays**: 5s, 15s, 45s
- **Task retry delays**: 30s, 60s (max 120s)

## Logging

The retry mechanism provides detailed logging:

```
Celery task abc123: Starting translation for user 254, file example.pptx (zh → en) (attempt 2)
Celery task abc123: Translation rate: 8.7% (7/78 texts translated) (zh → en)
Translation failed (zh → en) - only 8.7% of texts were translated (likely due to API rate limiting)
Celery task abc123: Retrying (zh → en) in 60 seconds (attempt 2/2)
```

## Benefits

1. **Automatic recovery** from temporary API issues
2. **Intelligent failure detection** based on actual translation success
3. **Respectful rate limiting** with appropriate delays
4. **Multi-level approach** catches failures at both API and task levels
5. **Resource cleanup** prevents accumulation of failed translation files
6. **User visibility** through enhanced logging and result metadata

## Result Metadata

Successful tasks now return additional information:
```json
{
    "status": "SUCCESS",
    "message": "File translated successfully.",
    "translation_rate": 0.85,
    "texts_translated": 66,
    "total_texts": 78,
    ...
}
```

This allows the frontend to display translation quality information to users.

## Monitoring

Monitor retry behavior by watching for these log patterns:
- `Rate limiting (HTTP 429)` - API rate limits
- `Very low translation success rate` - API returning non-translated content
- `Translation failed - only X% of texts were translated` - Task-level retries
- `Retrying in X seconds` - Active retry in progress 