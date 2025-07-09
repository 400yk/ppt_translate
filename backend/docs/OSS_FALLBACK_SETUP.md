# OSS Fallback Setup Guide

This guide explains how to set up Alicloud OSS as a fallback for S3 uploads.

## Overview

The system now automatically falls back to Alicloud OSS when S3 uploads fail after retries. This provides redundancy and ensures files are always uploaded successfully.

## Setup Steps

### 1. Create Alicloud OSS Bucket

1. Log into Alicloud Console
2. Navigate to Object Storage Service (OSS)
3. Create a new bucket (e.g., `translide-backup`)
4. Set appropriate permissions for read/write access
5. Note the bucket name and endpoint URL

### 2. Create Access Keys

1. In Alicloud Console, go to RAM (Resource Access Management)
2. Create a new user with programmatic access
3. Attach OSS policies (e.g., `AliyunOSSFullAccess`)
4. Generate Access Key ID and Secret
5. Save the credentials securely

### 3. Set Environment Variables

Add these environment variables to your deployment:

```bash
# Alicloud OSS Configuration
ALICLOUD_OSS_ACCESS_KEY_ID=your_access_key_id
ALICLOUD_OSS_ACCESS_KEY_SECRET=your_access_key_secret
ALICLOUD_OSS_BUCKET_NAME=translide-backup
ALICLOUD_OSS_ENDPOINT=https://oss-us-east-1.aliyuncs.com
ALICLOUD_OSS_REGION=us-east-1
```

### 4. Install Dependencies

The `oss2` library is already added to `requirements.txt`:

```bash
pip install oss2==2.18.4
```

### 5. Test the Setup

Use the test script to verify everything works:

```bash
python test_oss_fallback.py
```

## How It Works

1. **Primary Upload**: System tries to upload to S3 first
2. **S3 Retry**: If S3 fails, it retries up to 3 times with progressive delays
3. **OSS Fallback**: If S3 still fails, it automatically tries OSS
4. **OSS Retry**: OSS also has retry logic with progressive delays
5. **Success**: If either succeeds, the file is available for download

## Enhanced Retry Mechanism

Both S3 and OSS services now include comprehensive retry mechanisms:

### Upload Operations:
- **3 retry attempts** with progressive delays: 5s, 15s, 30s
- **Retryable errors**: SignatureDoesNotMatch, RequestTimeout, ServiceUnavailable, InternalError, RequestTimeTooSkewed, SlowDown, TooManyRequests, Throttling, OperationAborted, BadGateway, ServiceError, NetworkError, ConnectionTimeout, SocketTimeout, TemporaryRedirect

### URL Generation Operations:
- **3 retry attempts** with progressive delays: 2s, 5s, 10s (faster for URLs)
- **Retryable errors**: Core connectivity and signature errors optimized for URL operations

### Delete Operations:
- **3 retry attempts** with progressive delays: 2s, 5s, 10s  
- **Smart handling**: NoSuchKey treated as success (already deleted)
- **Non-retryable errors**: AccessDenied, NoSuchBucket (permanent failures)

### Test Retry Mechanism:
```bash
# Test OSS retry mechanism specifically
python test_oss_retry.py

# Test S3 retry mechanism
python test_s3_retry.py
```

## Monitoring

The system logs show which service was used:

```
Celery task 123: File uploaded to S3: translations/file.pptx
# or
Celery task 123: File uploaded to OSS: translations/file.pptx
```

## Regional Considerations

### Recommended OSS Regions:
- **US East**: `oss-us-east-1.aliyuncs.com`
- **US West**: `oss-us-west-1.aliyuncs.com`
- **Asia Pacific**: `oss-ap-southeast-1.aliyuncs.com`
- **Europe**: `oss-eu-central-1.aliyuncs.com`

Choose the region closest to your users for better performance.

## Security Best Practices

1. **Separate Credentials**: Use different credentials for S3 and OSS
2. **Minimal Permissions**: Grant only necessary permissions
3. **Rotation**: Regularly rotate access keys
4. **Monitoring**: Monitor usage and access patterns

## Troubleshooting

### Common Issues:

1. **OSS not available**: Check credentials and network connectivity
2. **Bucket not found**: Verify bucket name and region
3. **Access denied**: Check IAM permissions
4. **Network timeout**: Adjust retry settings

### Debug Commands:

```bash
# Test OSS connectivity
python test_oss_fallback.py

# Test with specific file
python test_oss_fallback.py /path/to/file.pptx

# Check configuration
python -c "import config; print(config.USE_OSS_STORAGE)"
```

## Cost Considerations

- **S3**: Primary storage, higher cost but better integration
- **OSS**: Fallback storage, typically lower cost
- **Transfer**: Cross-region transfers may incur additional costs

## Maintenance

1. **Monitor Usage**: Track which service is used more frequently
2. **Update Dependencies**: Keep `oss2` library updated
3. **Performance**: Monitor upload times and success rates
4. **Cleanup**: Periodically clean up old files from both services

## API Response Changes

The API now returns additional fields:

```json
{
  "storage_type": "s3" | "oss" | "local",
  "storage_key": "translations/file.pptx",
  "download_url": "https://...",
  "s3_key": "translations/file.pptx"  // for backward compatibility
}
```

## Production Checklist

- [ ] OSS bucket created and configured
- [ ] Access keys generated with proper permissions
- [ ] Environment variables set in production
- [ ] Dependencies installed (`oss2`)
- [ ] Test script runs successfully
- [ ] Monitoring and alerts configured
- [ ] Backup and recovery procedures documented

## Support

For issues with:
- **S3**: Check AWS documentation and service status
- **OSS**: Check Alicloud documentation and service status
- **Integration**: Review application logs and test scripts 