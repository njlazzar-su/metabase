/* eslint-disable metabase/no-literal-metabase-strings -- This string only shows for admins */

import { useMemo, useState } from "react";
import { Link } from "react-router";
import { t } from "ttag";

import { useListDatabasesQuery } from "metabase/api";
import { DatabaseMultiSelect } from "metabase/common/components/DatabaseMultiSelect";
import { Button, Flex, Stack, Text } from "metabase/ui";
import type { Database, DatabaseId } from "metabase-types/api";

const supportsConnectionImpersonation = (db: Database) =>
  db.features?.includes("connection-impersonation") ?? false;

interface ConnectionImpersonationStepContentProps {
  onNext: () => void;
}

export const ConnectionImpersonationStepContent = ({
  onNext,
}: ConnectionImpersonationStepContentProps) => {
  const { data: databasesResponse } = useListDatabasesQuery();

  const databases = useMemo(
    () => databasesResponse?.data ?? [],
    [databasesResponse],
  );

  const hasCompatibleDatabases = useMemo(
    () => databases.some(supportsConnectionImpersonation),
    [databases],
  );

  const checkDatabaseDisabled = (database: Database) =>
    !supportsConnectionImpersonation(database);

  const [selectedDatabaseIds, setSelectedDatabaseIds] = useState<DatabaseId[]>(
    [],
  );

  const isNextDisabled = selectedDatabaseIds.length === 0;

  if (!hasCompatibleDatabases) {
    return (
      <Stack gap="md">
        <Text size="md" c="text-secondary" lh="lg">
          {t`None of your databases support connection impersonation. Pick a different data segregation strategy in the previous step, or connect a new database in the Database settings before proceeding. Metabase connects to more than 15 popular databases.`}
        </Text>

        <Flex justify="flex-end">
          <Button
            component={Link}
            to="/admin/databases/create"
            variant="filled"
          >
            {t`Add database`}
          </Button>
        </Flex>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Text size="md" c="text-secondary" lh="lg">
        {t`Select one or more databases to be made visible to all tenant users. Tenant users will be able to create queries on these databases with the query builder. The tenant attribute database_role will be used to manage permissions. You will specify this attribute for each tenant when you create tenants.`}
      </Text>

      <DatabaseMultiSelect
        databases={databases}
        value={selectedDatabaseIds}
        onChange={setSelectedDatabaseIds}
        isOptionDisabled={checkDatabaseDisabled}
        disabledOptionTooltip={t`This database doesn't support connection impersonation`}
      />

      <Flex justify="flex-end">
        <Button variant="filled" disabled={isNextDisabled} onClick={onNext}>
          {t`Next`}
        </Button>
      </Flex>
    </Stack>
  );
};
