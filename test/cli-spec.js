var proxyquire = require('proxyquire').noPreserveCache(),
    Q = require('q'),
    _ = require('underscore'),
    utils = require('./utils');

describe('DocumentDBCli', function () {
    var prompt, dbservice, options, invoker, resultWriter, messages, exit, cli, optionsHost;

    function setup() {
        prompt = {
            on: jasmine.createSpy()
        };
        dbservice = {};
        options = {};
        invoker = {};
        resultWriter = { create: jasmine.createSpy() };
        messages = {};
        exit = jasmine.createSpy();
        optionsHost = 'https://documents.example.com';

        var DocumentDBCli = proxyquire('../lib/cli', {
            './prompt': jasmine.createSpy().andReturn(prompt),
            './docdb': jasmine.createSpy().andReturn(dbservice),
            './options': jasmine.createSpy().andReturn(options),
            './commands': { Invoker: jasmine.createSpy().andReturn(invoker) },
            './resultwriter': resultWriter,
            './messages': jasmine.createSpy().andReturn(messages),
            '../external/exit': exit
        });
        cli = new DocumentDBCli();

        options.init = jasmine.createSpy();
        options.getConnectionInfo = jasmine.createSpy().andCallFake(function () { return { host: optionsHost }; });
        options.args = {};
        messages.connecting = jasmine.createSpy();
    }

    describe('run', function () {
        beforeEach(function () {
            setup();
        });

        it('assumes interactive mode if query is not specified', function () {
            options.args = {};
            testInteractiveMode(true);
        });

        it('assumes non-interactive mode if query is specified', function () {
            options.args = { query: '.tables' };
            testInteractiveMode(false);
        });

        it('exits on connection error', function (done) {
            var err = jasmine.any(Object);
            dbservice.connect = jasmine.createSpy().andReturn(Q.reject(err));
            messages.connectionerror = jasmine.createSpy();

            exit.andCallFake(function (code) {
                expect(code).toEqual(-1);
                expect(messages.connectionerror).toHaveBeenCalledWith(err);
                done();
            });

            cli.run([], {});
        });

        it('runs the command if specified in query argument', function (done) {
            var command = '.collections';
            options.args = { query: command };
            dbservice.connect = jasmine.createSpy().andReturn(Q());
            invoker.run = function (line) {
                expect(line).toEqual(command);
                done();
            };

            cli.run([], {});
        });

        it('combines commands if ends with slash', function (done) {
            options.args = {};
            dbservice.connect = jasmine.createSpy().andReturn(Q());
            var commands = ['select 1\\', 'from dual'];
            invoker.run = jasmine.createSpy().andReturn(Q());
            messages.connected = jasmine.createSpy();
            messages.welcome = jasmine.createSpy();

            var lineCallback;

            var nextFuncs = [function (code) {
                lineCallback(commands[0]);
            }, function (code) {
                lineCallback(commands[1]);
                expect(invoker.run).toHaveBeenCalledWith('select 1\r\nfrom dual');
                expect(invoker.run.callCount).toEqual(1);
                done();
            }];

            prompt.next = jasmine.createSpy().andCallFake(function (code) {
                var impl = nextFuncs.shift();
                impl(code);
            });

            cli.run([], {});
            lineCallback = prompt.on.argsForCall[0][1];
        });

        it('does not exit if command returns an error', function (done) {
            options.args = {};
            dbservice.connect = jasmine.createSpy().andReturn(Q());
            var err = new Error();
            var command = '.collections';
            invoker.run = jasmine.createSpy().andReturn(Q.reject(err));
            messages.connected = jasmine.createSpy();
            messages.welcome = jasmine.createSpy();
            messages.error = jasmine.createSpy();
            var lineCallback;

            var nextFuncs = [function (code) {
                lineCallback(command);
                expect(invoker.run).toHaveBeenCalledWith(command);
            }, function (code) {
                expect(messages.error).toHaveBeenCalledWith(err);
                expect(code).toEqual(-1);
                done();
            }];

            prompt.next = jasmine.createSpy().andCallFake(function (code) {
                var impl = nextFuncs.shift();
                impl(code);
            });

            cli.run([], {});
            lineCallback = prompt.on.argsForCall[0][1];
        });

        function testInteractiveMode(expectedValue) {
            dbservice.connect = jasmine.createSpy().andReturn(Q());

            cli.run([], {});

            expect(messages.interactiveMode).toEqual(expectedValue);
        }
    });
});