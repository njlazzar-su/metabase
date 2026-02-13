import { useCallback, useMemo, useState } from "react";
import { t } from "ttag";

import { useListPermissionsGroupsQuery } from "metabase/api";
import { getErrorMessage } from "metabase/api/utils";
import { useToast } from "metabase/common/hooks";
import { PLUGIN_TENANTS } from "metabase/plugins";
import { PermissionsApi } from "metabase/services";
import type { DatabaseId } from "metabase-types/api";

interface UseCreateConnectionImpersonationsProps {
  databaseIds: DatabaseId[];
  onSuccess?: () => void;
}

/**
 * Creates connection impersonation policies for the given database IDs.
 *
 * Uses the "database_role" attribute for all impersonations, which maps
 * to the tenant's database role attribute.
 */
export const useCreateConnectionImpersonations = ({
  databaseIds,
  onSuccess,
}: UseCreateConnectionImpersonationsProps) => {
  const [sendToast] = useToast();
  const [isCreating, setIsCreating] = useState(false);

  const { data: permissionGroups } = useListPermissionsGroupsQuery({});

  const allExternalUsersGroup = useMemo(
    () => permissionGroups?.find(PLUGIN_TENANTS.isExternalUsersGroup),
    [permissionGroups],
  );

  const handleCreateImpersonations = useCallback(async () => {
    if (!allExternalUsersGroup) {
      sendToast({
        icon: "warning",
        toastColor: "error",
        message: t`Could not find the tenant users group. Please enable tenants first.`,
      });
      return;
    }

    if (databaseIds.length === 0) {
      return;
    }

    setIsCreating(true);

    try {
      // 1. Get current permissions graph (we need the revision number)
      const graph = await PermissionsApi.graph();

      // 2. Create impersonations payload for each selected database
      const impersonations = databaseIds.map((databaseId) => ({
        db_id: databaseId,
        group_id: allExternalUsersGroup.id,
        attribute: "database_role",
      }));

      // 3. Build the groups permission changes
      // We need to set view-data: impersonated for each database
      // so impersonation is enforced (otherwise unrestricted would bypass it)
      const groupPermissions: Record<number, { "view-data": "impersonated" }> =
        {};
      for (const databaseId of databaseIds) {
        groupPermissions[databaseId] = { "view-data": "impersonated" };
      }

      // 4. Update the permissions graph with both permission changes and impersonations
      await PermissionsApi.updateGraph({
        groups: {
          [allExternalUsersGroup.id]: groupPermissions,
        },
        revision: graph.revision,
        impersonations,
      });

      onSuccess?.();
    } catch (error) {
      sendToast({
        icon: "warning",
        toastColor: "error",
        message: getErrorMessage(
          error,
          t`Failed to configure connection impersonation`,
        ),
      });
    } finally {
      setIsCreating(false);
    }
  }, [allExternalUsersGroup, databaseIds, sendToast, onSuccess]);

  return {
    handleCreateImpersonations,
    isCreating,
    isReady: !!allExternalUsersGroup,
  };
};
