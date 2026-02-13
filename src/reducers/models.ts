import { ModelsActionType } from '../enums';
import { TDatabaseModels, TModels } from '../types';

interface ModelsAction {
  type: ModelsActionType;
  payload?: TModels<TDatabaseModels>;
}

/**
 * Reducer to handle the updating of criteria
 * @param {TModels} state
 * @param {ChecklistProductsAction} action
 * @returns
 */
function modelsReducer(state: TModels<TDatabaseModels>, action: ModelsAction): TModels<TDatabaseModels> {
  const { type, payload } = action;
  switch (type) {
    case ModelsActionType.CHANGE_MODELS:
      return {
        ...state,
        ...payload,
      };

    case ModelsActionType.REGISTER_MODELS:
      return payload!;

    case ModelsActionType.RESET:
      return {} as TModels<TDatabaseModels>;

    default:
      return state;
  }
}

export { ModelsActionType, modelsReducer };
export default modelsReducer;
