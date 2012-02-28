var path = require('path'),
    assert = require('assert'),
    vows = require('vows'),
    readDirFiles = require('../');

var fixturesDir = path.join(__dirname, 'fixtures'),
    targetDir = path.join(fixturesDir, 'dir');
    
var list = [ 
  'dir/',
  'dir/a',
  'dir/b',
  'dir/c',
  'dir/d',
  'dir/sub/',
  'dir/sub/a',
  'dir/sub/b'
];

function assertIncludesAll(base, target) {
  for (var i = 0; i < base.length; i++) {
    assert.include(base, target[i]);
  }
}

vows.describe('read-dir-files/list').addBatch({
  'When using `read-dir-files`': {
    'the list() method': {
      'with no options': {
        topic: function () {
          readDirFiles.list(targetDir, this.callback);
        },
        'it should contain all files': function (_, data) {
          assert.isArray(data);
          assertIncludesAll(data, list.map(function (entry) {
            return path.join(fixturesDir, entry);
          }));
        }
      },
      'with { normalize: false }': {
        topic: function () {
          readDirFiles.list(targetDir, { normalize: false }, this.callback);
        },
        'it should contain all denormalized files': function (_, data) {
          assert.isArray(data);
          assertIncludesAll(data, list);          
        }
      },
      'with { recursive: false }': {
        topic: function () {
          readDirFiles.list(
            targetDir,
            { recursive: false },
            this.callback
          );
        },
        'it should contain only files in the top-level': function (data) {
          assert.isArray(data);
          assertIncludesAll(data, list.slice(0, list.length - 2).map(function (entry) {
            return path.join(__dirname, 'fixtures', entry);
          }));          
        }
      },
      "with a filter function": {
        topic: function () {
          readDirFiles.list(targetDir, { 
            filter: function (file) {
              return !/\/sub/.test(file);
            }
          }, this.callback);
        },
        'it should contain only files matching the filter': function (data) {
          assert.isArray(data);
          assertIncludesAll(data, list.slice(0, list.length - 3).map(function (entry) {
            return path.join(__dirname, 'fixtures', entry);
          }));          
        }
      },
      "when using events": {
        "the `directory` event": {
          topic: function () {
            var that = this,
                dirs = [];
            
            readDirFiles.list(targetDir, { normalize: false })
              .on('directory', function (dir) { dirs.push(dir) })
              .on('end', function () {
                that.callback(null, dirs);
              })
          },
          'it should contain all denormalized dirs': function (_, dirs) {
            assert.isArray(dirs);
            assert.lengthOf(dirs, 2);
            assertIncludesAll(dirs, [
              'dir/',
              'dir/sub/'
            ])
          }
        },
        "the `file` event": {
          topic: function () {
            var that = this,
                files = [];
            
            readDirFiles.list(targetDir, { normalize: false })
              .on('file', function (file) { files.push(file) })
              .on('end', function () {
                that.callback(null, files);
              })
          },
          'it should contain all denormalized files': function (_, files) {
            assert.isArray(files);
            assert.lengthOf(files, 6);
            assertIncludesAll(files, [ 
              'dir/a',
              'dir/b',
              'dir/c',
              'dir/d',
              'dir/sub/a',
              'dir/sub/b'
            ])
          }
        }
      }
    }
  }
}).export(module);

