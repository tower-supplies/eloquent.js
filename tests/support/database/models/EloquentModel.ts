import Model from '@/classes/EloquentModel';

import { TAttributes } from '@/types';

import { TDatabase } from '../types';

export default abstract class EloquentModel<T extends TAttributes> extends Model<T, TDatabase> {}
