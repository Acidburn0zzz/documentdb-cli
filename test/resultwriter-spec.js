var proxyquire =  require('proxyquire').noPreserveCache(),
    M = require('mstring'),
    utils = require('./utils');

describe('ResultWriter', () => {
    var ResultWriter, csvWriter;

    function setup() {
        csvWriter = jasmine.createSpyObj('csvWriter', ['writeRecord']);
        var csv = {
            createCsvStreamWriter: jasmine.createSpy().andReturn(csvWriter)
        };
        ResultWriter = proxyquire('../lib/resultwriter', {
            'ya-csv': csv
        });
    }

    describe('create', () => {
        beforeEach(() => {
            setup();
        });

        function testCreate(code, type) {
            expect(ResultWriter.create(code) instanceof type).toBe(true);
        }

        it('returns JsonWriter for j and json', () => {
            testCreate('j', ResultWriter.JsonWriter);
            testCreate('json', ResultWriter.JsonWriter);
        });

        it('returns XmlWriter for x and xml', () => {
            testCreate('x', ResultWriter.XmlWriter);
            testCreate('xml', ResultWriter.XmlWriter);
        });

        it('returns CsvWriter for c and csv', () => {
            testCreate('c', ResultWriter.CsvWriter);
            testCreate('csv', ResultWriter.CsvWriter);
        });

        it('returns TableWriter for t and table', () => {
            testCreate('t', ResultWriter.TableWriter);
            testCreate('table', ResultWriter.TableWriter);
        });

        it('throws for unknown code', () => {
            expect(ResultWriter.create.bind(null, 'abc')).toThrow();
        });
    });

    describe('JsonWriter', () => {
        var writer, output = '';

        beforeEach(function(){
            writer = new ResultWriter.JsonWriter();
            spyOn(console, 'log').andCallFake(function(text){
                output += text;
            });
        });

        afterEach(() => {
            console.log = console.log.originalValue;
        });

        it('writes json', () => {
            var result = [{
                title: 'abc',
                count: 54
            }];

            var json =  M(function(){ /***
            [{
                "title": "abc",
                "count": 54
            }]
            ***/});

            writer.start();
            writer.write(result);
            writer.end();

            expect(console.log).toHaveBeenCalled();
            utils.stringEqual(output, json);
        });
    });

    describe('XmlWriter', () => {
        var writer, output = '';

        beforeEach(function(){
            writer = new ResultWriter.XmlWriter();
            spyOn(console, 'log').andCallFake(function(text){
                output += text;
            });
        });

        afterEach(() => {
            console.log = console.log.originalValue;
        });

        it('writes xml', () => {
            var result = [{
                title: 'abc',
                count: 54
            }];

            var xml =  M(function(){ /***
            <?xml version="1.0"?>
            <result>
                <item>
                    <title>abc</title>
                    <count>54</count>
                </item>
            </result>
            ***/});

            writer.start();
            writer.write(result);
            writer.end();

            expect(console.log).toHaveBeenCalled();
            utils.stringEqual(output, xml);
        });
    });

    describe('TableWriter', () => {
        var writer, output = '';

        beforeEach(function(){
            writer = new ResultWriter.TableWriter();
            spyOn(console, 'log').andCallFake(function(text){
                output += text;
            });
        });

        afterEach(() => {
            console.log = console.log.originalValue;
        });

        it('writes tabular data', () => {
            var result = [{
                title: 'abc',
                count: 54
            }];

            var table =  M(function(){ /***
            title   count
            -----   -----
            abc     54
            ***/});

            writer.start();
            writer.write(result);
            writer.end();

            expect(console.log).toHaveBeenCalled();
            utils.stringEqual(output, table);
        });
    });

    describe('CsvWriter', () => {
        var writer, output = '';

        beforeEach(function(){
            csvWriter.writeRecord.reset();
            writer = new ResultWriter.CsvWriter();
        });

        it('writes csv', () => {
            var result = [{
                title: 'abc',
                count: 54
            }];

            writer.start();
            writer.write(result);
            writer.end();

            expect(csvWriter.writeRecord).toHaveBeenCalledWith(['title', 'count']);
            expect(csvWriter.writeRecord).toHaveBeenCalledWith(['abc', 54]);
        });
    });
});
