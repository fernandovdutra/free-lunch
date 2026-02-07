"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIcsBreakdown = exports.importIcsStatement = exports.getSpendingExplorer = exports.createDefaultCategories = exports.getReimbursementSummary = exports.getBudgetProgress = exports.getDashboardData = exports.recategorizeTransactions = exports.getAvailableBanks = exports.getBankStatus = exports.syncTransactions = exports.bankCallback = exports.initBankConnection = void 0;
const app_1 = require("firebase-admin/app");
// Initialize Firebase Admin
(0, app_1.initializeApp)();
// Export handlers
var initBankConnection_js_1 = require("./handlers/initBankConnection.js");
Object.defineProperty(exports, "initBankConnection", { enumerable: true, get: function () { return initBankConnection_js_1.initBankConnection; } });
var bankCallback_js_1 = require("./handlers/bankCallback.js");
Object.defineProperty(exports, "bankCallback", { enumerable: true, get: function () { return bankCallback_js_1.bankCallback; } });
var syncTransactions_js_1 = require("./handlers/syncTransactions.js");
Object.defineProperty(exports, "syncTransactions", { enumerable: true, get: function () { return syncTransactions_js_1.syncTransactions; } });
var getBankStatus_js_1 = require("./handlers/getBankStatus.js");
Object.defineProperty(exports, "getBankStatus", { enumerable: true, get: function () { return getBankStatus_js_1.getBankStatus; } });
var getAvailableBanks_js_1 = require("./handlers/getAvailableBanks.js");
Object.defineProperty(exports, "getAvailableBanks", { enumerable: true, get: function () { return getAvailableBanks_js_1.getAvailableBanks; } });
var recategorizeTransactions_js_1 = require("./handlers/recategorizeTransactions.js");
Object.defineProperty(exports, "recategorizeTransactions", { enumerable: true, get: function () { return recategorizeTransactions_js_1.recategorizeTransactions; } });
var getDashboardData_js_1 = require("./handlers/getDashboardData.js");
Object.defineProperty(exports, "getDashboardData", { enumerable: true, get: function () { return getDashboardData_js_1.getDashboardData; } });
var getBudgetProgress_js_1 = require("./handlers/getBudgetProgress.js");
Object.defineProperty(exports, "getBudgetProgress", { enumerable: true, get: function () { return getBudgetProgress_js_1.getBudgetProgress; } });
var getReimbursementSummary_js_1 = require("./handlers/getReimbursementSummary.js");
Object.defineProperty(exports, "getReimbursementSummary", { enumerable: true, get: function () { return getReimbursementSummary_js_1.getReimbursementSummary; } });
var createDefaultCategories_js_1 = require("./handlers/createDefaultCategories.js");
Object.defineProperty(exports, "createDefaultCategories", { enumerable: true, get: function () { return createDefaultCategories_js_1.createDefaultCategories; } });
var getSpendingExplorer_js_1 = require("./handlers/getSpendingExplorer.js");
Object.defineProperty(exports, "getSpendingExplorer", { enumerable: true, get: function () { return getSpendingExplorer_js_1.getSpendingExplorer; } });
var importIcsStatement_js_1 = require("./handlers/importIcsStatement.js");
Object.defineProperty(exports, "importIcsStatement", { enumerable: true, get: function () { return importIcsStatement_js_1.importIcsStatement; } });
var getIcsBreakdown_js_1 = require("./handlers/getIcsBreakdown.js");
Object.defineProperty(exports, "getIcsBreakdown", { enumerable: true, get: function () { return getIcsBreakdown_js_1.getIcsBreakdown; } });
//# sourceMappingURL=index.js.map