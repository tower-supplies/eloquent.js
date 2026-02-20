import EloquentModel from './EloquentModel';
import Town from './Town';

export interface CountyAttributes {
  id: number;
  name: string;
  towns?: Town[];
}

export class CountyClass extends EloquentModel<CountyAttributes> {}

interface County extends CountyAttributes {}
class County extends CountyClass {}

export default County;
