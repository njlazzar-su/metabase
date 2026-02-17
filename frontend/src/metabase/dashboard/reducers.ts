import type { UnknownAction } from "@reduxjs/toolkit";

import { Actions } from "metabase/entities/actions";
import { Questions } from "metabase/entities/questions";
import { combineReducers } from "metabase/lib/redux";
import type { DashboardState } from "metabase-types/store";

import {
  INITIALIZE,
  REMOVE_CARD_FROM_DASH,
  REMOVE_PARAMETER,
  REPLACE_ALL_DASHCARD_VISUALIZATION_SETTINGS,
  RESET_PARAMETERS,
  SET_DASHCARD_ATTRIBUTES,
  SET_MULTIPLE_DASHCARD_ATTRIBUTES,
  SET_PARAMETER_VALUE,
  SET_PARAMETER_VALUES,
  UNDO_REMOVE_CARD_FROM_DASH,
  UPDATE_DASHCARD_VISUALIZATION_SETTINGS,
  UPDATE_DASHCARD_VISUALIZATION_SETTINGS_FOR_COLUMN,
  addCardToDash,
  addManyCardsToDash,
  fetchDashboard,
  markNewCardSeen,
  tabsReducer,
} from "./actions";
import { INITIAL_DASHBOARD_STATE } from "./constants";
import {
  isCardWithId,
  isObject,
  isParameterPayload,
  isParameterValuesMap,
  isStoreDashcard,
  isStoreDashcardArray,
  isWritebackAction,
} from "./guards";
import {
  autoApplyFilters,
  dashboardId,
  dashboards,
  dashcardData,
  editingDashboard,
  isAddParameterPopoverOpen,
  isNavigatingBackToDashboard,
  loadingControls,
  loadingDashCards,
  missingActionParameters,
  parameterValues,
  sidebar,
  slowCards,
} from "./reducers-typed";
import { calculateDashCardRowAfterUndo } from "./utils";

type ReducerAction = UnknownAction & {
  payload?: unknown;
};

type DashcardsState = DashboardState["dashcards"];
type DraftParameterValuesState = DashboardState["draftParameterValues"];

const getPayloadObject = (
  action: ReducerAction,
): Record<string, unknown> | null => {
  return isObject(action.payload) ? action.payload : null;
};

const getDashcardId = (payload: Record<string, unknown>, key = "id") => {
  const value = payload[key];
  return typeof value === "number" ? value : null;
};

const getFetchDashboardDashcards = (
  payload: unknown,
): Record<string, unknown> | null => {
  if (!isObject(payload)) {
    return null;
  }

  const entities = payload.entities;
  if (!isObject(entities)) {
    return null;
  }

  const dashcardEntities = entities.dashcard;
  return isObject(dashcardEntities) ? dashcardEntities : null;
};

type DashcardReducer = (
  state: DashcardsState,
  action: ReducerAction,
) => DashcardsState;

