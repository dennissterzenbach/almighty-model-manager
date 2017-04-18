var testObj;

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

AlmightyModelConstructor.config(AnotherEnhancedConstructor);
AlmightyModelConstructor.config(EnhancedConstructor);

testObj = new EnhancedConstructor(testData);