import { useMemo, useState } from "react";
import { t } from "ttag";

import {
  Combobox,
  Flex,
  Icon,
  Pill,
  PillsInput,
  ScrollArea,
  Text,
  useCombobox,
} from "metabase/ui";
import type { Database, DatabaseId } from "metabase-types/api";

import S from "./DatabaseMultiSelect.module.css";

export interface DatabaseMultiSelectProps {
  databases: Database[];
  value: DatabaseId[];
  onChange: (value: DatabaseId[]) => void;
  placeholder?: string;
  label?: string;
  description?: string;
  disabled?: boolean;
  "data-testid"?: string;
}

export const DatabaseMultiSelect = ({
  databases,
  value,
  onChange,
  placeholder = t`Pick a database`,
  label,
  description,
  disabled,
  "data-testid": dataTestId,
}: DatabaseMultiSelectProps) => {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    onDropdownOpen: () => combobox.updateSelectedOptionIndex("active"),
  });

  const [search, setSearch] = useState("");

  const selectedDatabases = useMemo(() => {
    return databases.filter((db) => value.includes(db.id));
  }, [databases, value]);

  const unselectedDatabases = useMemo(() => {
    return databases.filter((db) => !value.includes(db.id));
  }, [databases, value]);

  const filteredDatabases = useMemo(() => {
    const searchLower = search.toLowerCase().trim();
    if (!searchLower) {
      return unselectedDatabases;
    }
    return unselectedDatabases.filter((db) =>
      db.name.toLowerCase().includes(searchLower),
    );
  }, [unselectedDatabases, search]);

  const handleValueRemove = (databaseId: DatabaseId) => {
    onChange(value.filter((id) => id !== databaseId));
  };

  const handleValueSelect = (databaseId: string) => {
    const id = Number(databaseId);
    if (!value.includes(id)) {
      onChange([...value, id]);
    }
    setSearch("");
  };

  const pills = selectedDatabases.map((database) => (
    <Pill key={database.id} px="md" py="6px">
      <Flex align="center" gap="sm" className={S.pillContent}>
        <Icon name="database" size={16} />

        <Text fw="bold" size="md">
          {database.name}
        </Text>

        <Icon
          name="close"
          size={16}
          className={S.pillRemove}
          onClick={() => handleValueRemove(database.id)}
          aria-label={t`Remove ${database.name}`}
          mt="1px"
        />
      </Flex>
    </Pill>
  ));

  const options = filteredDatabases.map((database) => (
    <Combobox.Option
      key={database.id}
      value={String(database.id)}
      className={S.option}
    >
      <Flex align="center" gap="sm">
        <Icon name="database" size={16} className={S.optionIcon} />
        <Text size="md">{database.name}</Text>
      </Flex>
    </Combobox.Option>
  ));

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={handleValueSelect}
      withinPortal
      disabled={disabled}
      position="bottom-start"
      width={360}
    >
      <Combobox.DropdownTarget>
        <PillsInput
          label={label}
          description={description}
          onClick={() => combobox.openDropdown()}
          disabled={disabled}
          data-testid={dataTestId}
          rightSection={<Combobox.Chevron />}
          rightSectionPointerEvents="none"
          rightSectionWidth="3rem"
          classNames={{ input: S.input }}
        >
          <Pill.Group className={S.pillGroup}>
            {pills}
            <Combobox.EventsTarget>
              <PillsInput.Field
                className={S.field}
                onFocus={() => combobox.openDropdown()}
                onBlur={() => combobox.closeDropdown()}
                value={search}
                placeholder={placeholder}
                onChange={(event) => {
                  combobox.updateSelectedOptionIndex();
                  setSearch(event.currentTarget.value);
                }}
                onKeyDown={(event) => {
                  if (
                    event.key === "Backspace" &&
                    search.length === 0 &&
                    selectedDatabases.length > 0
                  ) {
                    handleValueRemove(
                      selectedDatabases[selectedDatabases.length - 1].id,
                    );
                  }
                }}
              />
            </Combobox.EventsTarget>
          </Pill.Group>
        </PillsInput>
      </Combobox.DropdownTarget>

      <Combobox.Dropdown className={S.dropdown}>
        <Combobox.Options>
          <ScrollArea.Autosize mah={200} type="scroll">
            {options.length > 0 ? (
              options
            ) : (
              <Combobox.Empty>{t`No databases found`}</Combobox.Empty>
            )}
          </ScrollArea.Autosize>
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
};
