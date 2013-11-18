pouchdb search
===

```javascript
var Pouch = require('pouchdb');
Pouch.plugin('Search',require('./pouchdb.search'));

var db = Pouch('name');
db.search(func,options,callback);
db.search('design/name',options,callback);
```