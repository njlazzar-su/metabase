import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { render, screen, waitFor } from "__support__/ui";
import type { Database } from "metabase-types/api";
import { createMockDatabase } from "metabase-types/api/mocks";

import { DatabaseMultiSelect } from "./DatabaseMultiSelect";

const mockDatabases: Database[] = [
  createMockDatabase({ id: 1, name: "Database 1" }),
  createMockDatabase({ id: 2, name: "Database 2" }),
  createMockDatabase({ id: 3, name: "Database 3" }),
];

const TestDatabaseMultiSelect = ({
  initialValue = [],
  databases = mockDatabases,
  isOptionDisabled,
  disabledOptionTooltip,
}: {
  initialValue?: number[];
  databases?: Database[];
  isOptionDisabled?: (database: Database) => boolean;
  disabledOptionTooltip?: string;
}) => {
  const [value, setValue] = useState(initialValue);

  return (
    <DatabaseMultiSelect
      databases={databases}
      value={value}
      onChange={setValue}
      placeholder="Pick a database"
      isOptionDisabled={isOptionDisabled}
      disabledOptionTooltip={disabledOptionTooltip}
    />
  );
};

describe("DatabaseMultiSelect", () => {
  it("should render with placeholder when no databases are selected", () => {
    render(<TestDatabaseMultiSelect />);

    expect(screen.getByPlaceholderText("Pick a database")).toBeInTheDocument();
  });

  it("should show database options in the dropdown", async () => {
    render(<TestDatabaseMultiSelect />);

    await userEvent.click(screen.getByPlaceholderText("Pick a database"));

    await waitFor(() => {
      expect(
        screen.getByRole("option", { name: /Database 1/ }),
      ).toBeInTheDocument();

      expect(
        screen.getByRole("option", { name: /Database 2/ }),
      ).toBeInTheDocument();

      expect(
        screen.getByRole("option", { name: /Database 3/ }),
      ).toBeInTheDocument();
    });
  });

  it("should allow selecting a database", async () => {
    render(<TestDatabaseMultiSelect />);

    await userEvent.click(screen.getByPlaceholderText("Pick a database"));

    await waitFor(() => {
      expect(screen.getByText("Database 1")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Database 1"));

    // after selecting, the pill should appear in the input area
    await waitFor(() => {
      expect(screen.getByText("Database 1")).toBeInTheDocument();
    });
  });

  it("should show pre-selected databases as pills", () => {
    render(<TestDatabaseMultiSelect initialValue={[1, 2]} />);

    // pills have remove buttons with aria-label
    expect(screen.getByLabelText("Remove Database 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Remove Database 2")).toBeInTheDocument();
  });

  it("should handle empty databases list", () => {
    render(<TestDatabaseMultiSelect databases={[]} />);

    expect(screen.getByPlaceholderText("Pick a database")).toBeInTheDocument();
  });

  it("should prevent selecting disabled options", async () => {
    render(
      <TestDatabaseMultiSelect
        isOptionDisabled={(db) => db.id === 1}
        disabledOptionTooltip="Not supported"
      />,
    );

    await userEvent.click(screen.getByPlaceholderText("Pick a database"));

    const option = await screen.findByRole("option", { name: /Database 1/ });
    await userEvent.click(option);

    // clicking a disabled option should not select it
    expect(
      screen.queryByLabelText("Remove Database 1"),
    ).not.toBeInTheDocument();
  });
});
