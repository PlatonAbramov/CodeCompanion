import { apiRequest } from "@/lib/queryClient";

export class ObjectStorageService {
  async getUploadURL(): Promise<string> {
    try {
      const response = await apiRequest('/api/objects/upload', {
        method: 'POST',
        body: JSON.stringify({})
      });
      console.log('Upload URL response:', response);
      return response.uploadURL;
    } catch (error) {
      console.error('Failed to get upload URL:', error);
      throw error;
    }
  }

  async setObjectAclPolicy(rawPath: string, policy: { visibility: 'public' | 'private' }): Promise<string> {
    try {
      const response = await apiRequest('/api/objects/acl', {
        method: 'POST',
        body: JSON.stringify({ 
          objectUrl: rawPath,
          ...policy 
        })
      });
      console.log('ACL policy response:', response);
      return response.objectPath || rawPath;
    } catch (error) {
      console.error('Failed to set ACL policy:', error);
      throw error;
    }
  }
}