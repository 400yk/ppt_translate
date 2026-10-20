"""Provider configuration and secret-safe diagnostics; no live API calls."""

import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch
from urllib.parse import quote

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

import requests
import services.llm_service as llm


class ConfigurationTests(unittest.TestCase):
    def load_config(self, environment=None, local='', shared=''):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / '.env.local').write_text(local, encoding='utf-8')
            (root / '.env').write_text(shared, encoding='utf-8')
            spec = importlib.util.spec_from_file_location('isolated_config', BACKEND / 'config.py')
            module = importlib.util.module_from_spec(spec)
            # Execute the real config with isolated dotenv files, never user secrets.
            module.__file__ = str(root / 'config.py')
            env = {'UPLOAD_TEMP_DIR': str(root / 'uploads')}
            env.update(environment or {})
            with patch.dict(os.environ, env, clear=True):
                spec.loader.exec_module(module)
                return module, dict(os.environ)

    def test_rotated_process_keys_win_over_both_dotenv_files(self):
        _, env = self.load_config(
            {'GEMINI_API_KEY': 'rotated-google', 'DASHSCOPE_API_KEY': 'rotated-alibaba'},
            local='GEMINI_API_KEY=old-local\nDASHSCOPE_API_KEY=old-local\n',
            shared='GEMINI_API_KEY=old-shared\nDASHSCOPE_API_KEY=old-shared\n',
        )
        self.assertEqual(env['GEMINI_API_KEY'], 'rotated-google')
        self.assertEqual(env['DASHSCOPE_API_KEY'], 'rotated-alibaba')

    def test_local_overrides_shared_and_shared_fills_missing_values(self):
        module, env = self.load_config(
            local='GEMINI_API_KEY=local\nGEMINI_MODEL=local-model\n',
            shared='GEMINI_API_KEY=shared\nGEMINI_MODEL=shared-model\nDASHSCOPE_API_KEY=shared-fallback\n',
        )
        self.assertEqual(env['GEMINI_API_KEY'], 'local')
        self.assertEqual(module.GEMINI_MODEL, 'local-model')
        self.assertEqual(env['DASHSCOPE_API_KEY'], 'shared-fallback')

    def test_empty_process_key_does_not_restore_a_stale_dotenv_key(self):
        _, env = self.load_config(
            {'GEMINI_API_KEY': ''}, local='GEMINI_API_KEY=stale\n',
        )
        self.assertEqual(env['GEMINI_API_KEY'], '')

    def test_custom_models_and_endpoints(self):
        module, _ = self.load_config({
            'GEMINI_MODEL': 'account-model',
            'GEMINI_API_BASE_URL': 'https://gemini.example/v1beta/',
            'DEEPSEEK_MODEL': 'account-fallback',
            'DEEPSEEK_API_URL': 'https://fallback.example/v1/',
        }, local='GEMINI_MODEL=stale-model\n')
        self.assertEqual(module.GEMINI_API_URL,
                         'https://gemini.example/v1beta/models/account-model:generateContent')
        self.assertEqual(module.DEEPSEEK_MODEL, 'account-fallback')
        self.assertEqual(module.DEEPSEEK_API_URL, 'https://fallback.example/v1')

    def test_full_gemini_url_override(self):
        module, _ = self.load_config({
            'GEMINI_MODEL': 'ignored',
            'GEMINI_API_BASE_URL': 'https://ignored.example',
            'GEMINI_API_URL': 'https://gateway.example/custom:generateContent',
        })
        self.assertEqual(module.GEMINI_API_URL, 'https://gateway.example/custom:generateContent')

    def test_database_url_from_dotenv_is_normalized(self):
        module, _ = self.load_config(local='DATABASE_URL=postgres://user:pass@db/app\n')
        self.assertEqual(module.SQLALCHEMY_DATABASE_URI, 'postgresql://user:pass@db/app')

    def test_defaults_do_not_target_retired_models(self):
        module, _ = self.load_config()
        self.assertEqual(module.GEMINI_MODEL, 'gemini-3.1-flash-lite')
        self.assertEqual(module.DEEPSEEK_MODEL, 'deepseek-v4.1-flash-1017')
        self.assertNotIn('gemini-2.0', module.GEMINI_API_URL)


