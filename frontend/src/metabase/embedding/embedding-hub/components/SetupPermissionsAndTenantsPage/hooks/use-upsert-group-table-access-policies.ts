import { useCallback, useState } from "react";
import { t } from "ttag";

import { tableApi, useListGroupTableAccessPoliciesQuery } from "metabase/api";
import { getErrorMessage } from "metabase/api/utils";
import { useToast } from "metabase/common/hooks";
import { useDispatch } from "metabase/lib/redux";

import type { TableColumnSelection } from "../RlsDataSelector";

import { useUpdateTenantGroupPermissions } from "./use-update-tenant-permissions";

interface UseUpsertGroupTableAccessPoliciesProps {
  tableColumnSelections: TableColumnSelection[];
  onSuccess?: () => void;
}

/**
 * Creates group table access policies (sandboxes)
 * for the given table and column selections.
 */
export const useUpsertGroupTableAccessPolicies = ({
  tableColumnSelections,
  onSuccess,
}: UseUpsertGroupTableAccessPoliciesProps) => {
  const dispatch = useDispatch();
  const [sendToast] = useToast();

  const [isCreatingPolicy, setIsCreatingPolicy] = useState(false);

  const { updateDataAccess, tenantUsersGroupId, isReady } =
    useUpdateTenantGroupPermissions();

  const { data: existingPolicies, isLoading: isLoadingPolicies } =
    useListGroupTableAccessPoliciesQuery(
      tenantUsersGroupId ? { group_id: tenantUsersGroupId } : undefined,
      { skip: !tenantUsersGroupId },
    );

  const handleUpsertPolicies = useCallback(async () => {
    if (!tenantUsersGroupId) {
      sendToast({
        icon: "warning",
        toastColor: "error",
        message: t`Could not find the tenant users group. Please enable tenants first.`,
      });

      return;
    }

    try {
      setIsCreatingPolicy(true);

      const nextPolicies = await Promise.all(
        tableColumnSelections.map(async (selection) => {
          if (selection.tableId === null || selection.columnId === null) {
            return null;
          }

          const { data: table } = await dispatch(
            tableApi.endpoints.getTable.initiate({ id: selection.tableId }),
          );

          if (!table) {
            return null;
          }

          const existingPolicy = existingPolicies?.find(
            (policy) => policy.table_id === selection.tableId,
          );

          return {
            tableId: table.id,
            databaseId: table.db_id,
            schemaName: table.schema ?? "",
            filterFieldId: selection.columnId,

            // If existing policy is found, this updates
            // the policy rather than creating a new one.
            ...(existingPolicy && { id: existingPolicy.id }),
          };
        }),
      );

      const sandboxedTables = nextPolicies.filter((entry) => entry != null);
      await updateDataAccess({ sandboxedTables });

      onSuccess?.();
    } catch (error) {
      sendToast({
        icon: "warning",
        toastColor: "error",
        message: getErrorMessage(
          error,
          t`Failed to configure row-level security`,
        ),
      });
    } finally {
      setIsCreatingPolicy(false);
    }
  }, [
    dispatch,
    tenantUsersGroupId,
    tableColumnSelections,
    existingPolicies,
    updateDataAccess,
    sendToast,
    onSuccess,
  ]);

  return {
    handleUpsertPolicies,
    isCreatingPolicy,
    isLoadingPolicies,
    isReady,
    existingPolicies,
  };
};
