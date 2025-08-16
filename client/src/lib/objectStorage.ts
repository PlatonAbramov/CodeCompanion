import { apiRequest } from "@/lib/queryClient";

export class ObjectStorageService {
  async getUploadURL(): Promise<string> {
    try {
      const response = await apiRequest('/api/objects/upload', {
        method: 'POST'
      });
      const data = await response.json();
      console.log('Upload URL response:', data);
      if (!data.uploadURL) {
        throw new Error('No upload URL received from server');
      }
      return data.uploadURL;
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
      const data = await response.json();
      console.log('ACL policy response:', data);
      return data.objectPath || rawPath;
    } catch (error) {
      console.error('Failed to set ACL policy:', error);
      throw error;
    }
  }
}