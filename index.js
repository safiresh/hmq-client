'use strict'
/**
 * Created by safi on 12/04/16 8:51 PM.
 */

let Speaker = require('./lib/speaker');

module.exports = function (conOptions) {
    return new Speaker(conOptions);
};