const dashcardReducers: Record<string, DashcardReducer> = {
  [fetchDashboard.fulfilled.type]: (state, action) => {
    const dashcardEntities = getFetchDashboardDashcards(action.payload);
    if (!dashcardEntities) {
      return state;
    }

    const nextState = { ...state };
    for (const entity of Object.values(dashcardEntities)) {
      if (isStoreDashcard(entity)) {
        nextState[entity.id] = entity;
      }
    }
    return nextState;
  },
  [SET_DASHCARD_ATTRIBUTES]: (state, action) => {
    const payload = getPayloadObject(action);
    if (!payload) {
      return state;
    }

    const id = getDashcardId(payload);
    const attributes = payload.attributes;
    if (id === null || !isObject(attributes) || !state[id]) {
      return state;
    }

    return {
      ...state,
      [id]: {
        ...state[id],
        ...attributes,
        isDirty: true,
      },
    };
  },
  [SET_MULTIPLE_DASHCARD_ATTRIBUTES]: (state, action) => {
    const payload = getPayloadObject(action);
    const dashcards = payload?.dashcards;
    if (!Array.isArray(dashcards)) {
      return state;
    }

    const nextState = { ...state };
    for (const dashcardAttrs of dashcards) {
      if (!isObject(dashcardAttrs)) {
        continue;
      }

      const id = getDashcardId(dashcardAttrs);
      const attributes = dashcardAttrs.attributes;
      if (id === null || !isObject(attributes) || !nextState[id]) {
        continue;
      }

      nextState[id] = {
        ...nextState[id],
        ...attributes,
        isDirty: true,
      };
    }

    return nextState;
  },
  [UPDATE_DASHCARD_VISUALIZATION_SETTINGS]: (state, action) => {
    const payload = getPayloadObject(action);
    if (!payload) {
      return state;
    }

    const id = getDashcardId(payload);
    const settings = payload.settings;
    if (id === null || !isObject(settings) || !state[id]) {
      return state;
    }

    const nextState = { ...state };
    nextState[id] = { ...nextState[id] };
    nextState[id].visualization_settings = {
      ...(nextState[id].visualization_settings ?? {}),
      ...settings,
    };
    nextState[id].isDirty = true;
    return nextState;
  },
  [UPDATE_DASHCARD_VISUALIZATION_SETTINGS_FOR_COLUMN]: (state, action) => {
    const payload = getPayloadObject(action);
    if (!payload) {
      return state;
    }

    const id = getDashcardId(payload);
    const column = payload.column;
    const settings = payload.settings;
    if (
      id === null ||
      typeof column !== "string" ||
      !isObject(settings) ||
      !state[id]
    ) {
      return state;
    }

    const existingSettings = state[id].visualization_settings ?? {};
    const existingColumnSettings = isObject(existingSettings.column_settings)
      ? existingSettings.column_settings
      : {};
    const existingColumn = isObject(existingColumnSettings[column])
      ? existingColumnSettings[column]
      : {};

    const nextState = { ...state };
    nextState[id] = { ...nextState[id] };
    nextState[id].visualization_settings = {
      ...existingSettings,
      column_settings: {
        ...existingColumnSettings,
        [column]: {
          ...existingColumn,
          ...settings,
        },
      },
    };
    nextState[id].isDirty = true;
    return nextState;
  },
  [REPLACE_ALL_DASHCARD_VISUALIZATION_SETTINGS]: (state, action) => {
    const payload = getPayloadObject(action);
    if (!payload) {
      return state;
    }

    const id = getDashcardId(payload);
    const settings = payload.settings;
    if (
      id === null ||
      (settings != null && !isObject(settings)) ||
      !state[id]
    ) {
      return state;
    }

    const nextState = { ...state };
    nextState[id] = { ...nextState[id] };
    if (settings == null) {
      delete nextState[id].visualization_settings;
    } else {
      nextState[id].visualization_settings = settings;
    }
    nextState[id].isDirty = true;
    return nextState;
  },
  [addCardToDash.type]: (state, action) => {
    if (!isStoreDashcard(action.payload)) {
      return state;
    }

    const dashcard = action.payload;
    const nextState = { ...state };
    nextState[dashcard.id] = { ...dashcard, isAdded: true, justAdded: true };
    return nextState;
  },
  [addManyCardsToDash.type]: (state, action) => {
    if (!isStoreDashcardArray(action.payload)) {
      return state;
    }

    const nextState = { ...state };
    action.payload.forEach((dashcard, index) => {
      nextState[dashcard.id] = {
        ...dashcard,
        isAdded: true,
        justAdded: index === 0,
      };
    });

    return nextState;
  },
  [REMOVE_CARD_FROM_DASH]: (state, action) => {
    const payload = getPayloadObject(action);
    const dashcardId = payload ? getDashcardId(payload, "dashcardId") : null;
    if (dashcardId === null || !state[dashcardId]) {
      return state;
    }

    const nextState = { ...state };
    nextState[dashcardId] = { ...nextState[dashcardId] };
    nextState[dashcardId].isRemoved = true;
    return nextState;
  },
  [UNDO_REMOVE_CARD_FROM_DASH]: (state, action) => {
    const payload = getPayloadObject(action);
    const dashcardId = payload ? getDashcardId(payload, "dashcardId") : null;
    if (dashcardId === null || !state[dashcardId]) {
      return state;
    }

    const nextState = { ...state };
    nextState[dashcardId] = { ...nextState[dashcardId] };
    nextState[dashcardId].isRemoved = false;
    nextState[dashcardId].row = calculateDashCardRowAfterUndo(
      nextState[dashcardId].row,
    );
    return nextState;
  },
  [markNewCardSeen.type]: (state, action) => {
    const dashcardId =
      typeof action.payload === "number" ? action.payload : null;
    if (dashcardId === null || !state[dashcardId]) {
      return state;
    }

    const nextState = { ...state };
    nextState[dashcardId] = { ...nextState[dashcardId] };
    nextState[dashcardId].justAdded = false;
    return nextState;
  },
  [Questions.actionTypes.UPDATE]: (state, action) => {
    const payload = getPayloadObject(action);
    const card = payload?.object;
    if (!isCardWithId(card)) {
      return state;
    }

    const nextState = { ...state };
    for (const dashcardId of Object.keys(nextState)) {
      const id = Number(dashcardId);
      const dashcard = nextState[id];
      if (dashcard.card?.id !== card.id) {
        continue;
      }

      nextState[id] = { ...dashcard };
      nextState[id].card = card;
    }

    return nextState;
  },
  [Actions.actionTypes.UPDATE]: (state, action) => {
    const payload = getPayloadObject(action);
    const actionCard = payload?.object;
    if (!isWritebackAction(actionCard)) {
      return state;
    }

    const nextState = { ...state };
    for (const dashcardId of Object.keys(nextState)) {
      const id = Number(dashcardId);
      const dashcard = nextState[id];
      if (!("action_id" in dashcard) || dashcard.action?.id !== actionCard.id) {
        continue;
      }

      nextState[id] = { ...dashcard };
      nextState[id].action = {
        ...actionCard,
        database_enabled_actions:
          dashcard.action?.database_enabled_actions || false,
      };
    }

    return nextState;
  },
};

