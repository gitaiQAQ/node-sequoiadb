/**
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

var expect = require('expect.js');
var helper = require('../lib/helper');
var constants = require('../lib/const');
var Message = require('../lib/message');
var Long = require('../lib/long');

describe('/lib/helper.js', function () {
  it('buildSystemInfoRequest should ok', function () {
    var result = new Buffer([
      0xff, 0xff, 0xff, 0xff, 0xfc, 0xfd, 0xfe, 0xff,
      0x0c, 0x00, 0x00, 0x00]);
    expect(helper.buildSystemInfoRequest()).to.eql(result);
  });

  it('md5 should ok', function () {
    var val = helper.md5("test");
    expect(val).to.be("098f6bcd4621d373cade4e832627b4f6");
  });

  it('buildAuthMessage', function () {
    var result = new Buffer([
      0x00, 0x00, 0x00, 0x44, 0x00, 0x00, 27, 88,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x27, 0x00, 0x00, 0x00,
      0x02, 0x55, 0x73, 0x65, 0x72, 0x00, 0x05, 0x00,
      0x00, 0x00, 0x75, 0x73, 101,  0x72, 0x00, 0x02,
      0x50, 0x61, 0x73, 0x73, 119, 100, 0x00, 0x07,
      0x00, 0x00, 0x00, 0x73, 0x65, 0x63, 0x72, 0x65,
      0x74, 0x00, 0x00, 0x00]);

    var message = new Message(constants.Operation.MSG_AUTH_VERIFY_REQ);
    message.RequestID = Long.ZERO;
    var buff = helper.buildAuthMessage(message, "user", "secret", true);
    expect(buff).to.eql(result);
  });

  it('buildHeader', function () {
    var nodeId = new Buffer(12).fill(0);
    var opcode = constants.Operation.MSG_AUTH_VERIFY_REQ;
    var buf = helper.buildHeader(10, Long.ZERO, nodeId, opcode, true);
    expect(buf).to.eql(new Buffer([
      0x00, 0x00, 0x00, 0x0a, 0x00, 0x00, 0x1b, 0x58,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00]));
  });

  it('buildDisconnectRequest', function () {
    var buf = helper.buildDisconnectRequest(true);
    expect(buf).to.eql(new Buffer([
      0x00, 0x00, 0x00, 0x1c, 0x00, 0x00, 0x07, 0xd8,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00]));
  });

  it('buildKillCursorMessage', function () {
    var message = new Message(constants.Operation.OP_KILL_CONTEXT);
    message.ContextIDList = [Long.NEG_ONE];
    var buf = helper.buildKillCursorMessage(message, true);
    expect(buf).to.eql(new Buffer([
      0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x07, 0xd7,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x01, 0xff, 0xff, 0xff, 0xff,
      0xff, 0xff, 0xff, 0xff]));
  });

  it('buildQueryRequest', function () {
    var message = new Message(constants.Operation.OP_QUERY);
    message.CollectionFullName = '$create collection';
    message.Version = constants.DEFAULT_VERSION;
    message.W = constants.DEFAULT_W;
    message.Padding = 0;
    message.Flags = 0;
    message.NodeID = constants.ZERO_NODEID;
    message.RequestID = Long.ZERO; // 0
    message.SkipRowsCount = Long.ZERO; // 0
    message.ReturnRowsCount = Long.NEG_ONE; // -1

    var matcher = {};
    matcher[constants.FIELD_NAME] = 'collectionspace' + "." + 'collection';
    // matcher
    message.Matcher = matcher;
    // selector
    message.Selector = {};
    // orderBy
    message.OrderBy = {};
    // hint
    message.Hint = {};

    var buff = helper.buildQueryRequest(message, false);
    expect(buff).to.eql(new Buffer([
      // ===== header =========
      0x94, 0x00, 0x00, 0x00, // message length
                              0xd4, 0x07, 0x00, 0x00, // operate code
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,                         // nodeid 12 bytes
                              0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,                         // request id
      // =====
                              0x01, 0x00, 0x00, 0x00, // version
      0x00, 0x00, // W
                  0x00, 0x00, // padding
                              0x00, 0x00, 0x00, 0x00, // flag
      0x12, 0x00, 0x00, 0x00, // collection name length
                              0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, // skipRowsCount
                              0xff, 0xff, 0xff, 0xff,
      0xff, 0xff, 0xff, 0xff, // returnRowsCount
      // ===== '$create collection'
                              0x24, 99,   114,  101,
      97,  116,  101,  32,  99,  111,  108,  108,
      101,  99,  116,  105,  111,  110, 0x00, 0x00,
      // matcher
      0x2a, 0x00, 0x00, 0x00, 0x02, 0x4e, 0x61, 109,
      101,  0x00, 27,   0x00, 0x00, 0x00, 99,   111,
      108,  108,  101,  99,   116,  105,  111,  110,
      115,  112,  97,   99,   101,  46,   99,   111,
      108,  108,  101,  99,   116,  105,  111,  110,
      0x00, 0x00, 0x00, 0x00,
      // selector
      0x05, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      // orderby
      0x05, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      // hint
      0x05, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
  });

  it('buildGetMoreRequest', function () {
    var message = new Message(constants.Operation.OP_GETMORE);
    message.NodeID = constants.ZERO_NODEID;
    message.ContextIDList = [Long.ZERO];
    message.RequestID = Long.ZERO;
    message.NumReturned = -1;

    var buff = helper.buildGetMoreRequest(message, false);
    expect(buff).to.eql(new Buffer([
      // ===== header =========
      0x28, 0x00, 0x00, 0x00, // message length
                              0xd5, 0x07, 0x00, 0x00, // operate code
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,                         // nodeid 12 bytes
                              0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,                         // request id
      // =====
                              0x00, 0x00, 0x00, 0x00, // version
      0x00, 0x00, // W
                  0x00, 0x00, // padding
                              0xff, 0xff, 0xff, 0xff]));
  });

  it('buildInsertRequest', function () {
    var insertor = {"name":"sequoiadb"};
    insertor[constants.OID] = '559be45c7560a7727c2b61bb';
    var message = new Message(constants.Operation.OP_INSERT);
    message.Version = constants.DEFAULT_VERSION;
    message.W = constants.DEFAULT_W;
    message.Padding = 0;
    message.CollectionFullName = 'collectionspace' + "." + 'collection';
    message.NodeID = constants.ZERO_NODEID;
    message.RequestID = Long.ZERO;
    message.Insertor = insertor;

    var buff = helper.buildInsertRequest(message, false);
    expect(buff).to.eql(new Buffer([
      // ===== header =========
      0x84, 0x00, 0x00, 0x00, // message length
                              0xd2, 0x07, 0x00, 0x00, // operate code
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,                         // nodeid 12 bytes
                              0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,                         // request id
      // ===== playload
                              0x01, 0x00, 0x00, 0x00, // version
      0x00, 0x00, // W
                  0x00, 0x00, // padding
                              0x00, 0x00, 0x00, 0x00, // flag
      0x1a, 0x00, 0x00, 0x00, // collection name length
                              0x63, 0x6f, 0x6c, 0x6c,
      0x65, 0x63, 0x74, 0x69, 0x6f, 0x6e, 0x73, 0x70,
      0x61, 0x63, 0x65, 0x2e, 0x63, 0x6f, 0x6c, 0x6c,
      0x65, 0x63, 0x74, 0x69, 0x6f, 0x6e, 0x00, 0x00, // newCollectionName
      // ===== 'insertor'
      0x3b, 0x00, 0x00, 0x00, 0x02, 0x6e, 0x61, 0x6d,
      0x65, 0x00, 0x0a, 0x00, 0x00, 0x00, 0x73, 0x65,
      0x71, 0x75, 0x6f, 0x69, 0x61, 0x64, 0x62, 0x00,
      0x02, 0x5f, 0x69, 0x64, 0x00, 0x19, 0x00, 0x00,
      0x00, 53,   53,   57,   98,   101,  52,   53,
      99,   55,   53,   54,   48,   97,   55,   55,
      50,   55,   99,   50,   98,   54,   49,   98,
      98, 0, 0, 0]));
  });

  it('buildDeleteRequest', function () {
    var message = new Message();

    message.OperationCode = constants.Operation.OP_DELETE;
    message.Version = constants.DEFAULT_VERSION;
    message.W = constants.DEFAULT_W;
    message.Padding = 0;
    message.Flags = 0;
    message.NodeID = constants.ZERO_NODEID;
    message.CollectionFullName = 'collectionspace' + "." + 'collection';
    message.RequestID = Long.ZERO;
    message.Matcher = {};
    message.Hint = {};

    var buff = helper.buildDeleteRequest(message, false);
    expect(buff).to.eql(new Buffer([
      // ===== header =========
      0x58, 0x00, 0x00, 0x00, // message length
                              0xd6, 0x07, 0x00, 0x00, // operate code
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,                         // nodeid 12 bytes
                              0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,                         // request id
      // ===== playload
                              0x01, 0x00, 0x00, 0x00, // version
      0x00, 0x00, // W
                  0x00, 0x00, // padding
                              0x00, 0x00, 0x00, 0x00, // flag
      0x1a, 0x00, 0x00, 0x00, // collection name length
                              0x63, 0x6f, 0x6c, 0x6c,
      0x65, 0x63, 0x74, 0x69, 0x6f, 0x6e, 0x73, 0x70,
      0x61, 0x63, 0x65, 0x2e, 0x63, 0x6f, 0x6c, 0x6c,
      0x65, 0x63, 0x74, 0x69, 0x6f, 0x6e, 0x00, 0x00, // newCollectionName
      // ===== 'matcher'
      0x05, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      // ===== hint
      0x05, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
  });

  it('buildUpdateRequest', function () {
    var message = new Message();

    message.OperationCode = constants.Operation.OP_UPDATE;
    message.Version = constants.DEFAULT_VERSION;
    message.W = constants.DEFAULT_W;
    message.Padding = 0;
    message.Flags = 0;
    message.NodeID = constants.ZERO_NODEID;
    message.CollectionFullName = 'collectionspace' + "." + 'collection';
    message.RequestID = Long.ZERO;
    message.Matcher = {name: "sequoiadb"};
    message.Hint = {};
    message.Modifier = {'$set': {age: 25}};

    var buff = helper.buildUpdateRequest(message, false);
    expect(buff).to.eql(new Buffer([
      // ===== header =========
      0x88, 0x00, 0x00, 0x00, // message length
                              0xd1, 0x07, 0x00, 0x00, // operate code
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,                         // nodeid 12 bytes
                              0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,                         // request id
      // ===== playload
                              0x01, 0x00, 0x00, 0x00, // version
      0x00, 0x00, // W
                  0x00, 0x00, // padding
                              0x00, 0x00, 0x00, 0x00, // flag
      0x1a, 0x00, 0x00, 0x00, // collection name length
                              0x63, 0x6f, 0x6c, 0x6c,
      0x65, 0x63, 0x74, 0x69, 0x6f, 0x6e, 0x73, 0x70,
      0x61, 0x63, 0x65, 0x2e, 0x63, 0x6f, 0x6c, 0x6c,
      0x65, 0x63, 0x74, 0x69, 0x6f, 0x6e, 0x00, 0x00, // newCollectionName
      // ===== matcher
      0x19, 0x00, 0x00, 0x00, 0x02, 0x6e, 0x61, 0x6d,
      0x65, 0x00, 0x0a, 0x00, 0x00, 0x00, 0x73, 0x65,
      0x71, 0x75, 0x6f, 0x69, 0x61, 0x64, 0x62, 0x00,
      // ===== modifitor
      0x00, 0x00, 0x00, 0x00, 0x19, 0x00, 0x00, 0x00,
      0x03, 0x24, 0x73, 101,  116,  0x00, 0x0e, 0x00,
      0x00, 0x00, 0x10, 97,   103,  101,  0x00, 0x19,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      // ===== hint
      0x05, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
  });
});
