import { useState } from "react";
import { t } from "ttag";

import { useListDatabasesQuery } from "metabase/api";
import { DatabaseMultiSelect } from "metabase/common/components/DatabaseMultiSelect";
import { Button, Flex, Stack, Text } from "metabase/ui";
import type { DatabaseId } from "metabase-types/api";

interface ConnectionImpersonationStepContentProps {
  onNext: () => void;
}

export const ConnectionImpersonationStepContent = ({
  onNext,
}: ConnectionImpersonationStepContentProps) => {
  const { data: databasesResponse } = useListDatabasesQuery();
  const databases = databasesResponse?.data ?? [];

  const [selectedDatabaseIds, setSelectedDatabaseIds] = useState<DatabaseId[]>(
    [],
  );

  const isNextDisabled = selectedDatabaseIds.length === 0;

  return (
    <Stack gap="md">
      <Text size="md" c="text-secondary" lh="lg">
        {t`Select one or more databases to be made visible to all tenant users. Tenant users will be able to create queries on these databases with the query builder. The tenant attribute database_role will be used to manage permissions. You will specify this attribute for each tenant when you create tenants.`}
      </Text>

      <DatabaseMultiSelect
        databases={databases}
        value={selectedDatabaseIds}
        onChange={setSelectedDatabaseIds}
      />

      <Flex justify="flex-end">
        <Button variant="filled" disabled={isNextDisabled} onClick={onNext}>
          {t`Next`}
        </Button>
      </Flex>
    </Stack>
  );
};
