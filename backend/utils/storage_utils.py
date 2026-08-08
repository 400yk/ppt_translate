"""
Shared helpers for the S3 and OSS storage services.
"""

from urllib.parse import quote


def build_content_disposition(original_filename):
    """
    Build a Content-Disposition header that is safe to put on the wire.

    A non-ASCII filename must never appear literally in a header value:

      * botocore signs header values through `' '.join(value.split())`
        (SigV4Auth._header_value). Python treats U+3000 IDEOGRAPHIC SPACE and
        friends as whitespace, so a filename containing one is signed
        differently from how it is sent and S3 rejects the upload with
        SignatureDoesNotMatch.
      * Alicloud OSS writes the header directly, and HTTP headers are latin-1,
        so any CJK character raises a UnicodeEncodeError.

    RFC 5987 percent-encoding keeps the header pure ASCII and free of
    whitespace, while browsers still restore the original name on download.

    Args:
        original_filename: The filename to offer the user on download

    Returns:
        A Content-Disposition header value
    """
    return "attachment; filename*=UTF-8''" + quote(original_filename, safe='')
