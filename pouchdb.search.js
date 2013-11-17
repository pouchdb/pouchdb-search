"use strict";

var lunr = require('lunr');

var Search = function(db) {

  function viewQuery(fun, options) {
    var indexes = lunr(fun);
    //eval('fun = ' + fun.toString() + ';');
    db.changes({
      include_docs: true,
      onChange: function(doc) {
        // Don't index deleted or design documents
        if (!('deleted' in doc) && doc.id.indexOf('_design/') !== 0) {
          indexes.add(doc.doc);
        }
      },
      complete: function() {
        options.complete(null,indexes.search(options.q));
      }
    });
  }
  
  function httpQuery(name, opts, callback) {

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
      db.request({
        method: 'GET',
        url: '_design/' + parts[0] + '/_search/' + parts[1] + params
      }, callback);
  }

  function query(name, opts, callback) {
    if (typeof opts === 'function') {
      callback = opts;
      opts = {};
    }
    if(typeof callback === 'function'){
      opts.complete = callback;
    }

    if (db.type() === 'http') {
    return httpQuery(name, opts, callback);
  }else{
    return viewQuery(name, opts);
  }
}
  return {'search': query};
}

// Deletion is a noop since we dont store the results of the view
Search._delete = function() { };

module.exports = Search;
