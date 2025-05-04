# from flask import request, jsonify, send_file
# from app import app, translate_pptx

# @app.route('/translate', methods=['POST'])
# def translate():
#     if 'file' not in request.files:
#         return jsonify({'error': 'No file uploaded'}), 400
#     file = request.files['file']
#     src_lang = request.form.get('src_lang', 'zh')
#     dest_lang = request.form.get('dest_lang', 'en')
#     translated_pptx_path = translate_pptx(file, src_lang, dest_lang)
#     return send_file(translated_pptx_path, as_attachment=True, download_name='translated.pptx')
