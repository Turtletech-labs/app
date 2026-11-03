import { DEMO_MODE } from '../../config';
import { createDemoApi } from './demo';
import { createLiveApi } from './live';
import type { Api } from './types';

export const api: Api = DEMO_MODE ? createDemoApi() : createLiveApi();
export { ApiError } from './types';
export type { Api, Session } from './types';
