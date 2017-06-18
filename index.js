/*
 *
 * Copyright 2015-2017 magiclen.org
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

var crypto = require('crypto');
var hash = require('mhash');
var Long = require('long');

function MagicCrypt(key = '', bit = 128, iv = '') {
    var mKey, mBit, mIV;
    switch (bit) {
        case 64:
            mKey = crc64(key);
            if (iv !== '') {
                mIV = crc64(iv);
            } else {
                mIV = new Buffer([0, 0, 0, 0, 0, 0, 0, 0]); //IV is not set. It doesn't recommend.
            }
            break;
        case 128:
        case 192:
        case 256:
            switch (bit) {
                case 128:
                    key = hash('md5', key);
                    break;
                case 192:
                    var temp = hash('tiger192', key);
                    // Convert to tiger192,3
                    var key = '';
                    for (var i = 0; i < 3; ++i) {
                        for (var j = 7; j >= 0; --j) {
                            key += temp.substr((i * 16) + (j * 2), 2);
                        }
                    }
                    break;
                case 256:
                    key = hash('sha256', key);
                    break;
            }
            mKey = new Buffer(key, 'hex');
            if (iv !== '') {
                iv = hash('MD5', iv);
                mIV = new Buffer(iv, 'hex');
            } else {
                mIV = new Buffer([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]); //IV is not set. It doesn't recommend.
            }
            break;
        default:
            throw new Error('The key must be 8 bytes(64 bits), 16 bytes(128 bits), 24 bytes(192 bits) or 32 bytes(256 bits)!');
    }
    mBit = bit;

    this.encrypt = function (str) {
        var algorithm = (mBit > 64) ? 'aes-' + mBit + '-cbc' : 'des-cbc';
        var cipher = crypto.createCipheriv(algorithm, mKey, mIV);
        var crypted = cipher.update(str, 'utf8', 'base64');
        crypted += cipher.final('base64');
        return crypted;
    };

    this.encryptData = function (dataBuffer) {
        var algorithm = (mBit > 64) ? 'aes-' + mBit + '-cbc' : 'des-cbc';
        var cipher = crypto.createCipheriv(algorithm, mKey, mIV);
        var crypted = Buffer.concat([cipher.update(dataBuffer), cipher.final()]);
        return crypted.toString('base64');
    };

    this.decrypt = function (str) {
        var algorithm = (mBit > 64) ? 'aes-' + mBit + '-cbc' : 'des-cbc';
        var cipher = crypto.createDecipheriv(algorithm, mKey, mIV);
        var decrypted = cipher.update(str, 'base64', 'utf-8');
        decrypted += cipher.final('utf-8');
        return decrypted;
    };

    this.decryptData = function (dataBase64) {
        var buffer = new Buffer(dataBase64, 'base64');
        var algorithm = (mBit > 64) ? 'aes-' + mBit + '-cbc' : 'des-cbc';
        var cipher = crypto.createDecipheriv(algorithm, mKey, mIV);
        var decrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
        return decrypted;
    };

    function crc64Table() {
        var POLY64REV = new Long(0xA9EA3693, 0x42F0E1EB);
        var LOOKUPTABLE = [];

        var mask1 = new Long(1).shiftLeft(63);
        var mask2 = new Long(1);
        for (var i = 1; i < 64; ++i) {
            mask2 = (mask2 << 1) + 1;
        }

        for (var i = 0; i < 256; ++i) {
            var v = new Long(i);
            for (var j = 0; j < 64; ++j) {
                if (v.and(mask1).equals(0)) {
                    v = v.shiftLeft(1);
                } else {
                    v = v.shiftLeft(1).xor(POLY64REV);
                }
            }
            LOOKUPTABLE[i] = v.and(mask2);
        }
        return LOOKUPTABLE;
    }

    function crc64(string) {
        var data = new Buffer(string, 'utf8');
        var LOOKUPTABLE = crc64Table();
        var dataLength = data.length;
        var FF = new Long(0xFFFFFFFF, 0xFFFFFFFF);
        var sum = FF;
        for (var i = 0; i < dataLength; ++i) {
            var lookupidx = sum.shiftRightUnsigned(56).xor(data[i]).and(0xff);
            sum = sum.shiftLeft(8).xor(LOOKUPTABLE[lookupidx]);
        }
        sum = sum.xor(FF);
        return new Buffer([sum.shiftRightUnsigned(56).toInt(),
            sum.shiftLeft(8).shiftRightUnsigned(56).toInt(),
            sum.shiftLeft(16).shiftRightUnsigned(56).toInt(),
            sum.shiftLeft(24).shiftRightUnsigned(56).toInt(),
            sum.shiftLeft(32).shiftRightUnsigned(56).toInt(),
            sum.shiftLeft(40).shiftRightUnsigned(56).toInt(),
            sum.shiftLeft(48).shiftRightUnsigned(56).toInt(),
            sum.shiftLeft(56).shiftRightUnsigned(56).toInt()]);
    }
};


module.exports = MagicCrypt;
