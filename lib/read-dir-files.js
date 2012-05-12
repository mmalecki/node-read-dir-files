var events = require('events'),
    fs = require('fs'),
    path = require('path'),
    async = require('async'),
    errs = require('errs');

//
// ### function readDirFiles(dir, encoding, recursive, callback)
// #### @dir {string} Directory to read files from
// #### @encoding {string} Files encoding. **Optional.**
// #### @recursive {boolean} Recurse into subdirectories? **Optional**, default `true`.
// #### @callback {function} Callback. **Optional.**
// Asynchronously reads all files from `dir` and returns them to the callback
// in form:
//
//     {
//       dir: {
//         file0: <Buffer ...>,
//         file1: <Buffer ...>,
//         sub: {
//          file0: <Buffer ...>
//        }
//      }
//    }
//
// Following calling conventions are supported:
//
//     readDirFiles.read(dir)
//     readDirFiles.read(dir, 'utf8')
//     readDirFiles.read(dir, 'utf8', true)
//     readDirFiles.read(dir, true)
//
// With or without callback.
//
exports.read = function (dir, encoding, recursive, callback) {
  var result = {}

  callback = arguments[arguments.length - 1];
  typeof callback == "function" || (callback = null);

  if (typeof encoding == "boolean") {
    recursive = encoding;
    encoding = null;
  }
  typeof recursive == "undefined" && (recursive = true);
  typeof encoding == "string" || (encoding = null);

  fs.readdir(dir, function (err, entries) {
    if (err) {
      return errs.handle(err, callback);
    }

    async.forEach(entries, function (entry, next) {
      var entryPath = path.join(dir, entry);
      fs.stat(entryPath, function (err, stat) {
        if (err) {
          return next(err);
        }

        if (stat.isDirectory()) {
          return (recursive || next()) && exports.read(
            entryPath, 
            encoding,
            function (err, entries) {
              if (err) {
                return next(err);
              }
              
              result[entry] = entries;
              next();
            }
          );
        }
        fs.readFile(entryPath, encoding, function (err, content) {
          if (err) {
            return next(err);
          }
          
          result[entry] = content;
          next();
        });
      });
    }, function (err) {
      callback && callback(err, result);
    });
  });
};

exports.readSync = function (dir, encoding, recursive) {
  var result = {};

  if (typeof encoding == "boolean") {
    recursive = encoding;
    encoding = null;
  }
  typeof recursive == "undefined" && (recursive = true);
  typeof encoding == "string" || (encoding = null);

  var entries = fs.readdirSync(dir);
  entries.forEach(function (entry) {
    var entryPath = path.join(dir, entry);
    if (fs.statSync(entryPath).isDirectory()) {
      return recursive && (result[entry] = exports.readSync(entryPath, encoding));
    }

    result[entry] = fs.readFileSync(entryPath, encoding);
  });
  return result;
};

//
// ### function listDirFiles(dir, options, callback)
// #### @dir {string} Directory to read files from.
// #### @options {Object} **Optional** Options for list directory files.
// ####    @options.recursive
// ####    @options.normalize
// #### @callback {function} **Optional** Continuation to pass control to when complete. 
//
// Asynchronously lists all files from `dir` and returns them to the callback
// in the form:
//
//     [
//       'dir',
//       'file0',
//       'file1'
//     ]
//
// Following calling conventions are supported:
//
//     readDirFiles.list(dir)
//     readDirFiles.list(dir, { recursive: false, normalize: false })
//
// With or without callback.
//
exports.list = function listDirFiles(dir, options, callback) {
  if (!callback && typeof options === 'function') {
    callback = options;
    options = null;
  }
  
  options         = options || {};
  options.baseDir = options.baseDir || (path.dirname(dir) + '/');
  
  if (dir[dir.length - 1] !== '/') {
    dir += '/';
  }
  
  var result    = [],
      lister    = new events.EventEmitter(),
      baseDir   = options.baseDir || '',
      denormDir = dir.replace(baseDir, ''),
      normalize,
      recursive; 
  
  normalize = typeof options.normalize !== 'undefined'
    ? options.normalize
    : true;
  
  recursive = typeof options.recursive !== 'undefined' 
    ? options.recursive
    : true;
  
  //
  // Helper function which pipes events from sublisting
  // emitters to the main listing emitter.
  //
  function pipeEvents(sublister) {
    sublister.on('directory', lister.emit.bind(lister, 'directory'));
    sublister.on('file', lister.emit.bind(lister, 'file'));
    sublister.once('end', function () {
      sublister.removeAllListeners('directory');
      sublister.removeAllListeners('file');
    });
  }
  
  //
  // Gets the `stats` for the full-path of the entry
  //
  function readEntry(entry, next) {
    var entryPath = path.join(dir, entry),
        denormPath = entryPath.replace(baseDir, '');
    
    fs.stat(entryPath, function (err, stat) {
      if (err) {
        return next(err);
      }
      else if (stat.isDirectory()) {
        if (!recursive) {
          result.push(normalize ? (entryPath + '/') : (entryPath.replace(baseDir, '') + '/'));
          return next();
        }
        
        return pipeEvents(exports.list(
          entryPath, 
          options,
          function (err, entries) {
            if (err) {
              return next(err);
            }
            
            result = result.concat(entries);
            next();
          }
        ));
      }
      
      lister.emit('file', normalize ? entryPath : denormPath);
      result.push(normalize ? entryPath : denormPath);
      next();
    });
  }

  result.push(normalize ? dir : denormDir);
  
  if (options.filter && !options.filter(dir)) {
    callback && callback(null, []);
    process.nextTick(function () { lister.emit('end') });
    return lister;
  }
  
  //
  // Read the `dir` asynchronously and process the entries
  //
  fs.readdir(dir, function (err, entries) {
    if (err) {
      return errs.handle(err, callback);
    }

    lister.emit('directory', normalize ? dir : denormDir);
    
    async.forEach(entries, readEntry, function (err) {
      callback && callback(err, result);
      lister.emit('end');
    });
  });
  
  return lister;
};
