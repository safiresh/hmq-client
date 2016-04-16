'use strict'
/**
 * Created by safi on 13/04/16 9:27 AM.
 */
let createSpeaker = require('../');


var client = createSpeaker({scope: 'OL', hosts: [8001, 8000]});

var i = 0;
setInterval(function () {
    i++


    client.emit('came', 'OL', {"ss": i, some: "hai"}, function (err, data) {
        console.log("final", err, data)
    });

}, 100);

client.on('came', function (data, callback) {    //   m.reply(data)
    setTimeout(function () {
        callback(null, data)
    }, 100)
});
