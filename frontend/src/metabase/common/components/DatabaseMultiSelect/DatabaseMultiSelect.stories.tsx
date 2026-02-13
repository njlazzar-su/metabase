import { useState } from "react";

import { Stack, Text } from "metabase/ui";
import type { Database, DatabaseId } from "metabase-types/api";
import { createMockDatabase } from "metabase-types/api/mocks";

import {
  DatabaseMultiSelect,
  type DatabaseMultiSelectProps,
} from "./DatabaseMultiSelect";

const mockDatabases: Database[] = [
  createMockDatabase({ id: 1, name: "Database 1" }),
  createMockDatabase({ id: 2, name: "Database 2" }),
  createMockDatabase({ id: 3, name: "Database 3" }),
];

const DatabaseMultiSelectWrapper = (
  props: Omit<DatabaseMultiSelectProps, "value" | "onChange"> & {
    initialValue?: DatabaseId[];
  },
) => {
  const [value, setValue] = useState<DatabaseId[]>(props.initialValue ?? []);

  return (
    <Stack>
      <DatabaseMultiSelect {...props} value={value} onChange={setValue} />
      <Text size="sm" c="text-secondary">
        Selected IDs: {value.length > 0 ? value.join(", ") : "none"}
      </Text>
    </Stack>
  );
};

export default {
  title: "Common/DatabaseMultiSelect",
  component: DatabaseMultiSelect,
};

export const Default = {
  render: () => (
    <DatabaseMultiSelectWrapper
      databases={mockDatabases}
      placeholder="Pick a database"
    />
  ),
};

export const WithInitialSelection = {
  name: "With initial selection",
  render: () => (
    <DatabaseMultiSelectWrapper
      databases={mockDatabases}
      placeholder="Pick a database"
      initialValue={[1]}
    />
  ),
};

export const MultipleSelected = {
  name: "Multiple selected",
  render: () => (
    <DatabaseMultiSelectWrapper
      databases={mockDatabases}
      placeholder="Pick a database"
      initialValue={[1, 2]}
    />
  ),
};

export const Disabled = {
  render: () => (
    <DatabaseMultiSelectWrapper
      databases={mockDatabases}
      placeholder="Pick a database"
      initialValue={[1]}
      disabled
    />
  ),
};

export const WithLabel = {
  name: "With label",
  render: () => (
    <DatabaseMultiSelectWrapper
      databases={mockDatabases}
      placeholder="Pick a database"
      label="Select databases"
    />
  ),
};

export const WithDescription = {
  name: "With description",
  render: () => (
    <DatabaseMultiSelectWrapper
      databases={mockDatabases}
      placeholder="Pick a database"
      label="Select databases"
      description="Choose one or more databases to include"
    />
  ),
};

export const EmptyDatabases = {
  name: "Empty databases",
  render: () => (
    <DatabaseMultiSelectWrapper
      databases={[]}
      placeholder="No databases available"
    />
  ),
};

export const WithDisabledOptions = {
  name: "With disabled options",
  render: () => (
    <DatabaseMultiSelectWrapper
      databases={mockDatabases}
      placeholder="Pick a database"
      isOptionDisabled={(db) => db.id === 2}
      disabledOptionTooltip="Connection impersonation is not supported for this database"
    />
  ),
};
