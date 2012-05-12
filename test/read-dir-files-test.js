var path = require('path'),
    assert = require('assert'),
    vows = require('vows'),
    readDirFiles = require('../');

var content = {
  a: new Buffer('Hello world\n'),
  b: new Buffer('Hello ncp\n'),
  c: new Buffer(''),
  d: new Buffer(''),
  sub: {
    a: new Buffer('Hello nodejitsu\n'),
    b: new Buffer('')
  }
};

function getContent(content, encoding, recursive) {
  var encoded = {};

  if (typeof encoding == "boolean") {
    recursive = encoding;
    encoding = null;
  }
  typeof recursive == "undefined" && (recursive = true);
  typeof encoding == "string" || (encoding = null);

  Object.keys(content).forEach(function (key) {
    if (typeof content[key] === 'object' && content[key].constructor !== Buffer) {
      if (!recursive) {
        return;
      }
      return encoded[key] = getContent(content[key], encoding);
    }
    encoded[key] = encoding ? content[key].toString(encoding) : content[key];
  });
  return encoded;
}

vows.describe('read-dir-files/read').addBatch({
  'When using `read-dir-files`': {
    'and reading a directory (`readDirFiles.read("dir", cb)`)': {
      topic: function () {
        readDirFiles.read(path.join(__dirname, 'fixtures', 'dir'), this.callback);
      },
      'it should contain all files': function (data) {
        assert.isObject(data);
        assert.deepEqual(data, content);
      }
    },
    'and reading a directory (`readDirFiles.read("dir", "utf8", cb)`)': {
      topic: function () {
        readDirFiles.read(
          path.join(__dirname, 'fixtures', 'dir'),
          'utf8',
          this.callback
        );
      },
      'it should contain all files': function (data) {
        assert.isObject(data);
        assert.deepEqual(data, getContent(content, 'utf8'));
      }
    },
    'and non-recursively reading a directory (`readDirFiles.read("dir", false, cb)`)': {
      topic: function () {
        readDirFiles.read(
          path.join(__dirname, 'fixtures', 'dir'),
          false,
          this.callback
        );
      },
      'it should contain all files': function (data) {
        assert.isObject(data);
        assert.deepEqual(data, getContent(content, false));
      }
    }
  }
}).export(module);

