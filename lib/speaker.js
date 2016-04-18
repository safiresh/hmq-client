'use strict'
/**
 * Created by safi on 12/04/16 9:20 PM.
 */
const shortId = require('shortid');

var ERR_REQ_REFUSED, MAX_WAITERS, MessengerBase, Speaker, net, __slice = [].slice,
    __hasProp = {}.hasOwnProperty,
    __extends = function (child, parent) {
        for (var key in parent) {
            if (__hasProp.call(parent, key)) child[key] = parent[key];
        }
        function ctor() {
            this.constructor = child;
        }

        ctor.prototype = parent.prototype;
        child.prototype = new ctor();
        child.__super__ = parent.prototype;
        return child;
    };

net = require('net');

MessengerBase = require('./messengerBase');

ERR_REQ_REFUSED = -1;

MAX_WAITERS = 9999999;

Speaker = (function (_super) {

    __extends(Speaker, _super);

    function Speaker(conOptions) {

        var address, addresses = [], _i, _len;

        if (conOptions.hosts)
            addresses = addresses.concat(conOptions.hosts);
        if (conOptions.host)
            addresses.push(conOptions.host);

        Speaker.__super__.constructor.call(this);
        this.scope = conOptions.scope;
        this.uniqueId = 1;
        this.sockets = [];
        this.failedQ = [];
        this.waiters = {};
        this.remoteMethods = {};
        this.socketIterator = 0;
        this.id = "SER:" + shortId.generate();
        for (_i = 0, _len = addresses.length; _i < _len; _i++) {
            address = addresses[_i];
            this.connect(address);
        }
    }

    Speaker.prototype.connect = function (address) {
        var host, port, self, socket,
            _this = this;
        self = this;
        host = this.getHostByAddress(address);
        port = this.getPortByAddress(address);
        socket = new net.Socket;
        socket.uniqueSocketId = this.generateUniqueId();
        socket.setEncoding('utf8');
        socket.setNoDelay(true);
        socket.setMaxListeners(Infinity);
        socket.connect(port, host, function () {

            // console.log(_this.remoteMethods);
        });
        socket.on('data', function (data) {
            var message, messageText, _i, _len, _ref, _results;
            _ref = _this.tokenizeData(data);
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                messageText = _ref[_i];
                message = JSON.parse(messageText);
                if (message.isReply) {
                    if (_this.waiters[message.id]) {
                        _this.waiters[message.id](message.error, message.data);
                        _results.push(delete _this.waiters[message.id]);
                    }
                } else {
                    message = _this.prepare(message);
                    _results.push(_this.dispatch(message));
                }
            }
            return _results;
        });
        socket.on('error', function () {
        });
        socket.on('connect', function () {
            //Get Connection Details  & Register the methods
            var payload = {
                subject: "__REGISTER",
                data   : {
                    methods : Object.keys(_this.remoteMethods),
                    scope   : _this.scope,
                    serverId: _this.id
                }
            };
            socket.write(_this.prepareJsonToSend(payload));
            _this.sockets.push(socket);

            //Write failed replyQ first]
            while (_this.failedQ.length > 0) {
                var wrtStr = _this.failedQ.shift();
                if (wrtStr)
                    socket.write(wrtStr);
            }


        });
        return socket.on('close', function () {
            var index, sock, _i, _len, _ref;
            index = -1;
            _ref = _this.sockets;

            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                sock = _ref[_i];
                if (sock.uniqueSocketId === socket.uniqueSocketId) {
                    index = _i;
                    break;
                }
            }
            if (index > -1) {
                _this.sockets.splice(index, 1);
            }
            socket.destroy();
            return setTimeout(function () {
                return self.connect(address);
            }, 1000);
        });
    };

    Speaker.prototype.prepare = function (message) {
        var i, subject,
            _this = this;
        subject = message.subject;
        i = 0;
        message.reply = function (err, json) {
            var payload;

            payload = {
                id       : message.id,
                requestId: message.requestId,
                scope    : message.scope,
                subject  : message.subject,
                error    : err,
                data     : json,
                isReply  : true,

            };
            var wrtStr = _this.prepareJsonToSend(payload);
            try {
                return _this.sockets[0].write(wrtStr);
            } catch (ex) {
                _this.failedQ.push(wrtStr)
            }
        };
        message.next = function () {
            var _ref;
            return (_ref = _this.remoteMethods[subject]) != null ? _ref[i++](message.data, message.reply) : void 0;
        };
        return message;
    };

    Speaker.prototype.dispatch = function (message) {
        return message.next();
    };

    Speaker.prototype.emit = function (subject, scope, data, callback) {
        //  console.log(this.sockets.length);
        var messageId;
        if (this.sockets.length === 0) { // We need to handle that sockets
            if (callback) {
                callback({
                    error: ERR_REQ_REFUSED
                });
            }
            return;
        }
        if (callback) {
            messageId = this.generateUniqueId();
            this.waiters[messageId] = callback;
        }
        var payload = {
            serverId: this.id,
            id      : messageId ? messageId : null,
            scope   : scope,
            subject : subject,
            data    : data
        };
        this.sockets[0].write(this.prepareJsonToSend(payload));
    };

    Speaker.prototype.on = function () {
        var methods, subject;
        subject = arguments[0], methods = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        return this.remoteMethods[subject] = methods;

    };

    Speaker.prototype.generateUniqueId = function () {
        var id, newId;
        id = 'id-' + shortId.generate()
        if (!this.waiters[id]) {
            return id;
        }
        if (this.uniqueId++ === MAX_WAITERS) {
            this.uniqueId = 1;
        }
        if (this.waiters[newId = 'id-' + this.uniqueId]) {
            delete this.waiters[newId];
        }
        return this.generateUniqueId();
    };

    return Speaker;

})(MessengerBase);

module.exports = Speaker;
