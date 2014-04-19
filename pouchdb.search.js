"use strict";

var lunr = require('lunr');
var collate = require('pouchdb-collate');
var lie = require('lie');

function lunrfunc() {
  this.field('text');
  this.ref('id');
};

function viewQuery(db, fun, indexes, options) {
  return lie(function(fulfill, reject) {
    indexes.
    default = lunr(lunrfunc);
    db.changes({
      include_docs: true,
      onChange: function(row) {
        // Don't index deleted or design documents
        if (row.id.indexOf('_design/') === 0) {
          return;
        } else if (row.id.indexOf('_local/') === 0) {
            return;
        } else if ('deleted' in row) {
          Object.keys(indexes).forEach(function(name) {
            if (indexes[name].documentStore.has(row.id)) {
              indexes[name].remove(row);
            }
          });
          return;
        }
        var efun;
        var doc = row.doc;
        var id = row.id;
        var text = {
          default: []
        };
        var name;

        function index(name, value) {
          if (!(name in indexes)) {
            indexes[name] = lunr(lunrfunc);
          }
          if (!(name in text)) {
            text[name] = [];
          }
          text[name].push(value);
        }
        eval('efun = ' + fun.toString() + ';');
        efun(doc);
        Object.keys(text).forEach(function(name) {
          if (indexes[name].documentStore.has(id)) {
            indexes[name].update({
              id: id,
              text: text[name].join(' ')
            });
          } else {
            indexes[name].add({
              id: id,
              text: text[name].join(' ')
            });
          }
        });
      },
      complete: function() {
        var q = options.q;
        var index = 'default';
        if (~q.indexOf(':')) {
          q = q.split(':');
          index = q[0];
          q = q[1];
        }
        var results = indexes[index].search(q).map(function(a) {
          return a.ref;
        });
        var finopts = {};
        finopts.keys = results;
        if (options.include_docs) {
          finopts.include_docs = options.include_docs;
        }
        if (options.conflicts) {
          finopts.conflicts = options.conflicts;
        }
        if (options.attachments) {
          finopts.attachments = options.attachments;
        }
        var sort = options.sort;
        if (sort) {
          if (sort.slice(0, 1) === '-') {
            finopts.decending = true;
            sort = sort.slice(1);
          }
          sort = sort.split('<')[0];
        }
        fulfill(db.allDocs(finopts).then(function(result) {
          if (sort) {
            result.rows.sort(function(a, b) {
              return collate(a[sort], b[sort]);
            });
          }
          return result;
        }));
      }
    });
  });
}

function httpQuery(db, name, opts) {
  // List of parameters to add to the PUT request
  var params = [];
  if (typeof opts.q !== 'undefined') {
    params.push('q=' + opts.q);
  }
  if (typeof opts.include_docs !== 'undefined') {
    params.push('include_docs=' + opts.include_docs);
  }
  if (typeof opts.limit !== 'undefined') {
    params.push('limit=' + opts.limit);
  }
  if (typeof opts.sort !== 'undefined') {
    params.push('sort=' + opts.sort);
  }
  if (typeof opts.bookmark !== 'undefined') {
    params.push('bookmark=' + opts.bookmark);
  }
  if (typeof opts.stale !== 'undefined') {
    params.push('stale=' + stale);
  }

  // If keys are supplied, issue a POST request to circumvent GET query string limits
  // see http://wiki.apache.org/couchdb/HTTP_view_API#Querying_Options

  // Format the list of parameters into a valid URI query string
  params = params.join('&');
  params = params === '' ? '' : '?' + params;

  var parts = name.split('/');
  return db.request({
    method: 'GET',
    url: '_design/' + parts[0] + '/_search/' + parts[1] + params
  });
}

function query(db, name, opts) {
  if (db.type() === 'http') {
    return httpQuery(db, name, opts);
  } else if (typeof name === 'function') {
    return viewQuery(db, name, {
      default: lunr(lunrfunc)
    }, opts);
  }
  var parts = name.split('/');
  return db.get('_design/' + parts[0]).then(function(doc) {
    if (!doc.indexes[parts[1]]) {
      throw {
        error: 'not_found',
        eason: 'missing_named_view'
      };
    }
    return viewQuery(db, doc.indexes[parts[1]].index, {
      default: lunr(lunrfunc)
    }, opts);
  });
}

module.exports = function(name, opts, callback) {
  var db = this;

  var resp = query(db, name, opts);
  if (typeof callback === 'function') {
    return resp.then(function(answer) {
      return callback(null, answer);
    }, callback);
  } else {
    return resp;
  }
};
