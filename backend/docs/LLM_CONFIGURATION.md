# Translation provider configuration

Configure these variables in the runtime environment of **both the backend API
and every Celery worker**. They are backend secrets, not `NEXT_PUBLIC_*` settings
or frontend build arguments.

```dotenv
GEMINI_API_KEY=<new Google Gemini API key>
GEMINI_MODEL=gemini-3.1-flash-lite
GEMINI_API_BASE_URL=https://generativelanguage.googleapis.com/v1beta

DASHSCOPE_API_KEY=<Alibaba Model Studio key for your workspace and region>
DEEPSEEK_API_URL=https://YOUR_WORKSPACE_ID.cn-beijing.maas.aliyuncs.com/compatible-mode/v1
DEEPSEEK_MODEL=deepseek-v4.1-flash-1017
```

The model IDs above are the defaults. The example targets the confirmed Beijing
region. Replace `YOUR_WORKSPACE_ID` with the business workspace ID from your Model
Studio console, and ensure the key has model access in that workspace. Set
`DEEPSEEK_API_URL` explicitly: the legacy code default remains
`https://dashscope.aliyuncs.com/compatible-mode/v1` for existing installations.
Other regions require their own console-provided base URL.

The selected DeepSeek model is served directly by Alibaba Cloud. Ensure the
Beijing workspace and its API key have access to this model.

## Cost and availability checked October 20, 2026

- `gemini-3.1-flash-lite`: standard text requests cost $0.25 per million input
  tokens and $1.50 per million output tokens. Google's current model page lists
  the stable model; its announced shutdown is May 7, 2027. This is the cheapest
  generally available Gemini text model for new projects in the standard pricing
  table. The cheaper 2.5 Flash-Lite is restricted to prior active users.
- `deepseek-v4.1-flash-1017`: the cheapest currently listed full DeepSeek model
  in Alibaba Cloud's own Beijing inference service, tied with the
  `deepseek-v4.1-flash` alias. Beijing prices per million tokens are CNY 2 input /
  8 output during busy hours and CNY 1 input / 4 output during idle hours
  (22:00-08:00 UTC+8). Alibaba documents Chat Completions support for this model.
  Free distilled R1 trial models are excluded from this production choice because
  trial access is limited. Reasoning and retries can change the actual total.

These are synchronous API prices, excluding cache discounts and temporary free
quotas. Output prices include reasoning tokens; actual cost depends on token
usage. These checks confirm provider listings, not access for a particular key.
No live account check was possible locally because neither key was set in the
process environment.

Sources: [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing),
[Gemini lifecycle](https://ai.google.dev/gemini-api/docs/deprecations),
[Alibaba pricing](https://www.alibabacloud.com/help/en/model-studio/model-pricing),
[Beijing pricing](https://help.aliyun.com/zh/model-studio/model-pricing),
[Alibaba DeepSeek API](https://www.alibabacloud.com/help/en/model-studio/deepseek-api).

`DEEPSEEK_API_URL` is the **base URL**, without `/chat/completions`.
`DASHSCOPE_API_KEY` remains the fallback credential variable; this integration
does not read `DEEPSEEK_API_KEY` or `OPENAI_API_KEY`. A key issued directly by
DeepSeek is not an Alibaba DashScope key.

For Gemini, the app builds
`<GEMINI_API_BASE_URL>/models/<GEMINI_MODEL>:generateContent`. Use a bare model ID
without `models/`. For a gateway requiring a full URL, optionally set
`GEMINI_API_URL`. A nonempty full URL overrides **both** `GEMINI_API_BASE_URL`
and `GEMINI_MODEL`; remove stale full-URL overrides before changing the model.
Gemini gateways must accept the generateContent request format and the
`x-goog-api-key` header. Keep credentials out of all endpoint URLs.

## Environment precedence and rotation

Values are loaded in this order, with existing values preserved:

1. Process environment supplied by the deployment platform.
2. `backend/.env.local` for variables not already set.
3. `backend/.env` for remaining variables.

An explicitly empty process variable also takes precedence. Empty API keys
disable that provider; empty model or endpoint settings use the defaults.
Production environment variables therefore cannot be overwritten by an old
dotenv key. Dotenv files belong in the backend directory, regardless of the
process working directory.

When rotating keys or changing a model/endpoint:

1. Update the runtime variables on both services, and remove stale dotenv
   credentials/full-URL overrides where applicable.
2. Redeploy or recreate the API and every worker with the new environment. A
   container restart alone may retain its old environment. Values are read when
   Python imports the modules, so running workers do not hot-reload changes.
3. Run a small translation and check provider status codes. Exercise the fallback
   separately in staging to verify its endpoint, model and key together.
4. Revoke the old key once the replacement works. The previously pasted logs
   contained a Gemini key; that key should be replaced.

Gemini authentication now uses a header rather than a `?key=` query parameter.
Provider errors redact the configured keys and credential query parameters,
including when an exception or response body echoes them. Avoid enabling HTTP
wire/header debug logging in production.

No provider calls are required by the regression tests:

```bash
python -m unittest discover -s backend/tests -p test_llm_configuration.py -v
```

Provider references (model availability changes over time):

- [Gemini models and deprecations](https://ai.google.dev/gemini-api/docs/deprecations)
- [Gemini API key authentication](https://ai.google.dev/gemini-api/docs/api-key)
- [Alibaba DeepSeek API and endpoints](https://www.alibabacloud.com/help/en/model-studio/deepseek-api)
- [Alibaba model-not-found troubleshooting](https://www.alibabacloud.com/help/en/model-studio/error-code)
