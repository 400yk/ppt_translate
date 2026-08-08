"""
Tests for the Content-Disposition header built for S3 and OSS uploads.

Regression context: uploads of "日商拓産概要　20260509最终版.pptx" failed on every
attempt. The filename contains U+3000 IDEOGRAPHIC SPACE, which was passed
literally into the Content-Disposition header. Both storage backends broke on it:

  * S3  - botocore signs header values through `' '.join(value.split())`
          (SigV4Auth._header_value). Python's str.split() treats U+3000 as
          whitespace, so the value that was *signed* differed from the value
          that was *sent*, and AWS rejected the request with
          SignatureDoesNotMatch.
  * OSS - HTTP headers are latin-1; CJK characters raise
          "'latin-1' codec can't encode characters in position 33-39".

These tests pin the two properties the header must have for uploads to work at
all. They fail if anyone reintroduces a raw filename into the header.
"""
import os
import sys
from urllib.parse import unquote

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.storage_utils import build_content_disposition

# The filename from the production failure, plus other names that must keep working.
FILENAME_WITH_IDEOGRAPHIC_SPACE = '日商拓産概要　20260509最终版.pptx'
FILENAME_WITH_ASCII_SPACE = '2024.8.5 UAT问题分类总结.pptx'
FILENAME_PLAIN_ASCII = 'quarterly_review.pptx'


def canonicalize_like_sigv4(value):
    """Reproduce botocore SigV4Auth._header_value, which is what AWS signs."""
    return ' '.join(value.split())


def test_signed_value_matches_sent_value_for_ideographic_space():
    """The exact production regression.

    If canonicalization alters the header, botocore signs something different
    from what it transmits and S3 answers SignatureDoesNotMatch. This assertion
    is the whole reason the upload was failing.
    """
    header = build_content_disposition(FILENAME_WITH_IDEOGRAPHIC_SPACE)
    assert canonicalize_like_sigv4(header) == header


def test_signed_value_matches_sent_value_for_all_filenames():
    for filename in (FILENAME_WITH_IDEOGRAPHIC_SPACE,
                     FILENAME_WITH_ASCII_SPACE,
                     FILENAME_PLAIN_ASCII):
        header = build_content_disposition(filename)
        assert canonicalize_like_sigv4(header) == header, filename


def test_header_is_latin_1_encodable():
    """OSS puts the header straight onto the wire, where only latin-1 is legal."""
    for filename in (FILENAME_WITH_IDEOGRAPHIC_SPACE,
                     FILENAME_WITH_ASCII_SPACE,
                     FILENAME_PLAIN_ASCII):
        build_content_disposition(filename).encode('latin-1')


def test_original_filename_survives_the_round_trip():
    """Encoding must not cost the user their filename on download."""
    for filename in (FILENAME_WITH_IDEOGRAPHIC_SPACE,
                     FILENAME_WITH_ASCII_SPACE,
                     FILENAME_PLAIN_ASCII):
        header = build_content_disposition(filename)
        encoded = header.split("UTF-8''", 1)[1]
        assert unquote(encoded) == filename


def test_quotes_cannot_break_out_of_the_header():
    """A filename must never be able to inject extra header parameters."""
    header = build_content_disposition('evil";attachment;x="y.pptx')
    assert header.count('"') == 0
    assert header.count(';') == 1


if __name__ == '__main__':
    failures = 0
    for name, fn in sorted(globals().items()):
        if name.startswith('test_') and callable(fn):
            try:
                fn()
                print(f'PASS {name}')
            except AssertionError as exc:
                failures += 1
                print(f'FAIL {name}: {exc}')
            except Exception as exc:
                failures += 1
                print(f'ERROR {name}: {type(exc).__name__}: {exc}')
    print(f'\n{"FAILED" if failures else "OK"} ({failures} failing)')
    sys.exit(1 if failures else 0)
