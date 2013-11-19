"use strict";

var lunr = require('lunr');
var collate = require('./collate');
var Search = function(db) {
  function viewQuery(fun, options) {
    var lunrfunc = function(){
      this.field('text');
      this.ref('id');
    };
    var indexes = {};
    indexes.default = lunr(lunrfunc);
    db.changes({
      include_docs: true,
      onChange: function(row) {

        // Don't index deleted or design documents
        if (row.id.indexOf('_design/') === 0) {
          return;
        }else if('deleted' in row){
          Object.keys(indexes).forEach(function(name){
            if(indexes[name].documentStore.has(row.id)){
              indexes[name].remove(row);
            }
          });
          return;
        }
        var efun;
        var doc = row.doc;
        var id = row.id;
        var text = {
          default:[]
        };
        var name;
        function index(name,value){
          if(!(name in indexes)){
            indexes[name]=lunr(lunrfunc);
          }
          if(!(name in text)){
            text[name]=[];
          }
          text[name].push(value);
        }
        eval('efun = ' + fun.toString() + ';');
        efun(doc);
        Object.keys(text).forEach(function(name){
          if(indexes[name].documentStore.has(id)) {
            indexes[name].update({id:id,text:text[name].join(' ')});
          }else{
            indexes[name].add({id:id,text:text[name].join(' ')});
         }
       });
     },
     complete: function() {
      var q = options.q;
      var index = 'default';
      if(~q.indexOf(':')){
        q = q.split(':');
        index = q[0];
        q=q[1];
      }
      var results = indexes[index].search(q).map(function(a){
        return a.ref;
      });
      var finopts = {};
      finopts.keys = results;
      if(options.include_docs){
        finopts.include_docs = options.include_docs;
      }
      if(options.conflicts){
        finopts.conflicts = options.conflicts;
      }
      if(options.attachments){
        finopts.attachments = options.attachments;
      }
      var sort = options.sort;
      if(sort){
        if(sort.slice(0,1)==='-'){
          finopts.decending = true;
          sort = sort.slice(1);
        }
        sort = sort.split('<')[0];
      }
      db.allDocs(finopts,function(err,result){
        if(err){
          options.copmlete(err);
          return;
        }
        if(sort){
          result.rows.sort(function(a,b){
            return collate(a[sort],b[sort]);
          });
        }
        options.complete(null,result);
      });
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
    }else if(typeof name ==='function'){
      return viewQuery(name, opts);
    }
    var parts = name.split('/');
    db.get('_design/' + parts[0], function(err, doc) {
      if (err) {
        if (callback){
          callback(err);
        }
        return;
      }
      if (!doc.indexes[parts[1]]) {
        if (callback) {
          callback({ error: 'not_found', reason: 'missing_named_view' });
        }
        return;
      }
      return viewQuery(doc.indexes[parts[1]].index,opts);
    });
  }
  return {'search': query};
}

// Deletion is a noop since we dont store the results of the view
Search._delete = function() { };

module.exports = Search;
