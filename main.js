'use strict';
var adapter, initialize, key_ble, keyble, on_command_state, terminate, utils;

// Get common adapter utils
utils = require('@iobroker/adapter-core');

// Create Adapter instance
adapter = new utils.Adapter('keyble');

// Get keyble module
keyble = require('keyble');

// Reference to the device
key_ble = null;

// Called when the instance should be initialized
adapter.on('ready', function() {
  adapter.log.info(`Initializing instance using configuration: ${JSON.stringify(adapter.config)}`);
  initialize();
});

// Called if a subscribed state changes
adapter.on('stateChange', function(long_id, state) {
  var id;
  // Warning, state can be null if it was deleted
  adapter.log.info(`stateChange ${id}: ${JSON.stringify(state)}`);
  // you can use the ack flag to detect if it is status (true) or command (false)
  if (state && (!state.ack)) {
    id = long_id.slice(adapter.namespace.length + 1);
    on_command_state(id, state, state.val, long_id);
  }
});

// Called when the instance shall be terminated
// Callback has to be called under any circumstances!
adapter.on('unload', function(callback) {
  adapter.log.info("Terminating instance, cleaning up...");
  Promise.resolve(terminate()).then(function() {
    adapter.log.info("Successfully cleaned up.");
    callback();
  }).catch(function(error) {
    adapter.log.info("Error cleaning up!");
    callback();
  });
});

initialize = function() {
  key_ble = new keyble.Key_Ble({
    address: adapter.config.mac_address,
    user_id: adapter.config.user_id,
    user_key: adapter.config.user_key,
    auto_disconnect_time: adapter.config.auto_disconnect_time,
    status_update_time: adapter.config.status_update_time
  });
  key_ble.on('status_change', function(status_id, status_string) {
    adapter.setState('active', {
      val: status_id === 1,
      ack: true
    });
    adapter.setState('lock_state', {
      val: status_id,
      ack: true
    });
    if (status_id !== 1) {
      // Lock is not active
      adapter.setState('opened', {
        val: status_id === 4,
        ack: true
      });
      return adapter.setState('unlocked', {
        val: (status_id === 2) || (status_id === 4),
        ack: true
      });
    }
  });
  // For every state in the system there has to be also an object of type state
  // Here a simple keyble for a boolean variable named "testVariable"
  // Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
  adapter.setObjectNotExists('unlocked', {
    type: 'state',
    common: {
      name: 'unlocked',
      type: 'boolean',
      role: 'switch.lock.door',
      write: true
    },
    native: {}
  });
  adapter.setObjectNotExists('active', {
    type: 'state',
    common: {
      name: 'active',
      type: 'boolean',
      role: 'indicator.working',
      write: false
    },
    native: {}
  });
  adapter.setObjectNotExists('opened', {
    type: 'state',
    common: {
      name: 'opened',
      type: 'boolean',
      role: 'switch.lock.door',
      write: true
    },
    native: {}
  });
  adapter.setObjectNotExists('lock_state', {
    type: 'state',
    common: {
      name: 'lock_state',
      type: 'number',
      role: 'value.lock',
      write: false,
      states: {
        0: 'LOCKED',
        1: 'ACTIVE',
        2: 'UNLOCKED',
        4: 'OPEN'
      }
    },
    native: {}
  });
  // in this keyble all states changes inside the adapters namespace are subscribed
  adapter.subscribeStates('*');
};

on_command_state = function(id, state, value, long_id) {
  switch (id) {
    case 'unlocked':
      if (value) {
        key_ble.unlock();
      } else {
        key_ble.lock();
      }
      break;
    case 'opened':
      if (value) {
        key_ble.open();
      }
  }
};

terminate = function() {
  key_ble.disconnect();
  return key_ble = null;
};

//# sourceMappingURL=main.js.map
