#!/usr/bin/env python3
"""
Extract email translations from frontend locale files and create backend locale files.
This script should be run whenever frontend translations are updated.
"""

import json
import os
from pathlib import Path

def extract_email_translations():
    """Extract email translations from frontend and create backend locale files."""
    
    # Paths
    frontend_locale_dir = Path(__file__).parent.parent.parent / 'src' / 'locale'
    backend_locale_dir = Path(__file__).parent.parent / 'locale'
    
    # Create backend locale directory if it doesn't exist
    backend_locale_dir.mkdir(exist_ok=True)
    
    # Supported languages
    languages = ['en', 'zh', 'zh_hk', 'es', 'fr', 'de', 'ja', 'ko', 'ru']
    
    for lang in languages:
        frontend_file = frontend_locale_dir / f'{lang}.json'
        backend_file = backend_locale_dir / f'{lang}.json'
        
        if not frontend_file.exists():
            print(f"Warning: {frontend_file} does not exist, skipping...")
            continue
        
        try:
            # Load frontend translations
            with open(frontend_file, 'r', encoding='utf-8') as f:
                frontend_data = json.load(f)
            
            # Extract email-related translations
            backend_data = {
                'email': {}
            }
            
            # Copy email section if it exists
            if 'email' in frontend_data:
                backend_data['email'] = frontend_data['email']
            
            # Add password reset translations if not present
            if 'reset_password' not in backend_data['email']:
                if lang == 'en':
                    backend_data['email']['reset_password'] = {
                        'subject': 'Reset your password - Translide',
                        'welcome_title': 'Password Reset Request',
                        'hello': 'Hello {username}!',
                        'reset_intro': 'We received a request to reset your password for your Translide account.',
                        'button_text': 'Reset Password',
                        'button_fallback': 'If the button doesn\'t work, you can copy and paste this link into your browser:',
                        'expires_note': 'This link will expire in 1 hour.',
                        'ignore_note': 'If you didn\'t request a password reset, you can safely ignore this email.',
                        'footer_copyright': '© 2025 Translide. All rights reserved.'
                    }
                elif lang == 'zh':
                    backend_data['email']['reset_password'] = {
                        'subject': '重置您的密码 - 幻翻',
                        'welcome_title': '密码重置请求',
                        'hello': '你好 {username}！',
                        'reset_intro': '我们收到了重置您幻翻账户密码的请求。',
                        'button_text': '重置密码',
                        'button_fallback': '如果按钮不起作用，您可以复制并粘贴此链接到您的浏览器：',
                        'expires_note': '此链接将在1小时后过期。',
                        'ignore_note': '如果您没有请求密码重置，您可以安全地忽略此邮件。',
                        'footer_copyright': '© 2025 幻翻。保留所有权利。'
                    }
                elif lang == 'zh_hk':
                    backend_data['email']['reset_password'] = {
                        'subject': '重置您的密碼 - 幻翻',
                        'welcome_title': '密碼重置請求',
                        'hello': '你好 {username}！',
                        'reset_intro': '我們收到了重置您幻翻帳戶密碼的請求。',
                        'button_text': '重置密碼',
                        'button_fallback': '如果按鈕不起作用，您可以複製並貼上此連結到您的瀏覽器：',
                        'expires_note': '此連結將在1小時後過期。',
                        'ignore_note': '如果您沒有請求密碼重置，您可以安全地忽略此郵件。',
                        'footer_copyright': '© 2025 幻翻。保留所有權利。'
                    }
                elif lang == 'es':
                    backend_data['email']['reset_password'] = {
                        'subject': 'Restablece tu contraseña - Translide',
                        'welcome_title': 'Solicitud de restablecimiento de contraseña',
                        'hello': '¡Hola {username}!',
                        'reset_intro': 'Recibimos una solicitud para restablecer tu contraseña de Translide.',
                        'button_text': 'Restablecer Contraseña',
                        'button_fallback': 'Si el botón no funciona, puedes copiar y pegar este enlace en tu navegador:',
                        'expires_note': 'Este enlace expirará en 1 hora.',
                        'ignore_note': 'Si no solicitaste restablecer tu contraseña, puedes ignorar este correo.',
                        'footer_copyright': '© 2025 Translide. Todos los derechos reservados.'
                    }
                elif lang == 'fr':
                    backend_data['email']['reset_password'] = {
                        'subject': 'Réinitialisez votre mot de passe - Translide',
                        'welcome_title': 'Demande de réinitialisation de mot de passe',
                        'hello': 'Bonjour {username} !',
                        'reset_intro': 'Nous avons reçu une demande de réinitialisation de votre mot de passe Translide.',
                        'button_text': 'Réinitialiser le mot de passe',
                        'button_fallback': 'Si le bouton ne fonctionne pas, vous pouvez copier et coller ce lien dans votre navigateur :',
                        'expires_note': 'Ce lien expirera dans 1 heure.',
                        'ignore_note': 'Si vous n\'avez pas demandé de réinitialisation, vous pouvez ignorer cet e-mail.',
                        'footer_copyright': '© 2025 Translide. Tous droits réservés.'
                    }
                elif lang == 'de':
                    backend_data['email']['reset_password'] = {
                        'subject': 'Passwort zurücksetzen - Translide',
                        'welcome_title': 'Passwort-Zurücksetzungsanfrage',
                        'hello': 'Hallo {username}!',
                        'reset_intro': 'Wir haben eine Anfrage erhalten, Ihr Translide-Passwort zurückzusetzen.',
                        'button_text': 'Passwort zurücksetzen',
                        'button_fallback': 'Wenn der Button nicht funktioniert, können Sie diesen Link in Ihren Browser kopieren:',
                        'expires_note': 'Dieser Link läuft in 1 Stunde ab.',
                        'ignore_note': 'Wenn Sie keine Passwort-Zurücksetzung angefordert haben, können Sie diese E-Mail ignorieren.',
                        'footer_copyright': '© 2025 Translide. Alle Rechte vorbehalten.'
                    }
                elif lang == 'ja':
                    backend_data['email']['reset_password'] = {
                        'subject': 'パスワードをリセット - Translide',
                        'welcome_title': 'パスワードリセットリクエスト',
                        'hello': 'こんにちは {username} さん！',
                        'reset_intro': 'Translideアカウントのパスワードリセットのリクエストを受け取りました。',
                        'button_text': 'パスワードをリセット',
                        'button_fallback': 'ボタンが機能しない場合、このリンクをブラウザにコピーして貼り付けてください：',
                        'expires_note': 'このリンクは1時間で期限切れになります。',
                        'ignore_note': 'パスワードリセットをリクエストしていない場合は、このメールを無視してください。',
                        'footer_copyright': '© 2025 Translide. 無断転載禁止。'
                    }
                elif lang == 'ko':
                    backend_data['email']['reset_password'] = {
                        'subject': '비밀번호 재설정 - Translide',
                        'welcome_title': '비밀번호 재설정 요청',
                        'hello': '안녕하세요 {username}님!',
                        'reset_intro': 'Translide 계정의 비밀번호 재설정 요청을 받았습니다.',
                        'button_text': '비밀번호 재설정',
                        'button_fallback': '버튼이 작동하지 않으면 이 링크를 브라우저에 복사하여 붙여넣으세요:',
                        'expires_note': '이 링크는 1시간 후에 만료됩니다.',
                        'ignore_note': '비밀번호 재설정을 요청하지 않았다면 이 이메일을 무시하셔도 됩니다.',
                        'footer_copyright': '© 2025 Translide. 모든 권리 보유.'
                    }
                elif lang == 'ru':
                    backend_data['email']['reset_password'] = {
                        'subject': 'Сброс пароля - Translide',
                        'welcome_title': 'Запрос на сброс пароля',
                        'hello': 'Привет {username}!',
                        'reset_intro': 'Мы получили запрос на сброс пароля вашей учетной записи Translide.',
                        'button_text': 'Сбросить пароль',
                        'button_fallback': 'Если кнопка не работает, вы можете скопировать и вставить эту ссылку в браузер:',
                        'expires_note': 'Эта ссылка истекает через 1 час.',
                        'ignore_note': 'Если вы не запрашивали сброс пароля, вы можете безопасно игнорировать это письмо.',
                        'footer_copyright': '© 2025 Translide. Все права защищены.'
                    }
            
            # Save backend translations
            with open(backend_file, 'w', encoding='utf-8') as f:
                json.dump(backend_data, f, indent=2, ensure_ascii=False)
            
            print(f"✅ Created {backend_file}")
            
        except Exception as e:
            print(f"❌ Error processing {lang}: {e}")
    
    print("\n🎉 Email translation extraction complete!")
    print(f"📁 Backend locale files created in: {backend_locale_dir}")

if __name__ == '__main__':
    extract_email_translations() 