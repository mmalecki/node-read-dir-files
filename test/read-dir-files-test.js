var path = require('path'),
    assert = require('assert'),
    vows = require('vows'),
    readDirFiles = require('../'),
    fixtures = path.join(__dirname, 'fixtures', 'dir');

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
    'asynchronously': {
      'reading a directory (`readDirFiles.read("dir", cb)`)': {
        topic: function () {
          readDirFiles.read(fixtures, this.callback);
        },
        'it should contain all files': function (data) {
          assert.isObject(data);
          assert.deepEqual(data, content);
        }
      },
      'reading a directory (`readDirFiles.read("dir", "utf8", cb)`)': {
        topic: function () {
          readDirFiles.read(fixtures, 'utf8', this.callback);
        },
        'it should contain all files': function (data) {
          assert.isObject(data);
          assert.deepEqual(data, getContent(content, 'utf8'));
        }
      },
      'non-recursively reading a directory (`readDirFiles.read("dir", false, cb)`)': {
        topic: function () {
          readDirFiles.read(fixtures, false, this.callback);
        },
        'it should contain all files': function (data) {
          assert.isObject(data);
          assert.deepEqual(data, getContent(content, false));
        }
      }
    },
    'synchronously': {
      'reading a directory (`readDirFiles.readSync("dir")`)': {
        topic: readDirFiles.readSync(fixtures),
        'it should contain all files': function (data) {
          assert.deepEqual(data, content);
        },
      },
      'reading a directory (`readDirFiles.readSync("dir", "utf8")`)': {
        topic: readDirFiles.readSync(fixtures, 'utf8'),
        'it should contain all files': function (data) {
          assert.deepEqual(data, getContent(content, 'utf8'));
        }
      },
      'non-recursively reading a directory (`readDirFiles.read("dir", false, cb)`)': {
        topic: readDirFiles.readSync(fixtures, false),
        'it should contain all files': function (data) {
          assert.deepEqual(data, getContent(content, false));
        }
      }
    }
  }
}).export(module);

