'use strict'
/**
 * Created by safi on 13/04/16 9:27 AM.
 */
let createSpeaker = require('../');


var client = createSpeaker({scope: 'OL', hosts: [ "188.166.214.83:8000"]});
//var client = createSpeaker({scope: 'OL', hosts: [8000]});

var i = 0;
setInterval(function () {
    i++


    client.emit('came', 'OL', {"ss": i, some: "hai"}, function (err, data) {
        console.log("final", err, data)
    });

}, 1000);

client.on('came', function (data, callback) {    //   m.reply(data)
    setTimeout(function () {
        callback(data)
    }, 1000)
});
