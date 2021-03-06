/*!
 *      Copyright (C) 2015 SequoiaDB Inc.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

'use strict';

var constants = require('./const');
var crypto = require('crypto');
var BSON = require('bson').BSONPure.BSON;
var XBuffer = require('./buffer');
var Long = require('./long');
var padLength = require('./pad').padLength;
var padBuffer = require('./pad').padBuffer;
var debug = require('debug')('sequoiadb:helper');

var MESSAGE_HEADER_LENGTH = 28;
var MESSAGE_OPQUERY_LENGTH = 61;
var MESSAGE_OPINSERT_LENGTH = 45;
var MESSAGE_OPUPDATE_LENGTH = 45;
var MESSAGE_OPDELETE_LENGTH = 45;
var MESSAGE_KILLCURSOR_LENGTH = 36;
var MESSAGE_OPGETMORE_LENGTH = 40;

exports.md5 = function (input) {
  var shasum = crypto.createHash('md5');
  shasum.update(input);
  return shasum.digest('hex');
};

/**
 * Build system info request buffer
 */
exports.buildSystemInfoRequest = function () {
  var buf = new Buffer(12);
  buf.writeInt32LE(constants.MSG_SYSTEM_INFO_LEN, 0); // use 4 bytes
  buf.writeUInt32LE(constants.MSG_SYSTEM_INFO_EYECATCHER, 4); // use 4 bytes
  buf.writeIntLE(12, 8, 4); // use 4 bytes
  return buf;
};

exports.buildHeader = function (messageLength, requestID, nodeID, operationCode, isBigEndian) {
  var origin = new Buffer(MESSAGE_HEADER_LENGTH);
  origin.fill(0);
  var buf = new XBuffer(origin, isBigEndian);

  buf.writeInt32(messageLength, 0); // 4
  buf.writeInt32(operationCode, 4); // 4
  buf.writeBuffer(nodeID, 8); // nodeID.length 12
  buf.writeLong(requestID, 8 + nodeID.length); // 8

  return buf.toBuffer();
};

exports.buildAuthMessage = function (message, user, passwd, isBigEndian) {
  var opCode = message.OperationCode;
  var requestID = message.RequestID;
  var nodeID = constants.ZERO_NODEID;
  var auth = {};
  auth[constants.SDB_AUTH_USER] = user;
  auth[constants.SDB_AUTH_PASSWD] = passwd;
  var authBytes = BSON.serialize(auth, false, true, false);

  var messageLength = MESSAGE_HEADER_LENGTH + padLength(authBytes.length, 4);
  var list = [];
  list.push(exports.buildHeader(messageLength, requestID, nodeID, opCode, isBigEndian));
  list.push(padBuffer(authBytes, 4));
  return Buffer.concat(list);
};

exports.buildDisconnectRequest = function (isBigEndian) {
  var requestID = Long.ZERO;
  var nodeID = constants.ZERO_NODEID;
  var messageLength = padLength(MESSAGE_HEADER_LENGTH, 4);
  var opCode = constants.Operation.OP_DISCONNECT;
  return exports.buildHeader(messageLength, requestID, nodeID, opCode, isBigEndian);
};

exports.buildKillCursorMessage = function (message, isBigEndian) {
  var opCode = message.OperationCode;
  var contextIDs = message.ContextIDList;
  var requestID = Long.ZERO;
  var nodeID = constants.ZERO_NODEID;
  // sizeof(long) = 8
  var lenContextIDs = 8 * contextIDs.length;
  var messageLength = MESSAGE_KILLCURSOR_LENGTH + lenContextIDs;

  var fieldList = [];
  fieldList.push(exports.buildHeader(messageLength, requestID, nodeID, opCode, isBigEndian));
  var buf = new XBuffer(8 + lenContextIDs, isBigEndian);
  buf.writeInt32(0, 0); // 4
  buf.writeInt32(1, 4); // 4
  for (var i = 0; i < contextIDs.length; i++) {
    buf.writeLong(contextIDs[i], 8 + i * 8);
  }

  fieldList.push(buf.toBuffer());
  return Buffer.concat(fieldList);
};

