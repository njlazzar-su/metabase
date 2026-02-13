import { useCallback, useState } from "react";
import { t } from "ttag";

import { Button, Flex, Icon, Stack, Text, UnstyledButton } from "metabase/ui";
import type { FieldId, TableId } from "metabase-types/api";

import { useUpsertGroupTableAccessPolicies } from "../hooks/use-upsert-group-table-access-policies";

import S from "./RlsDataSelector.module.css";
import { TableColumnCard } from "./TableColumnCard";

export interface TableColumnSelection {
  tableId: TableId | null;
  columnId: FieldId | null;
}

interface RlsDataSelectorProps {
  onSuccess: () => void;
}

export const RlsDataSelector = ({ onSuccess }: RlsDataSelectorProps) => {
  const [selections, setSelections] = useState<TableColumnSelection[]>([
    { tableId: null, columnId: null },
  ]);

  const { handleUpsertPolicies, isCreatingPolicy, isLoadingPolicies } =
    useUpsertGroupTableAccessPolicies({
      tableColumnSelections: selections,
      onSuccess,
    });

  const addTable = useCallback(() => {
    setSelections((prev) => [...prev, { tableId: null, columnId: null }]);
  }, []);

  const removeTable = useCallback((nextIndex: number) => {
    setSelections((prev) =>
      prev.filter((_, prevIndex) => prevIndex !== nextIndex),
    );
  }, []);

  const updateTable = useCallback(
    (index: number, selection: TableColumnSelection) => {
      setSelections((prev) => {
        const newSelections = [...prev];
        newSelections[index] = selection;

        return newSelections;
      });
    },
    [],
  );

  const canRemove = selections.length > 1;

  const isAllTableAndColumnChosen = selections.every(
    (selection) => selection.tableId !== null && selection.columnId !== null,
  );

  const isLoading = isCreatingPolicy;

  return (
    <Stack gap="md">
      <Text size="md" c="text-secondary" lh="lg">
        {t`Select one or more tables to be made visible to tenant users, and the column to filter by. Only rows where the value in the selected column matches the tenant_identifier attribute will be visible to tenant users. You will create tenants and configure this attribute in the next step.`}
      </Text>

      <Text size="md" c="text-secondary" lh="lg">
        {t`Tenant users will be able to create queries on these tables with the query builder. All other tables will be blocked for them`}
      </Text>

      <Stack gap="md">
        {selections.map((selection, index) => (
          <TableColumnCard
            key={index}
            selection={selection}
            onChange={(nextSelection) => updateTable(index, nextSelection)}
            onRemove={canRemove ? () => removeTable(index) : undefined}
          />
        ))}
      </Stack>

      <Flex justify="space-between" align="center">
        <UnstyledButton onClick={addTable} className={S.AddTableButton}>
          <Flex align="center" gap="xs">
            <Icon name="add" size={16} />
            <Text fw="bold" size="md">{t`Add table`}</Text>
          </Flex>
        </UnstyledButton>

        <Button
          variant="filled"
          disabled={!isAllTableAndColumnChosen || isLoadingPolicies}
          onClick={handleUpsertPolicies}
          loading={isLoading}
        >{t`Next`}</Button>
      </Flex>
    </Stack>
  );
};
