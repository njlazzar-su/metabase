import { useCallback, useMemo } from "react";
import { t } from "ttag";

import { Api, useListPermissionsGroupsQuery } from "metabase/api";
import { listTag } from "metabase/api/tags";
import { useToast } from "metabase/common/hooks";
import { useDispatch } from "metabase/lib/redux";
import { PLUGIN_TENANTS } from "metabase/plugins";
import { PermissionsApi } from "metabase/services";

import {
  type UpdateTenantDataAccessOptions,
  buildPermissionsGraph,
  buildSandboxPolicies,
} from "../utils/permission-utils";

interface UseUpdateTenantGroupPermissionsResult {
  /**
   * Updates data access for the tenant users group in a single API call.
   * Supports both connection impersonation and row-level security (sandboxing).
   */
  updateDataAccess: (options: UpdateTenantDataAccessOptions) => Promise<void>;

  tenantUsersGroupId?: number;

  /** Whether the tenant users group data is still loading */
  isLoading: boolean;

  /** Whether the hook is ready to update permissions */
  isReady: boolean;
}

/**
 * Hook for updating data access for the tenant users group:
 *
 * - Row-level security (table-level)
 * - Connection impersonation (database-level)
 */
export function useUpdateTenantGroupPermissions(): UseUpdateTenantGroupPermissionsResult {
  const dispatch = useDispatch();
  const [sendToast] = useToast();

  const { data: permissionGroups, isLoading } = useListPermissionsGroupsQuery(
    {},
  );

  // Group id of the "All External Users" special group.
  const groupId = useMemo(
    () => permissionGroups?.find(PLUGIN_TENANTS.isExternalUsersGroup)?.id,
    [permissionGroups],
  );

  const updateDataAccess = useCallback(
    async (options: UpdateTenantDataAccessOptions) => {
      if (groupId === undefined) {
        sendToast({
          icon: "warning",
          toastColor: "error",
          message: t`Could not find the tenant users group. Please enable tenants first.`,
        });

        return;
      }

      const { impersonatedDatabaseIds = [], sandboxedTables = [] } = options;

      // at least one impersonations or sandboxes are needed to setup
      if (
        impersonatedDatabaseIds.length === 0 &&
        sandboxedTables.length === 0
      ) {
        return;
      }

      // get the revision number of the graph
      const graph = await PermissionsApi.graphForGroup({ groupId });

      const groups = buildPermissionsGraph(groupId, options);
      const sandboxes = buildSandboxPolicies(groupId, sandboxedTables);

      const impersonations = impersonatedDatabaseIds.map((databaseId) => ({
        db_id: databaseId,
        group_id: groupId,
        attribute: "database_role",
      }));

      await PermissionsApi.updateGraph({
        groups,
        revision: graph?.revision,
        ...(sandboxes.length > 0 && { sandboxes }),
        ...(impersonations.length > 0 && { impersonations }),
      });

      // invalidate the onboarding checklist and group table access policies
      // so subsequent updates can find the newly created sandbox IDs
      dispatch(
        Api.util.invalidateTags([
          listTag("embedding-hub-checklist"),
          listTag("group-table-access-policy"),
        ]),
      );
    },
    [groupId, sendToast, dispatch],
  );

  return {
    updateDataAccess,
    tenantUsersGroupId: groupId,
    isLoading,
    isReady: groupId !== undefined,
  };
}
