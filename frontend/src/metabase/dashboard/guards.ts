import type {
  ActionDashboardCard,
  ParameterId,
  ParameterValueOrArray,
} from "metabase-types/api";
import type { StoreDashcard } from "metabase-types/store";

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isStoreDashcard(value: unknown): value is StoreDashcard {
  return isObject(value) && typeof value.id === "number";
}

export function isStoreDashcardArray(value: unknown): value is StoreDashcard[] {
  return Array.isArray(value) && value.every(isStoreDashcard);
}

export function isCardWithId(
  value: unknown,
): value is StoreDashcard["card"] & { id: number } {
  return isObject(value) && typeof value.id === "number";
}

export function isWritebackAction(
  value: unknown,
): value is NonNullable<ActionDashboardCard["action"]> {
  return isObject(value) && typeof value.id === "number";
}

type ParameterPayload = {
  id: ParameterId;
  value: ParameterValueOrArray | undefined | null;
};

export function isParameterPayload(value: unknown): value is ParameterPayload {
  return isObject(value) && typeof value.id === "string" && "value" in value;
}

export function isParameterValuesMap(
  value: unknown,
): value is Record<ParameterId, ParameterValueOrArray | undefined | null> {
  return isObject(value);
}
