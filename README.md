jquery.ajax-store
-----------------

> JQuery Ajax Cache

## Usage

Cache any resources loaded via GET into localStorage:
```js
$.ajaxSetup({
  store: {
    type: 'localstorage',
    validate: true,
    expires: 10 * 1000
  }
});
```

## Options

### Ajax Options
<table>
  <tr>
    <th>Name</th>
    <th>Description</th>
  </tr>
  <tr>
    <td>store</td>
    <td>
      A string specifying a store type, a boolean value whether to enable store or an object containing store options (See below).
    </td>
  </tr>
</table>

### Store Options
<table>
  <tr>
    <th>Name</th>
    <th>Description</th>
  </tr>
  <tr>
    <td>expires</td>
    <td>
      Time in milliseconds when the entry should expire. Set to `false`, if entry should not expire at all. Defaults to `false`. 
    </td>
  </tr>
  <tr>
    <td>type</td>
    <td>
      A string specifying a store type. One of `memory`, `localStorage`, `indexedDB`. Defaults to `memory`.
    </td>
  </tr>
  <tr>
    <td>validate</td>
    <td>
      A boolean value specifying whether to send a head request in order to validate `Last Modified`-header against the entry timestamp. You can also pass in a custom function with signature `function (complete)` where you need to pass in a boolean result by asynchronously calling `complete(boolean)` after processing is done. Defaults to `false`. 
    </td>
  </tr>
</table>