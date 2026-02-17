import EloquentModel from './EloquentModel';

export interface TTown {
  id: number;
  name: string;
  county_id: number;
}

export default class Town extends EloquentModel<TTown> {}
