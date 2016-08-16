'use strict';

const FrameParser = require('./frame-parser');
const EventEmitter = require('events');
const frames = require('./frames');

class Connection extends EventEmitter {
    constructor(socket) {
        super();

        this.socket = socket;

        this.parser = new FrameParser(this.socket, (frame, next) => {
            let data = frames.parse(frame);
            this.onData(data, err => {
                if (err) {
                    this.onError(err);
                    return this.close();
                }
                setImmediate(next);
            });
        });

        this.socket.on('close', () => {
            if (this._closed) {
                return;
            }

            this._closed = true;
            this._closing = false;
            this.emit('close');
        });

        this.socket.on('error', err => this.onError(err));
    }

    send(data) {
        if (this.closing || this.closed) {
            return false;
        }

        return this.socket.write(frames.encode(data));
    }

    onError(err) {
        if (err.code === 'ECONNRESET' || err.code === 'EPIPE') {
            return this.close();
        }
        this.emit('error', err);
    }

    close() {
        if (!this.socket.destroyed && this.socket.writable) {
            this.socket.end();
        }
        this._closing = true;
    }
}

module.exports = Connection;