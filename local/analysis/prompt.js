
var Fiber = require('fibers');
var prompt = require('cli-prompt');

module.exports = function(text) {
  // Lowercase "fiber" will now reference the currently running fiber
  var fiber = Fiber.current;
  var res = null;

  prompt(text,function(val) {
    res = val;

    // This kicks the execution back to where the Fiber.yield() statement stopped it
    fiber.resume();
  });

  // Yield so the server can do something else
  Fiber.yield();

  // This doesn't happen until the callback calls fiber.run() above.
  return res;
}

