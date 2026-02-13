import { DatabaseChangeType } from '../enums';

type TDatabaseModels = Record<string, any>;
type TModelType<TDatabaseModels> = keyof TDatabaseModels;
type TModel<TDatabaseModels, K extends TModelType<TDatabaseModels>> = TDatabaseModels[K];
type TModels<TDatabaseModels> = { [K in TModelType<TDatabaseModels> as K & string]: TDatabaseModels[K] };
type TOnChangeModel = <TModel>(type: DatabaseChangeType, model: TModel) => void;

export { TDatabaseModels, TModel, TModels, TModelType, TOnChangeModel };
