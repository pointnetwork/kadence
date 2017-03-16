Kad requires a storage layer to persist key-value pairs for the DHT. The 
expected interface for the supplied storage option is an object that exposes:

* `put(key {string}, value {object}, callback {function})`
* `get(key {string}, callback {function})`
* `del(key {string}, callback {function})`
* `createReadStream()`

This is a subset of the [LevelUP](https://github.com/Level/levelup) 
interface and as such, Kad can make use of any
[compatible storage backend](https://github.com/Level/levelup/wiki/Modules).