exports.buildQueryRequest = function (message, isBigEndian) {
  var opCode = message.OperationCode;
  var collectionName = message.CollectionFullName;
  var version = message.Version;
  var w = message.W;
  var padding = message.Padding;
  var flags = message.Flags;
  var requestID = message.RequestID;
  var skipRowsCount = message.SkipRowsCount;
  var returnRowsCount = message.ReturnRowsCount;
  var collByteArray = new Buffer('' + collectionName);
  debug('collByteArray: %j', collByteArray);
  var collectionNameLength = collByteArray.length;

  var query = BSON.serialize(message.Matcher, false, true, false);
  debug('query: %j', query);
  var fieldSelector = BSON.serialize(message.Selector, false, true, false);
  debug('fieldSelector: %j', fieldSelector);
  var orderBy = BSON.serialize(message.OrderBy, false, true, false);
  debug('orderBy: %j', orderBy);
  var hint = BSON.serialize(message.Hint, false, true, false);
  debug('hint: %j', hint);
  var nodeID = message.NodeID;
  // TODO
  // if (isBigEndian)
  // {
  //     BsonEndianConvert(query, 0, query.Length, true);
  //     BsonEndianConvert(fieldSelector, 0, fieldSelector.Length, true);
  //     BsonEndianConvert(orderBy, 0, orderBy.Length, true);
  //     BsonEndianConvert(hint, 0, hint.Length, true);
  // }

  var messageLength = padLength(MESSAGE_OPQUERY_LENGTH + collectionNameLength, 4) +
    padLength(query.length, 4) +
    padLength(fieldSelector.length, 4) +
    padLength(orderBy.length, 4) +
    padLength(hint.length, 4);

  var list = [];
  list.push(exports.buildHeader(messageLength, requestID, nodeID, opCode, isBigEndian));
  var buf = new XBuffer(32, isBigEndian);
  buf.writeInt32(version, 0); // 4 byte
  buf.writeInt16(w, 4); // 2
  buf.writeInt16(padding, 6); // 2
  buf.writeInt32(flags, 8); // 4
  buf.writeInt32(collectionNameLength, 12); // 4
  buf.writeLong(skipRowsCount, 16); // 8
  buf.writeLong(returnRowsCount, 24); // 8
  list.push(buf.toBuffer());

  var newCollectionName = new Buffer(collectionNameLength + 1);
  newCollectionName.fill(0);
  collByteArray.copy(newCollectionName, 0);

  list.push(padBuffer(newCollectionName, 4));
  list.push(padBuffer(query, 4));
  list.push(padBuffer(fieldSelector, 4));
  list.push(padBuffer(orderBy, 4));
  list.push(padBuffer(hint, 4));

  return Buffer.concat(list);
};

exports.buildGetMoreRequest = function (message, isBigEndian) {
  var opCode = message.OperationCode;
  var requestID = message.RequestID;
  var contextId = message.ContextIDList[0];
  var numReturned = message.NumReturned;
  var nodeID = message.NodeID;

  var messageLength = MESSAGE_OPGETMORE_LENGTH;

  var list = [];
  list.push(exports.buildHeader(messageLength, requestID, nodeID, opCode, isBigEndian));

  var buf = new XBuffer(12, isBigEndian);
  buf.writeLong(contextId, 0); // 8 bytes
  buf.writeInt32(numReturned, 8); // 4 bytes
  list.push(buf.toBuffer());

  return Buffer.concat(list);
};

exports.buildInsertRequest = function (message, isBigEndian) {
  var opCode = message.OperationCode;
  var collectionName = message.CollectionFullName;
  var version = message.Version;
  var w = message.W;
  var padding = message.Padding;
  var flags = message.Flags;
  var requestID = message.RequestID;
  var collByteArray = new Buffer('' + collectionName);
  var collectionNameLength = collByteArray.length;

  var insertor = BSON.serialize(message.Insertor, false, true, false);
  var nodeID = message.NodeID;

  // calculate the total length of the packet which to send
  var messageLength = MESSAGE_OPINSERT_LENGTH - 1 +
        padLength(collectionNameLength + 1, 4) +
        padLength(insertor.length, 4);
  // put all the part of packet into a list, and then transform the list into byte[]
  // we need byte[] while sending
  var list = [];
  // let's put the packet head into list
  list.push(exports.buildHeader(messageLength, requestID, nodeID, opCode, isBigEndian));

  var buf = new XBuffer(16, isBigEndian);
  buf.writeInt32(version, 0); // 4 bytes
  buf.writeInt16(w, 4); // 2 bytes
  buf.writeInt16(padding, 6); // 2 bytes
  buf.writeInt32(flags, 8); // 4 bytes
  buf.writeInt32(collectionNameLength, 12); // 4 bytes
  list.push(buf.toBuffer());

  // cl name also in the packet head, we need one more byte for '\0'
  var newCollectionName = new Buffer(collectionNameLength + 1);
  newCollectionName.fill(0);
  collByteArray.copy(newCollectionName, 0);

  list.push(padBuffer(newCollectionName, 4));
  // we have finish preparing packet head
  // let's put the content into packet
  list.push(padBuffer(insertor, 4));
  // transform the list into byte[]
  return Buffer.concat(list);
};

