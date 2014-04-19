pouchdb search
===

```
$ npm install pouchdb-search
```

```javascript
var Pouch = require('pouchdb');
Pouch.plugin({'search': require('pouchdb-search')});

var db = Pouch('name');
db.search(func,options,callback);
db.search('design/name',options,callback);
```

In prgress, known issues:

- like the pouch mapreduce and spatial plugins it does reindex with each query
- ~~only supports default indexes at the moment.~~ Only supports queries from one index at a time
