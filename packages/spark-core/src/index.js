/**!
 *
 * Copyright (c) 2015 Cisco Systems, Inc. See LICENSE file.
 * @private
 */

import './plugins/logger';
import './plugins/credentials';

export {
  makeSparkStore,
  makeSparkPluginStore,
  MemoryStoreAdapter
} from './lib/storage';

export {default as SparkHttpError} from './lib/spark-http-error';
export {default as SparkPlugin} from './lib/spark-plugin';
export {default as AuthInterceptor} from './plugins/credentials/auth-interceptor';
export {default as NetworkTimingInterceptor} from './interceptors/network-timing';
export {default as RedirectInterceptor} from './interceptors/redirect';
export {default as RequestLoggerInterceptor} from './interceptors/request-logger';
export {default as ResponseLoggerInterceptor} from './interceptors/response-logger';
export {default as RequestTimingInterceptor} from './interceptors/request-timing';
export {default as SparkTrackingIdInterceptor} from './interceptors/spark-tracking-id';

export {
  default as default,
  registerPlugin
} from './spark-core';

export {
  Authorization,
  Credentials,
  grantErrors
} from './plugins/credentials';

export {
  SparkPluginStorage,
  Store,
  MemoryStoreAdapter,
  persist,
  waitForValue
} from './lib/storage';

// export {default as RequestBatcher} from './lib/request-batcher';
