Kad plugins are a simple way to package additional features. A plugin is just 
a function that receives an instance of {@link KademliaNode} returned from 
calling `require('kad')(options)`. This function can then apply any decorations 
desired.

### Contributed Plugins

* [kad-quasar](https://github.com/kadtools/kad-quasar) | [@bookchin](https://github.com/bookchin)
* [kad-spartacus](https://github.com/kadtools/kad-spartacus) | [@bookchin](https://github.com/bookchin)
* [kad-traverse](https://github.com/kadtools/kad-traverse) | [@bookchin](https://github.com/bookchin)
* [kad-onion](https://github.com/kadtools/kad-onion) | [@bookchin](https://github.com/bookchin)
* [kad-hibernate](https://github.com/kadtools/kad-hibernate) | [@bookchin](https://github.com/bookchin)

> Submit a pull request if you'd like yours added to this list!

### Example: "Howdy, Neighbor" Plugin

```js
/**
 * Example "howdy, neighbor" plugin
 * @function
 * @param {KademliaNode} node
 */
module.exports = function(node) {

  const { identity } = node;

  /**
   * Respond to HOWDY messages
   */
  node.use('HOWDY', (req, res) => {
    res.send(['howdy, neighbor']);
  });

  /**
   * Say howdy to our nearest neighbor
   */
  node.sayHowdy = function(callback) {
    let neighbor = [
      ...node.router.getClosestContactsToKey(identity).entries()
    ].shift();
    
    node.send('HOWDY', ['howdy, neighbor'], neighbor, callback);
  };

};
```


