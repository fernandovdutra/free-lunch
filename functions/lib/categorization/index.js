'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.matchRules = exports.DUTCH_MERCHANTS = exports.matchMerchant = exports.Categorizer = void 0;
var categorizer_js_1 = require('./categorizer.js');
Object.defineProperty(exports, 'Categorizer', {
  enumerable: true,
  get: function () {
    return categorizer_js_1.Categorizer;
  },
});
var merchantDatabase_js_1 = require('./merchantDatabase.js');
Object.defineProperty(exports, 'matchMerchant', {
  enumerable: true,
  get: function () {
    return merchantDatabase_js_1.matchMerchant;
  },
});
Object.defineProperty(exports, 'DUTCH_MERCHANTS', {
  enumerable: true,
  get: function () {
    return merchantDatabase_js_1.DUTCH_MERCHANTS;
  },
});
var ruleEngine_js_1 = require('./ruleEngine.js');
Object.defineProperty(exports, 'matchRules', {
  enumerable: true,
  get: function () {
    return ruleEngine_js_1.matchRules;
  },
});
//# sourceMappingURL=index.js.map
