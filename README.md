# AlmightyModelManager
This is a very powerful helper to easily and fast construct a complex data model with various different custom object types and data structures.

You can get a declarative, data driven model with ease in very short time.

# Enabling on your model
To enable the AlmightyModelManager to manage your model, you simply need to call it to configure on your model:
```
    function YourModel() {}
    ...

    AlmightyModelManager.config(YourModel);
```

This static config method will setup the model so it can handle everything correctly based on your configuration and adds the `fillData` method to the constructor function of the model, which implements the core to the magic.

The configuration the `fillData` uses can be given explicitly as param. 
it will be saved in the `.dataConfiguration` property of the constructor
function (your model). Tt is, however, possible to set the configuration by setting the `.dataConfiguration` explicitly yourself:
```
function YourModel() {}

YourModel.dataConfiguration = {
    name: '',
    id: 0,
    magicObject: YourMagicObject
    urls: [YourModelURLs]
};

function YourMagicObject() {}
function YourModelURLs() {}

AlmightyModelManager.config(YourModelURLs, {
    url: '',
    position: ''
});
AlmightyModelManager.config(YourMagicObject, {
    id: ''
});
AlmightyModelManager.config(YourModel);
```

As you can see, this configuration is a simple data definition object in which each key-value configures a property of the filled instance.

The configuration may be one of:
- a constructor function
- an array with a constructor function as its first element
- an empty array

We suggest to use the explicit setup like for `YourModel` in the above example, because it is declarative, easy to understand and find and also is available all the time.
Also when the configuration object might be complex or consist of many properties, sending it in as a param to a function call, this could become unclear or unmanageable at some point.

# Filling, updating data and creating model objects
The central method is the `fillData` method the AlmightyModelManager adds to each model where it gets configured on. You simply call this method and hand in some data and the rest is up to the AlmightyModelManager's magic.

To make it easy and smooth we suggest you to form your model constructor so it calls the `fillData` method for you like this:
```
    function YourModel(data) {
        this.fillData(data);
    }
```

# Using the fillData method
The `fillData` method interprets the configuration options as follows:
- function: invoke the function asconstructor with the data as parameter
- array with constructor function as first element: will invoke the
  function as a constructor per element from the data property giving
  the data as single parameter and will create a new array from the
  resulting objects.
  in case the data value is not an array, it will create a new one with
  the respective object as single element. (default is an empty array)
- empty array: creates an array with data.
  if the data parameter is not an array it will create a new array with
  the respective object as single element.

when the instance:
... already contains a property with the same name as the property given
    in the data object, then the `fillData` method tries to not change
    its object identity.
    
when the value:
... is an object with a `fillData` method on its own, this method will
    get invoked with the new data.
    
... is an array, the `fillData` method empties the array and fills it
    with new objects.

# Transformation of input data
You can optionally define an array of functions which transform the raw input data to your needs before used to update or create the data model tree.

To do some data manipulation and further preparation of the incoming raw
data, the `onBeforeFill` property may be defined on the constructor.
This array is supposed to contain methods that filter the incoming raw
data and each return the manipulated data. The first method in the chain
will be invoked with the raw data as its only arguments. Each following
function will get invoked with the return value from previous function.
Finally, the object will be filled with the return value from the last
function.

For the functions in the `onBeforeFill` array, `this` will be a reference to the current object under construction.

This happens to be nice when you receive data from a Backend in a similar, yet not immediately usable structure like yours. Like when there are additional objects used in the Backend to wrap things for output, but you do not want to care about them in your data model or you need to keep a copy of the raw original data to do further magic inside of your model lateron (like cloning or returning fresh manipulated copies on demand).

Simply add it like this:
```
    YourModel.onBeforeFill = [
        removeWrapperObjects,
        appendRawDataToItems
    ];

    function removeWrapperObjects(data) {
        if (data && data.wrapperObject) {
            return data.wrapperObject;
        }

        return data;
    }

    function appendRawDataToItems(data) {
        // add rawData only to those objects where it is missing
        if (data && !data.rawData) {
            data.rawData = cloneDeep(data); // NOTE: cloneDeep must be implemented by you, to make this work ;-)
        }

        return data;
    }
```

# Do some magic after filling or updating data
After the object has been filled with new data, each function in the
`onAfterFill` array will be invoked. This enables you to do further data
initialization.

For the functions in the `onAfterFill` array, `this` will be a reference to the current object under construction.

# Automagic updates of dependant objects
It also enables you to now worry about triggering updates on objects which need to be updated when the original data changes. This is magically handled by the `dependant object` pattern implemented:
You simply implement it like this:
```
MyFancyObject.prototype.getSyncedObjectListForSlider = function getSyncedObjectListForSlider() {
    var sliderObjects = [];

    // this object instance of MyFancyObject contains a property "objectsToShow" which consists of an Array of Objects of the following structure:
    // {
    //    id: the unique objectid generated by a Backend, a number or string,
    //    imageSource: the url to the image to show, a string
    // }

    return this.createDependentObject(sliderObjects, updateSliderObjects);
}

function updateSliderConfig(objects) {
    var originalObjectsOnMyFancyObjectModel = this.objectsToShow;
    [].forEach(originalObjectsOnMyFancyObjectModel, function addConverted(obj, index) {
        // for the slides we need to be sure the id is always a string, 
        // never a simple number, so prefix it by "slide_".
        // also we need to have the image's source URL set to the property
        // img, not imageSource and to define a numbered offset, for which
        // we simply use the index
        objects.push({
            id: 'slide_' + obj.id);
            offset: index,
            img: obj.imageSource
        });
    });
}
```

# Examples
Examples and more information you can find in the Test Specs.