exports.buildDeleteRequest = function (message, isBigEndian) {
  var collectionName = message.CollectionFullName;
  var version = message.Version;
  var w = message.W;
  var padding = message.Padding;
  var flags = message.Flags;
  var requestID = message.RequestID;
  var nodeID = message.NodeID;
  var opCode = message.OperationCode;

  var collByteArray = new Buffer(collectionName);
  var collectionNameLength = collByteArray.length;

  var matcher = BSON.serialize(message.Matcher, false, true, false);
  var hint = BSON.serialize(message.Hint, false, true, false);

  var messageLength = padLength(MESSAGE_OPDELETE_LENGTH + collectionNameLength, 4) +
        padLength(matcher.length, 4) +
        padLength(hint.length, 4);

  var list = [];
  list.push(exports.buildHeader(messageLength, requestID, nodeID,
      opCode, isBigEndian));

  var buf = new XBuffer(16, isBigEndian);
  buf.writeInt32(version, 0); // 4 bytes
  buf.writeInt16(w, 4); // 2 bytes
  buf.writeInt16(padding, 6); // 2 bytes
  buf.writeInt32(flags, 8); // 4 bytes
  buf.writeInt32(collectionNameLength, 12); // 4 bytes

  list.push(buf.toBuffer());

  // cl name also in the packet head, we need one more byte for '\0'
  var newCollectionName = new Buffer(collectionNameLength + 1);
  newCollectionName.fill(0);
  collByteArray.copy(newCollectionName, 0);

  list.push(padBuffer(newCollectionName, 4));

  list.push(padBuffer(matcher, 4));

  list.push(padBuffer(hint, 4));

  return Buffer.concat(list);
};

exports.buildUpdateRequest = function (message, isBigEndian) {
  var collectionName = message.CollectionFullName;
  var version = message.Version;
  var w = message.W;
  var padding = message.Padding;
  var flags = message.Flags;
  var requestID = message.RequestID;
  var nodeID = message.NodeID;
  var opCode = message.OperationCode;

  var collByteArray = new Buffer(collectionName);
  var collectionNameLength = collByteArray.length;

  var matcher = BSON.serialize(message.Matcher, false, true, false);
  var hint = BSON.serialize(message.Hint, false, true, false);
  var modifier = BSON.serialize(message.Modifier, false, true, false);

  var messageLength = padLength(MESSAGE_OPUPDATE_LENGTH + collectionNameLength, 4) +
        padLength(matcher.length, 4) +
        padLength(modifier.length, 4) +
        padLength(hint.length, 4);

  var list = [];
  list.push(exports.buildHeader(messageLength, requestID, nodeID,
      opCode, isBigEndian));

  var buf = new XBuffer(16, isBigEndian);
  buf.writeInt32(version, 0); // 4 bytes
  buf.writeInt16(w, 4); // 2 bytes
  buf.writeInt16(padding, 6); // 2 bytes
  buf.writeInt32(flags, 8); // 4 bytes
  buf.writeInt32(collectionNameLength, 12); // 4 bytes

  list.push(buf.toBuffer());

  // cl name also in the packet head, we need one more byte for '\0'
  var newCollectionName = new Buffer(collectionNameLength + 1);
  newCollectionName.fill(0);
  collByteArray.copy(newCollectionName, 0);

  list.push(padBuffer(newCollectionName, 4));

  list.push(padBuffer(matcher, 4));

  list.push(padBuffer(modifier, 4));

  list.push(padBuffer(hint, 4));

  return Buffer.concat(list);
};
