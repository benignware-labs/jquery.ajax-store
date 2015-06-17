(function($) {
  
  //localStorage.clear();
  
  var defaults = {
    type: 'memory',
    expires: false,
    validate: false
  };
  
  /**
   * Memory Cache
   */
  var MemoryCache = (function() {
    var cache = {};
    return function MemCache(options) {
      options = typeof options === 'object' && options || {};
      options.store = options.store || 'ajax-store';
      cache[options.store] = cache[options.store] || {};
      // Get
      this.get = function(key, callback) {
        var store = cache[options.store];
        var result = store[key] && (!options.expire || store[key].timestamp > new Date().getTime() - options.expire) && store[key].value;
        if (callback) {
          callback.call(this, result);
        }
      };
      this.set = function(key, value, callback) {
        var store = cache[options.store];
        store[key] = {
          value: value,
          timestamp: new Date().getTime()
        };
        if (callback) {
          callback.call(this);
        }
      };
      this.select = function(filter, callback) {
        var store = cache[options.store];
        var result = [];
        for (var key in store) {
          if (store[key] && (!filter || filter(store[key]))) {
            result.push(key);
          }
        }
        callback(result);
      };
    };
  })();
  
  
  /**
   * Local Storage Cache
   */
  var LocalStorageCache = (function() {
    return function LocalStorageCache(options) {
      options = typeof options === 'object' && options || {};
      options.store = options.store || 'ajax-store';
      // Get
      this.get = function(key, callback) {
        var store = (JSON.parse(localStorage.getItem(options.store)) || {});
        callback.call(this, store[key]);
      };
      
      this.set = function(key, value, callback) {
        var store = (JSON.parse(localStorage.getItem(options.store)) || {});
        if (value === null || value === undefined) {
          delete store[key];
        } else {
          store[key] = value;
        }
        localStorage.setItem(options.store, JSON.stringify(store));
        callback();
      };
      
      this.select = function(filter, callback) {
        var store = (JSON.parse(localStorage.getItem(options.store)) || {});
        var result = [];
        for (var key in store) {
          if (store[key] && (!filter || filter(store[key]))) {
            result.push(key);
          }
        }
        callback(result);
      };
    };
  })();
  
  
  /**
   * IndexedDB Cache
   */
  
  var IndexedDBCache = (function() {
    return function IndexedDBCache(options) {
      options = typeof options === 'object' && options || {};
      options.store = options.store || 'ajax-store';
      var
        db,
        database = options.database || 'ajax-store',
        keyPath = "key",
        version = 1,
        open = function(complete) {
          if (!db) {
            var request = indexedDB.open(database, version);
            // Run migrations if necessary
            request.onupgradeneeded = function(e) {
              db = e.target.result;
              e.target.transaction.onerror = function() {
                deferred.reject();
              };
              if (db.objectStoreNames.contains(options.store)) {
                db.deleteObjectStore(options.store);
              }
              db.createObjectStore(options.store, { keyPath: keyPath });
            };
            request.onsuccess = function(e) {
              db = e.target.result;
              complete(db);
            };
            request.onblocked = request.onerror = function(e) {
              complete(false);
            };
          } else {
            complete(db);
          }
        };
        
      this.get = function(key, callback) {
        open(function(db) {
          var transaction = db.transaction([options.store]);
          var objectStore = transaction.objectStore(options.store);
          var request = objectStore.get(key);
          request.onerror = function(event) {
            callback(false);
          };
          request.onsuccess = function(event) {
            callback(request.result && request.result.data || null);
          };
        });
      };
      this.set = function(key, value, callback) {
        open(function(db) {
          var transaction = db.transaction([options.store], 'readwrite');
          var store = transaction.objectStore(options.store);
          var request;
          if (value === null) {
            // Delete
            var cursorRequest = store.openCursor();
            cursorRequest.onerror = function(error) {
              callback(false);
            };
            cursorRequest.onsuccess = function(evt) {                    
              var cursor = evt.target.result;
              if (cursor) {
                if (cursor.value[keyPath] === key) {
                  var curMoveReq = cursor.delete();
                  curMoveReq.onsuccess = function(evt) {
                  };
                  curMoveReq.onerror = function() {
                  };
                }
                cursor.continue();
              }
            };
          } else {
            // Write
            var object = {};
            object[keyPath] = key;
            object.data = value;
            request = store.put(object);
            request.onerror = function() {
              callback(false);
            };
          }
          transaction.oncomplete = function() {
            callback(true);
          };
        });
      };
      this.select = function(filter, callback) {
        open(function(db) {
          var trans = db.transaction(options.store, IDBTransaction.READ_ONLY);
          var store = trans.objectStore(options.store);
          var items = [];
          trans.oncomplete = function(evt) { 
            callback(items);
          };
          var cursorRequest = store.openCursor();
          cursorRequest.onerror = function(error) {
            callback(false);
          };
          cursorRequest.onsuccess = function(evt) {                    
            var cursor = evt.target.result;
            if (cursor) {
              var selected = filter(cursor.value.data);
              if (selected) {
                items.push(cursor.value[keyPath]);
              }
              cursor.continue();
            }
          };
        });
      };
    };
  })();
  
  
  var cacheTypes = {
    'memory': MemoryCache,
    'localstorage': LocalStorageCache,
    'indexedDB': IndexedDBCache
  };
  
  function parse(string, dataType) {
    var result;
    if (!result && (!dataType || dataType === 'xml')) {
      result = $.parseXML(string);
    }
    if (!result && (!dataType || dataType === 'json')) {
      result = $.parseJSON(string);
    }
    return result;
  }
  
  function getOpts(options) {
    if (typeof options === 'string') {
      options = {type: options};
    }
    var opts = $.extend(true, {}, defaults, options);
    return opts;
  }
  
  function lastModified(options, complete) {
    var jqXHR = $.ajax($.extend({}, options, {
      type: "HEAD",
      success: function(data) {
        // check modified
        var updated = new Date(jqXHR.getResponseHeader('Last-Modified')).getTime();
        complete(updated);
      },
      error: function() {
        complete(null);
      }
    }));
  }
  
  function clean(options, complete) {
    var store = cacheTypes[options.type] ? new cacheTypes[options.type]() : null;
    var filter = typeof options.expires === 'function' ? options.expires : function(value) {
      return typeof value.expires === 'boolean' ? value.expires : value.updated < (new Date()).getTime() - value.expires;
    };
    if (store) {
      store.select(filter, function(queue) {
        var next = function() {
          var key = queue.shift();
          if (key) {
            store.set(key, null, next);
          } else {
            complete();
          }
        };
        next();
      });
    } else {
      complete();
    }
  }
  
  function validate(result, options, complete) {
    if (!result) {
      complete(false);
      return;
    }
    var validateMethod = options.store.validate;
    if (typeof validateMethod === 'boolean' && validateMethod === false) {
      // Do not validate result
      complete(true);
      return; 
    }
    validateMethod = typeof validateMethod === 'function' && validateMethod || function(result, options, complete) {
      lastModified(options, function(updated) {
        complete(updated < result.updated);
      });
    };
    validateMethod(result, options, complete);
  }
  
  $.ajaxTransport("+*", function(options, originalOptions, jqXHR) {
    options = $.extend({}, options);
    if (options.type === 'GET' && options.store) {
      // Get Store Options
      options.store = getOpts(options.store);
      if (cacheTypes[options.store.type.toLowerCase()]) {
        // Valid Cache Implementation
        var store = new cacheTypes[options.store.type.toLowerCase()]();
        var aborted = false;
        return {
          send: function( headers, completeCallback ) {
            if (aborted) return;
            var id = options.url; // + JSON.stringify(options);
            // Clean
            clean(options.store, function() {
              // Get
              store.get(id, function(result) {
                // Validate
                validate(result, options, function(valid) {
                  if (aborted) return;
                  // Result
                  if (valid) {
                    // Cached
                    var data = parse(result.value, options.dataType);
                    completeCallback(200, 'Ok', {text: result.value});
                  } else {
                    // Load
                    jqXHR = $.ajax($.extend({}, options, {
                      store: false,
                      success: function(data) {
                        var result = {};
                        result[options.dataType] = data;
                        // Save
                        store.set(id, {value: jqXHR.responseText, updated: (new Date()).getTime(), expires: options.store.expires}, function() {
                          // Done
                          completeCallback(jqXHR.status, jqXHR.statusText, result, jqXHR.getAllResponseHeaders());
                        });
                      },
                      error: function() {
                        // Error
                        if (!aborted) {
                          completeCallback(jqXHR.status, jqXHR.statusText, {});
                        }
                      }
                    }));
                  }
                });
              });
            });
          },
          abort: function() {
            /* abort code */
            aborted = true;
            if (jqXHR) {
              jqXHR.abort();
            }
          }
        };
      }
    }
  });
  
})(jQuery);