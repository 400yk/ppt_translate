# DeepSeek Fallback for Translation

## Overview

The translation service now includes a fallback mechanism that automatically uses DeepSeek-V3 when Gemini translation fails. This ensures higher reliability and availability of the translation service.

## How It Works

### Translation Flow

1. **Primary Translation**: The system first attempts to translate using Gemini API
2. **Fallback Trigger**: If Gemini fails due to:
   - HTTP 503 Service Unavailable errors
   - Other server errors
   - API returning original texts (indicating API issues)
   - Invalid response format
3. **Fallback Translation**: The system automatically tries DeepSeek-V3 as a fallback
4. **Result**: The system uses whichever translation was successful

### Fallback Scenarios

The DeepSeek fallback is triggered in the following cases:

1. **HTTP Errors**: When Gemini returns HTTP 503 or other server errors
2. **API Response Issues**: When Gemini returns malformed responses
3. **Translation Failures**: When Gemini returns mostly original texts (indicating API problems)
4. **Timeout Errors**: When Gemini requests timeout

## Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
# Gemini API (Primary)
GEMINI_API_KEY=your_gemini_api_key_here

# DeepSeek API (Fallback)
DASHSCOPE_API_KEY=your_dashscope_api_key_here
```

### API Settings

The following settings are configured in `config.py`:

```python
# DeepSeek API settings (fallback for Gemini)
DEEPSEEK_API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1'
DEEPSEEK_MODEL = 'deepseek-r1'
DEEPSEEK_API_CHARACTER_BATCH_SIZE = 15000  # Conservative batch size
DEEPSEEK_API_BATCH_SIZE = 30  # Conservative batch size
```

## Dependencies

The fallback mechanism requires the OpenAI library:

```bash
pip install openai==1.55.3
```

This is included in the updated `requirements.txt`.

## Logging

The system provides detailed logging to track which translation service is used:

```
Processing batch 1: 10 texts, 1500 characters
Batch 1: Gemini translation error: 503 Server Error: Service Unavailable
Trying DeepSeek fallback for batch 1...
DeepSeek Position 0: 'Hello world' -> '你好世界'
DeepSeek translation summary: 10/10 elements successfully translated
Batch 1: DeepSeek fallback translation successful
```

## Error Handling

### Graceful Degradation

- If both Gemini and DeepSeek fail, the system returns original texts
- Each batch is processed independently - if one batch fails, others continue
- The system maintains data integrity by preserving array positions

### Retry Logic

- Both Gemini and DeepSeek have built-in retry mechanisms
- Exponential backoff is used for temporary server errors
- Non-retryable errors (auth failures) are handled appropriately

## Performance Considerations

### Batch Sizes

- DeepSeek uses smaller batch sizes (30 texts, 15k characters) for stability
- Gemini uses larger batch sizes (50 texts, 20k characters) for efficiency
- The system automatically adjusts batch sizes based on the active service

### Latency

- Fallback adds minimal latency when Gemini is working normally
- When fallback is triggered, there's additional latency for the DeepSeek call
- Overall system reliability is improved despite potential latency increase

## API Key Setup

### Getting DeepSeek API Key

1. Visit [Alibaba Cloud Model Studio](https://help.aliyun.com/zh/model-studio/developer-reference/get-api-key)
2. Create an account and get your API key
3. Add the key to your environment variables as `DASHSCOPE_API_KEY`

### API Key Priority

- If `DASHSCOPE_API_KEY` is missing, fallback is disabled
- If `GEMINI_API_KEY` is missing, the system will try DeepSeek directly
- Both keys are recommended for maximum reliability

## Testing

### Manual Testing

You can test the fallback mechanism by:

1. Temporarily removing `GEMINI_API_KEY` from environment
2. Running a translation to see DeepSeek work directly
3. Restoring `GEMINI_API_KEY` and simulating API failures

### Monitoring

Watch the logs for:
- Fallback trigger events
- Translation success rates
- API error patterns
- Performance metrics

## Benefits

1. **Higher Availability**: System continues working even when Gemini has issues
2. **Improved Reliability**: Automatic fallback reduces service disruptions
3. **Better User Experience**: Users don't experience translation failures
4. **Diverse API Coverage**: Reduces dependency on a single translation provider
5. **Graceful Degradation**: System maintains functionality under various failure scenarios 