'use strict';

const Test = require('tape');
const CircuitBreakerState = require('../index');

Test('initial state', (t) => {
    t.plan(10);

    const cb = new CircuitBreakerState();

    t.ok(cb.isClosed(), 'starts closed.');
    t.ok(!cb.isOpen(), 'not open.');
    t.ok(!cb.isHalfOpen(), 'not half open.');
    t.equal(cb._failures,0, 'no failures.');
    t.ok(cb._stats, 'stats exists.');
    t.equal(cb.maxFailures,3, 'maxFailures 3.');
    t.equal(cb.resetTimeout,10000, 'resetTimeout 10000.');

    const stats = cb.stats.snapshot();

    t.equals(stats.executions, 0, 'executions 0.');
    t.equal(stats.failures, 0, 'failures 0.');
    t.equal(stats.successes, 0, 'successes 0.');
});

Test('initial state with factory', (t) => {
    t.plan(10);

    const cb = CircuitBreakerState.create();

    t.ok(cb.isClosed(), 'starts closed.');
    t.ok(!cb.isOpen(), 'not open.');
    t.ok(!cb.isHalfOpen(), 'not half open.');
    t.equal(cb._failures,0, 'no failures.');
    t.ok(cb._stats, 'stats exists.');
    t.equal(cb.maxFailures,3, 'maxFailures 3.');
    t.equal(cb.resetTimeout,10000, 'resetTimeout 10000.');

    const stats = cb.stats.snapshot();

    t.equals(stats.executions, 0, 'executions 0.');
    t.equal(stats.failures, 0, 'failures 0.');
    t.equal(stats.successes, 0, 'successes 0.');
});

Test('stats', (t) => {
    t.plan(4);

    const cb = new CircuitBreakerState();
    const stats = cb.stats;

    stats.increment('successes');
    t.equal(stats._counts['successes'], 1, 'incremented successes.');
    stats.increment('failures');
    t.equal(stats._counts['failures'], 1, 'incremented failures.');
    stats.reset('successes');
    t.equal(stats._counts['successes'], 0, 'reset successes.');
    stats.resetAll();
    t.equal(stats._counts['failures'], 0, 'resetAll.');
});

Test('configure', (t) => {
    t.plan(2);

    const cb = new CircuitBreakerState({ maxFailures: 1, resetTimeout: 10 });

    t.equal(cb.maxFailures, 1, 'maxFailures set.');
    t.equal(cb.resetTimeout, 10, 'resetTimeout set.');
});

Test('configure with factory', (t) => {
    t.plan(2);

    const cb = CircuitBreakerState.create({ maxFailures: 1, resetTimeout: 10 });

    t.equal(cb.maxFailures, 1, 'maxFailures set.');
    t.equal(cb.resetTimeout, 10, 'resetTimeout set.');
});

Test('failure', (t) => {
    t.plan(4);

    const cb = new CircuitBreakerState();

    cb.fail();

    const stats = cb.stats.snapshot();

    t.ok(!stats.open, 'not open.');
    t.equal(stats.executions, 1, 'executions 1.');
    t.equal(stats.failures, 1, 'failures 1.');
    t.equal(stats.successes, 0, 'successes 0.');
});

Test('success', (t) => {
    t.plan(4);

    const cb = new CircuitBreakerState();

    cb.succeed();

    const stats = cb.stats.snapshot();

    t.ok(!stats.open, 'not open.');
    t.equal(stats.executions, 1, 'executions 1.');
    t.equal(stats.failures, 0, 'failures 0.');
    t.equal(stats.successes, 1, 'successes 1.');
});

Test('flip open', (t) => {
    t.plan(2);

    const cb = new CircuitBreakerState({ maxFailures: 1 });

    cb.fail();

    t.ok(cb.isOpen(), 'is open.');
    t.equal(cb._failures, 0, 'current failures count reset.');
});

Test('half open', (t) => {
    t.plan(2);

    const cb = new CircuitBreakerState({ maxFailures: 1, resetTimeout: 10 });

    cb.fail();

    t.ok(cb.isOpen(), 'is open.');

    setTimeout(() => {    
        t.ok(cb.isHalfOpen(), 'half open now.');
    }, 15);
});

Test('half open to open', (t) => {
    t.plan(3);
    const cb = new CircuitBreakerState({ maxFailures: 2, resetTimeout: 10 });

    cb.fail();
    cb.fail();

    t.ok(cb.isOpen(), 'is open.');

    setTimeout(() => {    
        t.ok(cb.isHalfOpen(), 'half open now.');
        cb.fail();
        t.ok(cb.isOpen(), 'is open again.');
    }, 15);
});

Test('half open to closed', (t) => {
    t.plan(4);
    const cb = new CircuitBreakerState({ maxFailures: 1, resetTimeout: 10 });

    cb.fail();

    t.true(cb.isOpen(), 'is open.');

    setTimeout(() => {    
        t.ok(cb.isHalfOpen(), 'half open now.');
        cb.succeed();
        t.ok(!cb.isOpen(), 'is not open again.');
        t.ok(!cb.isHalfOpen(), 'is not half open again.');
    }, 15);
});

Test('test returns error when open', (t) => {
    t.plan(4);

    const cb = new CircuitBreakerState({ maxFailures: 1 });

    cb.fail();

    t.ok(cb.isOpen(), 'is open.');

    const error = cb.test();

    if (!error) {
        t.fail('did not get error.');
    }

    t.equal(error.message, 'Circuit breaker is open');
    t.equal(error.name, 'CircuitBreakerOpenError');
    t.equal(error.code, 'EPERM');
});

Test('test does not return error when closed', (t) => {
    t.plan(1);

    const cb = new CircuitBreakerState();

    const error = cb.test();

    t.error(error, 'should not be an error.');
});

Test('reset increment to 0 when Number.MAX_SAFE_INTEGER exceeded', (t) => {
    t.plan(1);

    const cb = new CircuitBreakerState();

    const stats = cb.stats;

    stats._counts.executions = Number.MAX_SAFE_INTEGER;

    stats.increment('executions');

    t.equal(stats._counts.executions, 1, 'reset to 0 and then incremented.');
});