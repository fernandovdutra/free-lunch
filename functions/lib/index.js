'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.getAvailableBanks =
  exports.getBankStatus =
  exports.syncTransactions =
  exports.bankCallback =
  exports.initBankConnection =
    void 0;
const app_1 = require('firebase-admin/app');
// Initialize Firebase Admin
(0, app_1.initializeApp)();
// Export handlers
var initBankConnection_js_1 = require('./handlers/initBankConnection.js');
Object.defineProperty(exports, 'initBankConnection', {
  enumerable: true,
  get: function () {
    return initBankConnection_js_1.initBankConnection;
  },
});
var bankCallback_js_1 = require('./handlers/bankCallback.js');
Object.defineProperty(exports, 'bankCallback', {
  enumerable: true,
  get: function () {
    return bankCallback_js_1.bankCallback;
  },
});
var syncTransactions_js_1 = require('./handlers/syncTransactions.js');
Object.defineProperty(exports, 'syncTransactions', {
  enumerable: true,
  get: function () {
    return syncTransactions_js_1.syncTransactions;
  },
});
var getBankStatus_js_1 = require('./handlers/getBankStatus.js');
Object.defineProperty(exports, 'getBankStatus', {
  enumerable: true,
  get: function () {
    return getBankStatus_js_1.getBankStatus;
  },
});
var getAvailableBanks_js_1 = require('./handlers/getAvailableBanks.js');
Object.defineProperty(exports, 'getAvailableBanks', {
  enumerable: true,
  get: function () {
    return getAvailableBanks_js_1.getAvailableBanks;
  },
});
//# sourceMappingURL=index.js.map
