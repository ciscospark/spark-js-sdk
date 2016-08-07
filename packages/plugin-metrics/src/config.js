/**!
 *
 * Copyright (c) 2015-2016 Cisco Systems, Inc. See LICENSE file.
 */

export default {
  metrics: {
    /**
     * Time to wait before attempting to resubmit metrics
     * @type {Number}
     */
    retryDelay: 30000,

    /**
     * Debounce wait before sending a metric
     * @type {Number}
     */
    batchWait: 500,

    /**
     * Maximum queue size before sending a metric
     * @type {Number}
     */
    batchMaxCalls: 100,

    /**
     * Debounce max wait before sending a metric
     * @type {Number}
     */
    batchMaxWait: 1500
  }
};