class ProviderRequestTests(unittest.TestCase):
    google_key = 'test-google+/=secret'
    alibaba_key = 'test-alibaba+/=secret'

    def setUp(self):
        self.key_patch = patch.multiple(
            llm, GEMINI_API_KEY=self.google_key, DASHSCOPE_API_KEY=self.alibaba_key,
        )
        self.key_patch.start()
        self.addCleanup(self.key_patch.stop)

    def assert_safe(self, output):
        for secret in (self.google_key, self.alibaba_key):
            self.assertNotIn(secret, output)
            self.assertNotIn(quote(secret, safe=''), output)
        self.assertIn('[REDACTED]', output)

    def test_gemini_uses_configured_url_and_header_without_key_query(self):
        response = Mock()
        response.json.return_value = {
            'candidates': [{'content': {'parts': [{'text': '["你好"]'}]}}],
        }
        with patch.object(llm, 'GEMINI_API_URL', 'https://gemini.example/custom'), \
                patch.object(llm.requests, 'post', return_value=response) as post, \
                contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(llm.gemini_batch_translate(['Hello'], 'en', 'zh'), ['你好'])
        args, kwargs = post.call_args
        self.assertEqual(args[0], 'https://gemini.example/custom')
        self.assertEqual(kwargs['headers']['x-goog-api-key'], self.google_key)
        self.assertNotIn('params', kwargs)
        self.assertNotIn(self.google_key, args[0])
        self.assertNotIn(self.google_key, json.dumps(kwargs['json']))

    def test_gemini_http_errors_redact_urls_and_auth_response_bodies(self):
        for status in (401, 403, 404, 429, 503):
            with self.subTest(status=status):
                response = requests.Response()
                response.status_code = status
                response.url = f'https://gemini.example?key={quote(self.google_key, safe="")}'
                response._content = f'Provider echoed {self.google_key}'.encode()
                response.encoding = 'utf-8'
                output = io.StringIO()
                with patch.object(llm.requests, 'post', return_value=response), \
                        contextlib.redirect_stdout(output):
                    result = llm.gemini_batch_translate(['Hello'], 'en', 'zh', max_retries=0)
                self.assertEqual(result, ['Hello'])
                self.assertIn(str(status), output.getvalue())
                self.assert_safe(output.getvalue())

    def test_gemini_transport_and_unexpected_errors_are_redacted(self):
        for error_type in (requests.ConnectionError, requests.Timeout, RuntimeError):
            with self.subTest(error_type=error_type):
                output = io.StringIO()
                with patch.object(llm.requests, 'post', side_effect=error_type(self.google_key)), \
                        contextlib.redirect_stdout(output):
                    llm.gemini_batch_translate(['Hello'], 'en', 'zh', max_retries=0)
                self.assert_safe(output.getvalue())

    def test_gemini_error_object_is_redacted(self):
        response = Mock()
        response.json.return_value = {'error': {'message': f'API key not valid: {self.google_key}'}}
        output = io.StringIO()
        with patch.object(llm.requests, 'post', return_value=response), \
                contextlib.redirect_stdout(output):
            llm.gemini_batch_translate(['Hello'], 'en', 'zh', max_retries=0)
        self.assert_safe(output.getvalue())

    def test_fallback_uses_configured_model_endpoint_and_key(self):
        client = Mock()
        client.chat.completions.create.return_value = SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content='["你好"]'))],
        )
        with patch.object(llm, 'OPENAI_AVAILABLE', True), \
                patch.object(llm, 'OpenAI', return_value=client, create=True) as factory, \
                patch.object(llm, 'DEEPSEEK_API_URL', 'https://fallback.example/v1'), \
                patch.object(llm, 'DEEPSEEK_MODEL', 'workspace-model'), \
                contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(llm.deepseek_batch_translate(['Hello'], 'en', 'zh'), ['你好'])
        self.assertEqual(factory.call_args.kwargs['base_url'], 'https://fallback.example/v1')
        self.assertEqual(factory.call_args.kwargs['api_key'], self.alibaba_key)
        self.assertEqual(client.chat.completions.create.call_args.kwargs['model'], 'workspace-model')

    def test_fallback_init_and_api_errors_are_redacted(self):
        for during_init in (True, False):
            with self.subTest(during_init=during_init):
                factory = Mock()
                error = RuntimeError(f'model_not_found: {self.alibaba_key} {self.google_key}')
                if during_init:
                    factory.side_effect = error
                else:
                    factory.return_value.chat.completions.create.side_effect = error
                output = io.StringIO()
                with patch.object(llm, 'OPENAI_AVAILABLE', True), \
                        patch.object(llm, 'OpenAI', factory, create=True), \
                        contextlib.redirect_stdout(output):
                    result = llm.deepseek_batch_translate(['Hello'], 'en', 'zh', max_retries=0)
                self.assertEqual(result, ['Hello'])
                self.assertIn('model_not_found', output.getvalue())
                self.assert_safe(output.getvalue())

    def test_old_credential_query_parameters_are_also_redacted(self):
        output = llm._redact_secrets('https://gateway.example?key=old-key&API_KEY=old-other&model=m')
        self.assertNotIn('old-key', output)
        self.assertNotIn('old-other', output)
        self.assertIn('&model=m', output)


if __name__ == '__main__':
    unittest.main()
