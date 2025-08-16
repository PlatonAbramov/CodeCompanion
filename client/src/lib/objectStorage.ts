import { apiRequest } from "@/lib/queryClient";

export class ObjectStorageService {
  async getUploadURL(): Promise<string> {
    const response = await apiRequest('/api/objects/upload', {
      method: 'POST',
      body: JSON.stringify({})
    });
    return response.uploadURL;
  }

  async setObjectAclPolicy(rawPath: string, policy: { visibility: 'public' | 'private' }): Promise<string> {
    const response = await apiRequest('/api/objects/acl', {
      method: 'POST',
      body: JSON.stringify({ 
        objectUrl: rawPath,
        ...policy 
      })
    });
    return response.objectPath || rawPath;
  }
}