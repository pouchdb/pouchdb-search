pouchdb search
===

```javascript
var Pouch = require('pouchdb');
Pouch.plugin('Search',require('./pouchdb.search'));

var db = Pouch('name');
db.search(func,options,callback);
db.search('design/name',options,callback);
```

In prgress, known issues:

- like the pouch mapreduce and spatial plugins it does reindex with each query
- only supports default indexes at the moment.
