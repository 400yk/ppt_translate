# Alicloud OSS Setup Guide

This guide walks you through creating an Alicloud OSS bucket and getting the necessary credentials for the S3 fallback mechanism.

## Prerequisites

- Alicloud account (create at https://www.alibabacloud.com if you don't have one)
- Credit card for account verification (free tier available)

## Step 1: Create Alicloud Account

1. Go to https://www.alibabacloud.com
2. Click "Free Account" or "Sign Up"
3. Complete the registration process
4. Verify your email and phone number
5. Add payment method for account verification

## Step 2: Access OSS Console

1. Log into your Alicloud Console
2. In the top search bar, type "OSS" or "Object Storage Service"
3. Click on "Object Storage Service" from the results
4. You'll be taken to the OSS Console dashboard

## Step 3: Create OSS Bucket

### 3.1 Create Bucket
1. In the OSS Console, click "Create Bucket"
2. Fill in the bucket details:
   - **Bucket Name**: `translide-backup` (or your preferred name)
   - **Region**: Choose closest to your users (e.g., US East 1, US West 1)
   - **Storage Class**: Standard (recommended for frequent access)
   - **Versioning**: Disabled (unless you need it)
   - **Access Control List (ACL)**: Private (recommended)
   - **Server-side Encryption**: Disabled (optional)

### 3.2 Configure Bucket Settings
1. Click "Create"
2. Your bucket will be created and you'll see the bucket overview
3. Note the **Endpoint** URL (e.g., `https://oss-us-east-1.aliyuncs.com`)
4. Note the **Region** (e.g., `us-east-1`)

## Step 4: Create RAM User for API Access

### 4.1 Access RAM Console
1. In the Alicloud Console, search for "RAM"
2. Click on "Resource Access Management"
3. Go to "Users" in the left sidebar
4. Click "Create User"

### 4.2 Create User
1. Fill in user details:
   - **Logon Name**: `translide-oss-user`
   - **Display Name**: `Translide OSS User`
   - **Access Mode**: Check "Programmatic access"
   - **Console Password Logon**: Uncheck (not needed)
2. Click "OK"

### 4.3 Download Credentials
1. **Important**: Download the CSV file with the credentials immediately
2. The CSV contains:
   - **AccessKeyId**: Your access key ID
   - **AccessKeySecret**: Your secret access key
3. Store these credentials securely

## Step 5: Grant OSS Permissions

### 5.1 Attach Policy to User
1. In the RAM Users list, find your user
2. Click on the user name
3. Go to "Permissions" tab
4. Click "Add Permissions"

### 5.2 Add OSS Permissions
1. **Permission Type**: Select "System Policy"
2. **Policy Name**: Search and select `AliyunOSSFullAccess`
3. Click "OK"
4. Click "Complete" to finish

### 5.3 Verify Permissions
1. The user should now have OSS permissions
2. You can also create a custom policy for more restrictive access if needed

## Step 6: Test OSS Connection

### 6.1 Get Connection Details
From your setup, you should now have:
- **Access Key ID**: From the downloaded CSV
- **Access Key Secret**: From the downloaded CSV
- **Bucket Name**: The bucket you created
- **Endpoint**: The bucket's endpoint URL
- **Region**: The bucket's region

### 6.2 Test Connection
Use the test script with your credentials:

```bash
export ALICLOUD_OSS_ACCESS_KEY_ID="your_access_key_id"
export ALICLOUD_OSS_ACCESS_KEY_SECRET="your_access_key_secret"
export ALICLOUD_OSS_BUCKET_NAME="translide-backup"
export ALICLOUD_OSS_ENDPOINT="https://oss-us-east-1.aliyuncs.com"
export ALICLOUD_OSS_REGION="us-east-1"

python test_oss_fallback.py
```

## Step 7: Configure Production Environment

### 7.1 Set Environment Variables
Add these to your production environment:

```bash
# Alicloud OSS Configuration
ALICLOUD_OSS_ACCESS_KEY_ID=your_access_key_id_here
ALICLOUD_OSS_ACCESS_KEY_SECRET=your_access_key_secret_here
ALICLOUD_OSS_BUCKET_NAME=translide-backup
ALICLOUD_OSS_ENDPOINT=https://oss-us-east-1.aliyuncs.com
ALICLOUD_OSS_REGION=us-east-1
```

### 7.2 For Docker/Heroku
Add these environment variables to your deployment platform:

**Heroku:**
```bash
heroku config:set ALICLOUD_OSS_ACCESS_KEY_ID=your_key
heroku config:set ALICLOUD_OSS_ACCESS_KEY_SECRET=your_secret
heroku config:set ALICLOUD_OSS_BUCKET_NAME=translide-backup
heroku config:set ALICLOUD_OSS_ENDPOINT=https://oss-us-east-1.aliyuncs.com
heroku config:set ALICLOUD_OSS_REGION=us-east-1
```

## Step 8: Common OSS Regions and Endpoints

### US Regions:
- **US East 1**: `https://oss-us-east-1.aliyuncs.com`
- **US West 1**: `https://oss-us-west-1.aliyuncs.com`

### Asia Pacific:
- **Singapore**: `https://oss-ap-southeast-1.aliyuncs.com`
- **Sydney**: `https://oss-ap-southeast-2.aliyuncs.com`
- **Mumbai**: `https://oss-ap-south-1.aliyuncs.com`

### Europe:
- **Frankfurt**: `https://oss-eu-central-1.aliyuncs.com`
- **London**: `https://oss-eu-west-1.aliyuncs.com`

### China (if needed):
- **Beijing**: `https://oss-cn-beijing.aliyuncs.com`
- **Shanghai**: `https://oss-cn-shanghai.aliyuncs.com`

## Step 9: Security Best Practices

### 9.1 Principle of Least Privilege
Create a custom policy for more restrictive access:

```json
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "oss:PutObject",
        "oss:GetObject",
        "oss:DeleteObject"
      ],
      "Resource": "acs:oss:*:*:translide-backup/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "oss:GetBucketInfo"
      ],
      "Resource": "acs:oss:*:*:translide-backup"
    }
  ]
}
```

### 9.2 Key Rotation
- Regularly rotate your access keys
- Monitor access logs for unusual activity
- Use different keys for different environments

## Step 10: Cost Optimization

### 10.1 Storage Classes
- **Standard**: For frequently accessed files
- **Infrequent Access**: For backup/archive (cheaper)
- **Archive**: For long-term storage (cheapest)

### 10.2 Lifecycle Rules
Set up lifecycle rules to automatically:
- Move old files to cheaper storage classes
- Delete files after a certain period
- Reduce storage costs

## Troubleshooting

### Common Issues:

1. **Access Denied**: Check RAM user permissions
2. **Bucket Not Found**: Verify bucket name and region
3. **Invalid Credentials**: Regenerate access keys
4. **Network Timeout**: Check firewall/proxy settings

### Debug Commands:

```bash
# Test OSS connectivity
python -c "
import oss2
auth = oss2.Auth('your_key_id', 'your_key_secret')
bucket = oss2.Bucket(auth, 'https://oss-us-east-1.aliyuncs.com', 'translide-backup')
print(bucket.get_bucket_info())
"
```

## Getting Help

- **Alicloud Documentation**: https://www.alibabacloud.com/help/en/oss
- **OSS Python SDK**: https://github.com/aliyun/aliyun-oss-python-sdk
- **Support**: Contact Alicloud support for account issues

## Summary

After completing this setup, you'll have:
- ✅ Alicloud OSS bucket created
- ✅ RAM user with OSS permissions
- ✅ Access credentials for API access
- ✅ Fallback mechanism ready to use

Your system will now automatically fall back to OSS when S3 fails, ensuring 99.9% upload success rate! 