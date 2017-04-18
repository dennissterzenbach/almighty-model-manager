process.env.NODE_ENV = 'test';

var AlmightyModelManager = require('./almightyModelManager');
var chai = require('chai');
var sinon = require('sinon');
var should = chai.should;

describe('AlmightyModelManager', function() {
    var testData = {
        simpleProperty: 'simpleProperty',
        objProperty1: {
            simpleProperty: 'innerSimpleProperty',
            objProperty2: 'innerObjProperty2',
        },
        objProperty2: 'objProperty2',
        arrayProperty1: ['arrayProperty1.1', 'arrayProperty1.2'],
        arrayProperty2: ['arrayProperty2.1', 'arrayProperty2.2'],
        arrayProperty3: 'arrayProperty3',
        arrayProperty4: 'arrayProperty4',
        arrayProperty5: [1, 2, 3, 4, 5],
        listProperty: {
            c1: 'item1',
            c2: 'item2'
        },
        simpleNumber: 1,
        simpleBoolean: true,
        simpleString: 'abc'
    };

    function SimpleConstructor(data) {
        this.data = data;
    }

    function EnhancedConstructor(data) {
        this.fillData(data);
    }

    function AnotherEnhancedConstructor(data) {
        this.fillData(data);
    }

    beforeEach(function() {
        AnotherEnhancedConstructor.dataConfiguration = {
            simpleProperty: SimpleConstructor,
            objProperty2: undefined
        };

        EnhancedConstructor.dataConfiguration = {
            simpleProperty: undefined,
            objProperty1: AnotherEnhancedConstructor,
            objProperty2: SimpleConstructor,
            arrayProperty1: [],
            arrayProperty2: [SimpleConstructor],
            arrayProperty3: [],
            arrayProperty4: [SimpleConstructor],
            simpleNumber: 'Number',
            simpleBoolean: 'Boolean',
            simpleString: 'String'
        };

        AlmightyModelManager.config(AnotherEnhancedConstructor);
        AlmightyModelManager.config(EnhancedConstructor);
    });

    describe('.config()', function() {
        it('adds new static methods to the prototype', function() {
            chai.expect(EnhancedConstructor.prototype.fillData).to.be.a('function');
        });

        it('throws circular dependency error', function() {
            function A() {}

            function B() {}

            A.dataConfiguration = {b: B};
            B.dataConfiguration = {a: A};

            chai.expect(function() {
                AlmightyModelManager.config(A);
                AlmightyModelManager.config(B);
            }).to.throw(/^detected circular constructor reference for/);
        });
    });

    describe('instantiating without data', function() {
        var testObj;
        beforeEach(function() {
            testObj = new EnhancedConstructor();
        });

        it('sets properties to undefined', function() {
            chai.expect(testObj.hasOwnProperty('simpleProperty')).to.be.true;
            chai.expect(testObj.simpleProperty).to.be.undefined;
        });

        it('sets properties to objects withouth data', function() {
            chai.expect(testObj.hasOwnProperty('objProperty1')).to.be.true;
            chai.expect(testObj.objProperty1).to.be.instanceof(AnotherEnhancedConstructor);
            chai.expect(testObj.objProperty1.simpleProperty.data).to.be.undefined;
            chai.expect(testObj.hasOwnProperty('objProperty2')).to.be.true;
            chai.expect(testObj.objProperty2).to.be.instanceof(SimpleConstructor);
        });

        it('creates empty arrays', function() {
            chai.expect(testObj.arrayProperty1.length).to.eql(0);
            chai.expect(testObj.arrayProperty2.length).to.eql(0);
        });
    });

    describe('instantiating with data', function() {
        var testObj;
        beforeEach(function() {
            testObj = new EnhancedConstructor(testData);
        });

        it('keeps simple properties as is', function() {
            chai.expect(testObj.simpleProperty).to.eql('simpleProperty');
        });

        it('recursively creates objects for properties with an enhanced constructor', function() {
            chai.expect(testObj.objProperty1).to.be.instanceof(AnotherEnhancedConstructor);
            chai.expect(testObj.objProperty1.simpleProperty).to.be.instanceof(SimpleConstructor);
            chai.expect(testObj.objProperty1.simpleProperty.data).to.eql('innerSimpleProperty');
            chai.expect(testObj.objProperty1.objProperty2).to.eql('innerObjProperty2');
        });

        it('creates objects for properties with simple constructors', function() {
            chai.expect(testObj.objProperty2 instanceof SimpleConstructor).to.be.true;
            chai.expect(testObj.objProperty2.data).to.eql('objProperty2');
        });

        it('keeps arrays without given constructor as they are', function() {
            chai.expect(testObj.arrayProperty1.length).to.eql(2);
            chai.expect(testObj.arrayProperty1[0]).to.eql('arrayProperty1.1');
            chai.expect(testObj.arrayProperty1[1]).to.eql('arrayProperty1.2');
        });

        it('converts arrays with given constructor to arrays with converted data', function() {
            chai.expect(testObj.arrayProperty2.length).to.eql(2);
            chai.expect(testObj.arrayProperty2[0] instanceof SimpleConstructor).to.be.true;
            chai.expect(testObj.arrayProperty2[0].data).to.eql('arrayProperty2.1');
            chai.expect(testObj.arrayProperty2[1] instanceof SimpleConstructor).to.be.true;
            chai.expect(testObj.arrayProperty2[1].data).to.eql('arrayProperty2.2');
        });

        it('converts properties that have been configured as arrays to arrays', function() {
            chai.expect(testObj.arrayProperty3.length).to.eql(1);
            chai.expect(testObj.arrayProperty3[0]).to.eql('arrayProperty3');
            chai.expect(testObj.arrayProperty4.length).to.eql(1);
            chai.expect(testObj.arrayProperty4[0]).to.be.instanceof(SimpleConstructor);
            chai.expect(testObj.arrayProperty4[0].data).to.eql('arrayProperty4');
        });

        it('sets numbers to the given value', function() {
            chai.expect(testObj.simpleNumber).to.eql(1);
        });

        it('sets boolean to the given value', function() {
            chai.expect(testObj.simpleBoolean).to.be.true;
        });

        it('sets strings to the given string', function() {
            chai.expect(testObj.simpleString).to.eql('abc');
        });

    });

    describe('emptying an existing object', function() {
        var testObj;

        beforeEach(function() {
            testObj = new EnhancedConstructor(testData);
            testObj.emptyData();
        });

        it('deletes simple properties', function() {
            chai.expect(testObj.simpleProperty).to.be.undefined;
            chai.expect(testObj.objProperty2.data).to.be.undefined;
        });

        it('empties objects with an "emptyData" method', function() {
            chai.expect(testObj.objProperty1.simpleProperty.data).to.be.undefined;
        });

        it('empties arrays', function() {
            chai.expect(testObj.arrayProperty1).to.be.empty;
            chai.expect(testObj.arrayProperty2).to.be.empty;
            chai.expect(testObj.arrayProperty3).to.be.empty;
            chai.expect(testObj.arrayProperty4).to.be.empty;
        });

        it('does not change identity of objects with a empty method', function() {
            var oldObjProperty1;

            testObj.fillData({
                objProperty1: {
                    simpleProperty: 'an inner simple property',
                },
            });

            oldObjProperty1 = testObj.objProperty1;
            testObj.emptyData();

            chai.expect(testObj.objProperty1).to.equal(oldObjProperty1);
        });

        it('does not change identity of arrays', function() {
            var oldArr1;
            var oldArr2;
            var oldArr3;
            var oldArr4;

            testObj.fillData({
                arrayProperty1: ['a'],
                arrayProperty2: ['b'],
                arrayProperty3: 'c',
                arrayProperty4: 'd',
            });

            oldArr1 = testObj.arrayProperty1;
            oldArr2 = testObj.arrayProperty2;
            oldArr3 = testObj.arrayProperty3;
            oldArr4 = testObj.arrayProperty4;

            testObj.emptyData();

            chai.expect(testObj.arrayProperty1).to.equal(oldArr1);
            chai.expect(testObj.arrayProperty2).to.equal(oldArr2);
            chai.expect(testObj.arrayProperty3).to.equal(oldArr3);
            chai.expect(testObj.arrayProperty4).to.equal(oldArr4);
        });

        it('does not change properties that are not listed in the dataConfiguration', function() {
            testObj.fillData({
                someUnconfiguredProperty: 1
            });
            testObj.emptyData();
            chai.expect(testObj.someUnconfiguredProperty).to.eql(1);
        });
    });

    describe('filling with new data', function() {
        var testObj;
        beforeEach(function() {
            testObj = new EnhancedConstructor(testData);
        });

        it('overwrites simple properties', function() {
            testObj.fillData({
                simpleProperty: 'new simple property',
            });
            chai.expect(testObj.simpleProperty).to.eql('new simple property');
        });

        it('empties properties that have no new data', function() {
            testObj.fillData({});
            chai.expect(testObj.simpleProperty).to.be.undefined;
        });

        it('does not change the identity of objects with a fill method', function() {
            var oldObjProperty1 = testObj.objProperty1;

            testObj.fillData({
                objProperty1: {
                    simpleProperty: 'new inner simple property',
                },
            });

            chai.expect(testObj.objProperty1).to.equal(oldObjProperty1);
            chai.expect(testObj.objProperty1.simpleProperty.data).to.eql('new inner simple property');
        });

        it('does change the identity of objects without a fill method', function() {
            var oldObjProperty2 = testObj.objProperty2;

            testObj.fillData({
                objProperty2: 'new objProperty2',
            });

            chai.expect(testObj.objProperty2).not.to.eql(oldObjProperty2);
            chai.expect(testObj.objProperty2.data).to.eql('new objProperty2');
            chai.expect(testObj.objProperty2 instanceof SimpleConstructor).to.be.true;
        });

        it('does not change the identity of arrays', function() {
            var oldArr1 = testObj.arrayProperty1;
            var oldArr2 = testObj.arrayProperty2;
            var oldArr3 = testObj.arrayProperty3;
            var oldArr4 = testObj.arrayProperty4;

            testObj.fillData({
                arrayProperty1: ['a'],
                arrayProperty2: ['b'],
                arrayProperty3: 'c',
                arrayProperty4: 'd',
            });

            chai.expect(testObj.arrayProperty1).to.eql(oldArr1);
            chai.expect(testObj.arrayProperty2).to.eql(oldArr2);
            chai.expect(testObj.arrayProperty3).to.eql(oldArr3);
            chai.expect(testObj.arrayProperty4).to.eql(oldArr4);
        });

        describe('when an onBeforeFill property is set', function() {
            function TestFn() {}

            TestFn.dataConfiguration = {};

            beforeEach(function() {
                AlmightyModelManager.config(TestFn);
            });

            describe('when the onBeforeFill property is an empty array', function() {
                beforeEach(function() {
                    TestFn.onBeforeFill = [];
                });

                it('should not change the data', function() {
                    var testObj = new TestFn();
                    testObj.fillData({a:1});
                    chai.expect(testObj.a).to.eql(1);
                });
            });

            describe('when the onBeforeFill property is not an array', function() {
                beforeEach(function() {
                    TestFn.onBeforeFill = 'ceci n\'est pas un array';
                });

                it('should not change the data', function() {
                    var testObj = new TestFn();
                    testObj.fillData({a:1});
                    chai.expect(testObj.a).to.eql(1);
                });
            });

            describe('when the onBeforeFill property is an array that does not contain a function', function() {
                beforeEach(function() {
                    TestFn.onBeforeFill = [1, 'ceci n\'est pas une function'];
                });

                it('should not change the data', function() {
                    var testObj = new TestFn();
                    testObj.fillData({a:1});
                    chai.expect(testObj.a).to.eql(1);
                });
            });

            describe('when the onBeforeFill property is an array of functions', function() {
                var fn1;
                var fn2;
                var fn3;

                beforeEach(function() {
                    fn1 = sinon.stub().returns({a:2});
                    fn2 = sinon.stub().returns({a:2, b:1});
                    fn3 = sinon.stub().returns({a:4});
                    TestFn.onBeforeFill = [fn1, fn2, fn3];
                });

                it('should call each function on the new obj', function() {
                    var testObj = new TestFn();
                    testObj.fillData({a:1});
                    chai.expect(fn1.calledOn(testObj)).to.be.true;
                    chai.expect(fn2.calledOn(testObj)).to.be.true;
                    chai.expect(fn3.calledOn(testObj)).to.be.true;
                });

                it('should call the first function with the original data', function() {
                    var testObj = new TestFn();
                    testObj.fillData({a:1});
                    chai.expect(fn1.calledWith({a:1})).to.be.true;
                });

                it('should call the following function with the return value of the previous functions', function() {
                    var testObj = new TestFn();
                    testObj.fillData({a:1});
                    chai.expect(fn2.calledWith({a:2})).to.be.true;
                    chai.expect(fn3.calledWith({a:2, b:1})).to.be.true;
                });

                it('should fill the object with the return value from the last function', function() {
                    var testObj = new TestFn();
                    testObj.fillData({a:1});
                    chai.expect(testObj.a).to.eql(4);
                });
            });
        });

        describe('when an onAfterFill property is an array of function', function() {
            var fn1;
            var fn2;
            var fn3;

            function TestFn() {}

            TestFn.dataConfiguration = {};

            beforeEach(function() {
                AlmightyModelManager.config(TestFn);
            });

            beforeEach(function() {
                fn1 = sinon.spy();
                fn2 = sinon.spy();
                fn3 = sinon.spy();
                TestFn.onAfterFill = [fn1, fn2, fn3];
            });

            it('should call each function on the new obj', function() {
                var testObj = new TestFn();
                testObj.fillData({a:1});
                chai.expect(fn1.calledOn(testObj)).to.be.true;
                chai.expect(fn2.calledOn(testObj)).to.be.true;
                chai.expect(fn3.calledOn(testObj)).to.be.true;
            });
        });

        it('updates dependent arrays', function() {
            var tmpDepObj = testObj.createDependentObject([], function(obj) {
                var i;

                obj.length = 0;

                for (i = 0; i < this.arrayProperty5.length; i++) {
                    if (this.arrayProperty5[i] % 2) {
                        obj.push(this.arrayProperty5[i]);
                    }
                }
            });

            chai.expect(tmpDepObj).to.eql([1,3,5]);
            testObj.fillData({
                arrayProperty5: [7,8,9,10,11]
            });
            chai.expect(tmpDepObj).to.eql([7,9,11]);
        });

        it('uses arguments for dependent objects', function() {
            function innerString(obj, suffix) {
                obj.data = this.simpleProperty.substring(1, 4) + suffix;
            }

            var depObj = new SimpleConstructor('');

            testObj.createDependentObject(depObj, innerString, ['+test suffix']);
            chai.expect(depObj.data).to.eql('imp+test suffix');

            testObj.fillData({
                simpleProperty: 'newnewnew'
            });
            chai.expect(depObj.data).to.eql('ewn+test suffix');

        });

        it('calls registered afterFill callbacks', function() {
            var testCallback = sinon.spy();
            var revokeCallbackFn = testObj.afterFill(testCallback);

            testObj.fillData({
                arrayProperty5: [1,2,3]
            });
            chai.expect(testCallback.called).to.be.true;

            revokeCallbackFn();
            testCallback.reset();

            testObj.fillData({
                arrayProperty5: [1,2,3]
            });
            chai.expect(testCallback.called).to.be.false;
        });

        describe('when revoking a afterFill callback more than once', function() {
            it('should not throw an error', function() {
                var testCallback = sinon.spy();
                var revokeCallbackFn = testObj.afterFill(testCallback);

                chai.expect(function() {
                    revokeCallbackFn();
                    revokeCallbackFn();
                    revokeCallbackFn();
                    revokeCallbackFn();
                }).not.to.throw(Error);
            });
        });
    });

    describe('when using object as constructor function for config', function() {
        it('should read the object\'s constructor', function() {
            function TestModel() {}

            chai.expect(TestModel.prototype.fillData).not.to.be.a('function');

            AlmightyModelManager.config(new TestModel());
            chai.expect(TestModel.prototype.fillData).to.be.a('function');
        });
    });

    describe('when using object as configuration parameter for config', function() {
        it('should use the object as dataConfiguration', function() {
            function TestModel() {}
            var customDataConfig = {
                items: ['String']
            };

            AlmightyModelManager.config(TestModel, customDataConfig);
            chai.expect(TestModel.dataConfiguration).to.be.equal(customDataConfig);
        });
    });

    describe('when dataConfiguration._dynamicProperties is set to `false`', function() {
        it('should not take create properties from data, but only from dataConfiguration', function() {
            function TestModel(data) {
                this.fillData(data);
            }

            TestModel.dataConfiguration = {
                _dynamicProperties: false,
                id: 'String'
            };

            AlmightyModelManager.config(TestModel);

            var testObj = new TestModel({
                id: '123',
                notExistingProperty: 'value'
            });

            chai.expect(testObj.id).to.be.eql('123');
            chai.expect(testObj.notExistingProperty).to.be.undefined;

            testObj.fillData({
                id: '345',
                anotherNotExistingProperty: 'value'
            });

            chai.expect(testObj.id).to.be.eql('345');
            chai.expect(testObj.anotherNotExistingProperty).to.be.undefined;
        });
    });

    describe('using onBeforeFill', function() {
        it('should not influence instances created from undefined data', function() {
            function ItemsListModel(data) {
                this.fillData(data);
            }

            AlmightyModelManager.config(ItemsListModel);

            ItemsListModel.dataConfiguration = {
                items: [ItemModel]
            };

            ////////////////////////////////////////////////////////////////////////////////////////

            function ItemModel(data) {
                this.fillData(data);
            }
            AlmightyModelManager.config(ItemModel);

            ItemModel.dataConfiguration = {
                name: 'String'
            };

            ////////////////////////////////////////////////////////////////////////////////////////

            ItemModel.onBeforeFill = [
                insertItemsObjectFromData
            ];
            function insertItemsObjectFromData(data) {
                return {
                    items: data
                };
            }

            ////////////////////////////////////////////////////////////////////////////////////////

            var model = new ItemsListModel();
            chai.expect(model.items).to.have.length(0);
        });
    });

    describe('generateUniqueObjectId', function() {
        it('should be a function callable on the object', function() {
            function TestModel(data) {
                this.fillData(data);
            }

            AlmightyModelManager.config(TestModel);

            TestModel.dataConfiguration = {
                dummy: 'String'
            };

            ////////////////////////////////////////////////////////////////////

            var model = new TestModel();

            chai.expect(model.generateUniqueObjectId).to.be.a('function');
        });

        it('should be automatically be called by instanciating a model, because fillData does call it', function() {
            function TestModel(data) {
                this.fillData(data);
            }

            AlmightyModelManager.config(TestModel);

            TestModel.dataConfiguration = {
                dummy: 'String'
            };

            ////////////////////////////////////////////////////////////////////

            var model = new TestModel();
            chai.expect(model._objectId).to.be.a('string');
        });

        it('should create _objectId property on the object', function() {
            function TestModel(data) {
                this.fillData(data);
            }

            AlmightyModelManager.config(TestModel);

            TestModel.dataConfiguration = {
                dummy: 'String'
            };

            ////////////////////////////////////////////////////////////////////

            var model = new TestModel();
            model.generateUniqueObjectId();

            chai.expect(model._objectId).to.be.a('string');
        });

        it('should use given uniqueObjectIdPrefix as prefix string', function() {
            function TestModel(data) {
                this.fillData(data);
            }

            AlmightyModelManager.config(TestModel);

            TestModel.uniqueObjectIdPrefix = 'HitMeBaby#';

            TestModel.dataConfiguration = {
                dummy: 'String'
            };

            ////////////////////////////////////////////////////////////////////

            // make sure there is no objectid to cause it to be created
            var model = new TestModel();
            delete model._objectId;

            model.generateUniqueObjectId();

            chai.expect(model._objectId).to.contain('HitMeBaby#');
        });

        describe('when _objectId already exists', function() {
            it('should do nothing', function() {
                function TestModel(data) {
                    this.fillData(data);
                }

                AlmightyModelManager.config(TestModel);

                TestModel.dataConfiguration = {
                    dummy: 'String'
                };

                ////////////////////////////////////////////////////////////////

                var model = new TestModel();
                var objectId = model._objectId;

                model.generateUniqueObjectId();

                chai.expect(model._objectId).to.be.equal(objectId);
            });
        });
    });

    describe('updateFillFlag', function() {
        // this is doing things which are time critical / based.
        // so we should make a reliable basis to test its effect by using sinon.
        var clock;

        beforeEach(activateFakeClock);
        afterEach(resetClock);

        function activateFakeClock() {
            clock = sinon.useFakeTimers();
        }

        function resetClock() {
            if (clock) {
                clock.reset();
            }
        }

        it('should create the `_lastDataUpdate` attribute on the object when filling data', function() {
            clock.tick(200);

            function TestModel(data) {
                this.fillData(data);
            }

            AlmightyModelManager.config(TestModel);

            TestModel.dataConfiguration = {
                dummy: 'String'
            };

            ////////////////////////////////////////////////////////////////////

            var model = new TestModel();

            chai.expect(model._lastDataUpdate).to.be.at.least(200);
        });

        it('should update the `_lastDataUpdate` attribute on the object when filling data', function() {
            clock.tick(200);

            function TestModel(data) {
                this.fillData(data);
            }

            AlmightyModelManager.config(TestModel);

            TestModel.dataConfiguration = {
                dummy: 'String'
            };

            ////////////////////////////////////////////////////////////////////

            var model = new TestModel({dummy: 'X'});
            var updatedFlag = model._lastDataUpdate;

            clock.tick(200);
            model.fillData({dummy: 'Y'});

            chai.expect(model._lastDataUpdate).to.be.above(updatedFlag);
        });

        it('should create and update the `_lastDataUpdate` attribute on the object after filling', function() {
            clock.tick(200);

            function TestModel(data) {
                this.fillData(data);
            }

            AlmightyModelManager.config(TestModel);

            TestModel.dataConfiguration = {
                dummy: 'String'
            };

            ////////////////////////////////////////////////////////////////////

            var model = new TestModel();
            var updatedFlag = model._lastDataUpdate;

            clock.tick(200);
            model.updateFillFlag();

            chai.expect(model._lastDataUpdate).to.be.above(updatedFlag);
        });
    });
});
