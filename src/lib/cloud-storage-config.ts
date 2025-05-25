/**
 * Configuration for cloud storage providers that use pre-signed URLs
 * and should not receive additional authorization headers
 */

export interface CloudStorageProvider {
  name: string;
  domains: string[];
  description: string;
}

export const CLOUD_STORAGE_PROVIDERS: CloudStorageProvider[] = [
  {
    name: 'AWS S3',
    domains: [
      's3.amazonaws.com',
      's3-',  // Covers regional endpoints like s3-us-west-2.amazonaws.com
    ],
    description: 'Amazon Web Services S3 storage'
  },
  {
    name: 'Alibaba Cloud OSS',
    domains: [
      'oss-cn-',      // China regions
      'oss-us-',      // US regions  
      'oss-eu-',      // Europe regions
      'oss-ap-',      // Asia Pacific regions
      'oss-me-',      // Middle East regions
      '.aliyuncs.com' // General Alibaba Cloud domain
    ],
    description: 'Alibaba Cloud Object Storage Service'
  },
  {
    name: 'Azure Blob Storage',
    domains: [
      'blob.core.windows.net',
      'blob.core.chinacloudapi.cn',  // Azure China
      'blob.core.cloudapi.de',       // Azure Germany
      'blob.core.usgovcloudapi.net'  // Azure Government
    ],
    description: 'Microsoft Azure Blob Storage'
  },
  {
    name: 'Google Cloud Storage',
    domains: [
      'storage.googleapis.com',
      'storage.cloud.google.com'
    ],
    description: 'Google Cloud Platform Storage'
  },
  {
    name: 'DigitalOcean Spaces',
    domains: [
      'digitaloceanspaces.com',
      'cdn.digitaloceanspaces.com'
    ],
    description: 'DigitalOcean Spaces object storage'
  },
  {
    name: 'Cloudflare R2',
    domains: [
      'r2.cloudflarestorage.com'
    ],
    description: 'Cloudflare R2 object storage'
  },
  {
    name: 'Wasabi',
    domains: [
      'wasabisys.com'
    ],
    description: 'Wasabi hot cloud storage'
  },
  {
    name: 'Backblaze B2',
    domains: [
      'backblazeb2.com',
      'f000.backblazeb2.com',  // Example bucket domain
      'f001.backblazeb2.com',  // Example bucket domain
      'f002.backblazeb2.com'   // Example bucket domain
    ],
    description: 'Backblaze B2 cloud storage'
  },
  {
    name: 'MinIO',
    domains: [
      // MinIO is self-hosted, so domains vary
      // Users can add their custom MinIO domains here
    ],
    description: 'MinIO self-hosted object storage'
  }
];

/**
 * Get all cloud storage domains as a flat array
 */
export const getAllCloudStorageDomains = (): string[] => {
  return CLOUD_STORAGE_PROVIDERS.flatMap(provider => provider.domains);
};

/**
 * Check if a URL belongs to a cloud storage service
 */
export const isCloudStorageUrl = (url: string): boolean => {
  if (!url) return false;
  
  const domains = getAllCloudStorageDomains();
  return domains.some(domain => 
    url.toLowerCase().includes(domain.toLowerCase())
  );
};

/**
 * Add a custom cloud storage domain (useful for self-hosted solutions)
 */
export const addCustomCloudStorageDomain = (domain: string, providerName: string = 'Custom'): void => {
  const existingProvider = CLOUD_STORAGE_PROVIDERS.find(p => p.name === providerName);
  
  if (existingProvider) {
    if (!existingProvider.domains.includes(domain)) {
      existingProvider.domains.push(domain);
    }
  } else {
    CLOUD_STORAGE_PROVIDERS.push({
      name: providerName,
      domains: [domain],
      description: 'Custom cloud storage provider'
    });
  }
};

/**
 * Example usage for adding custom domains:
 * 
 * // For Alibaba Cloud OSS with custom domain
 * addCustomCloudStorageDomain('my-bucket.oss-cn-hangzhou.aliyuncs.com', 'Alibaba Cloud OSS');
 * 
 * // For self-hosted MinIO
 * addCustomCloudStorageDomain('minio.mycompany.com', 'MinIO');
 * 
 * // For custom CDN domain pointing to cloud storage
 * addCustomCloudStorageDomain('cdn.myapp.com', 'Custom CDN');
 * 
 * // For Tencent Cloud COS
 * addCustomCloudStorageDomain('cos.ap-beijing.myqcloud.com', 'Tencent Cloud COS');
 * 
 * // For Huawei Cloud OBS
 * addCustomCloudStorageDomain('obs.cn-north-1.myhuaweicloud.com', 'Huawei Cloud OBS');
 */ 