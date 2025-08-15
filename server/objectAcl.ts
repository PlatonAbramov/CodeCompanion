import { File } from "@google-cloud/storage";

const ACL_POLICY_METADATA_KEY = "custom:aclPolicy";

// The type of the access group.
export enum ObjectAccessGroupType {
  USER_LIST = "USER_LIST",
  EMAIL_DOMAIN = "EMAIL_DOMAIN",
}

// The logic user group that can access the object.
export interface ObjectAccessGroup {
  type: ObjectAccessGroupType;
  id: string;
}

export enum ObjectPermission {
  READ = "read",
  WRITE = "write",
}

export interface ObjectAclRule {
  group: ObjectAccessGroup;
  permission: ObjectPermission;
}

// The ACL policy of the object.
export interface ObjectAclPolicy {
  owner: string;
  visibility: "public" | "private";
  aclRules?: Array<ObjectAclRule>;
}

// Check if the requested permission is allowed based on the granted permission.
function isPermissionAllowed(
  requested: ObjectPermission,
  granted: ObjectPermission,
): boolean {
  // Users granted with read or write permissions can read the object.
  if (requested === ObjectPermission.READ) {
    return [ObjectPermission.READ, ObjectPermission.WRITE].includes(granted);
  }

  // Only users granted with write permissions can write the object.
  return granted === ObjectPermission.WRITE;
}

// The base class for all access groups.
abstract class BaseObjectAccessGroup implements ObjectAccessGroup {
  constructor(
    public readonly type: ObjectAccessGroupType,
    public readonly id: string,
  ) {}

  // Check if the user is a member of the group.
  public abstract hasMember(userId: string): Promise<boolean>;
}

function createObjectAccessGroup(
  group: ObjectAccessGroup,
): BaseObjectAccessGroup {
  switch (group.type) {
    // Simple implementation for now - could be extended later
    default:
      return new (class extends BaseObjectAccessGroup {
        async hasMember(userId: string): Promise<boolean> {
          return false; // Default deny
        }
      })(group.type, group.id);
  }
}

// Sets the ACL policy to the object metadata.
export async function setObjectAclPolicy(
  objectFile: File,
  aclPolicy: ObjectAclPolicy,
): Promise<void> {
  try {
    const [exists] = await objectFile.exists();
    if (!exists) {
      console.warn(`Object not found when setting ACL: ${objectFile.name}`);
      return;
    }

    await objectFile.setMetadata({
      metadata: {
        [ACL_POLICY_METADATA_KEY]: JSON.stringify(aclPolicy),
      },
    });
  } catch (error) {
    console.warn("Failed to set object ACL policy:", error);
  }
}

// Gets the ACL policy from the object metadata.
export async function getObjectAclPolicy(
  objectFile: File,
): Promise<ObjectAclPolicy | null> {
  try {
    const [metadata] = await objectFile.getMetadata();
    const aclPolicy = metadata?.metadata?.[ACL_POLICY_METADATA_KEY];
    if (!aclPolicy) {
      return null;
    }
    return JSON.parse(aclPolicy as string);
  } catch (error) {
    console.warn("Failed to get object ACL policy:", error);
    return null;
  }
}

// Checks if the user can access the object.
export async function canAccessObject({
  userId,
  objectFile,
  requestedPermission,
}: {
  userId?: string;
  objectFile: File;
  requestedPermission: ObjectPermission;
}): Promise<boolean> {
  try {
    // When this function is called, the acl policy is required.
    const aclPolicy = await getObjectAclPolicy(objectFile);
    if (!aclPolicy) {
      // No ACL policy - allow access for now (backward compatibility)
      return true;
    }

    // Public objects are always accessible for read.
    if (
      aclPolicy.visibility === "public" &&
      requestedPermission === ObjectPermission.READ
    ) {
      return true;
    }

    // Access control requires the user id.
    if (!userId) {
      return false;
    }

    // The owner of the object can always access it.
    if (aclPolicy.owner === userId) {
      return true;
    }

    // Go through the ACL rules to check if the user has the required permission.
    for (const rule of aclPolicy.aclRules || []) {
      const accessGroup = createObjectAccessGroup(rule.group);
      if (
        (await accessGroup.hasMember(userId)) &&
        isPermissionAllowed(requestedPermission, rule.permission)
      ) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.warn("Error in canAccessObject:", error);
    return false;
  }
}