const reduceDashcards = (
  state: DashcardsState = INITIAL_DASHBOARD_STATE.dashcards,
  action: ReducerAction,
): DashcardsState => {
  const actionType = typeof action.type === "string" ? action.type : null;
  if (!actionType) {
    return state;
  }

  const reducer = dashcardReducers[actionType];
  return reducer ? reducer(state, action) : state;
};

type DraftParameterValuesReducer = (
  state: DraftParameterValuesState,
  action: ReducerAction,
) => DraftParameterValuesState;

const draftParameterValuesReducers: Record<
  string,
  DraftParameterValuesReducer
> = {
  [INITIALIZE]: (state, action) => {
    const payload = getPayloadObject(action);
    const clearCache = payload?.clearCache;
    return clearCache === false ? state : {};
  },
  [fetchDashboard.fulfilled.type]: (state, action) => {
    const payload = getPayloadObject(action);
    if (!payload) {
      return state;
    }

    const dashboard = payload.dashboard;
    const parameterValues = payload.parameterValues;
    const preserveParameters = payload.preserveParameters;

    if (!isObject(dashboard) || !isParameterValuesMap(parameterValues)) {
      return state;
    }

    const autoApplyFilters = dashboard.auto_apply_filters;
    if (preserveParameters === true && autoApplyFilters === false) {
      return state;
    }

    return parameterValues;
  },
  [SET_PARAMETER_VALUE]: (state, action) => {
    if (!isParameterPayload(action.payload)) {
      return state;
    }

    const { id, value } = action.payload;
    return {
      ...state,
      [id]: value,
    };
  },
  [SET_PARAMETER_VALUES]: (state, action) => {
    return isParameterValuesMap(action.payload) ? action.payload : state;
  },
  [RESET_PARAMETERS]: (state, action) => {
    if (!Array.isArray(action.payload)) {
      return state;
    }

    let nextState = { ...state };
    for (const parameter of action.payload) {
      if (!isParameterPayload(parameter)) {
        continue;
      }

      nextState = {
        ...nextState,
        [parameter.id]: parameter.value,
      };
    }

    return nextState;
  },
  [REMOVE_PARAMETER]: (state, action) => {
    const payload = getPayloadObject(action);
    const id = payload ? payload.id : null;
    if (typeof id !== "string") {
      return state;
    }

    const nextState = { ...state };
    delete nextState[id];
    return nextState;
  },
};

const reduceDraftParameterValues = (
  state: DraftParameterValuesState = INITIAL_DASHBOARD_STATE.draftParameterValues,
  action: ReducerAction,
): DraftParameterValuesState => {
  const actionType = typeof action.type === "string" ? action.type : null;
  if (!actionType) {
    return state;
  }

  const reducer = draftParameterValuesReducers[actionType];
  return reducer ? reducer(state, action) : state;
};

const combinedDashboardReducer = combineReducers({
  dashboardId,
  missingActionParameters,
  autoApplyFilters,
  slowCards,
  isNavigatingBackToDashboard,
  isAddParameterPopoverOpen,
  editingDashboard,
  loadingControls,
  sidebar,
  parameterValues,
  dashboards,
  loadingDashCards,
  dashcards: reduceDashcards,
  dashcardData,
  draftParameterValues: reduceDraftParameterValues,
  // Combined reducer needs to init state for every slice
  selectedTabId: (state = INITIAL_DASHBOARD_STATE.selectedTabId) => state,
  tabDeletions: (state = INITIAL_DASHBOARD_STATE.tabDeletions) => state,
});

export const dashboardReducers = (
  state = INITIAL_DASHBOARD_STATE,
  action: ReducerAction,
) => tabsReducer(combinedDashboardReducer(state, action), action);
