/**
 * This is a very powerful helper to easily and fast construct a complex data
 * model with various different custom object types and data structures.
 * 
 * For examples how to use the AlmightyModelManager and its features,
 * please see the unit test specs.
 *
 * @author  Nikolas Schmidt-Voigt <nikolas.schmidt-voigt@posteo.de>
 * @author  Dennis Sterzenbach <dennis.sterzenbach@gmail.com>
 */
function AlmightyModelManager() {
}

if (module) {
    module.exports = AlmightyModelManager;
}

/**
 * this config helper function does add a `fillData` method to the 
 * constructor function of the model.
 *
 * the configuration the `fillData` uses can be given explicitly as param. 
 * it will be saved in the `.dataConfiguration` property of the constructor
 * function. it is, however, possible to set the configuration by setting
 * the `.dataConfiguration` explicitly yourself.
 *
 * the configuration is a simple data definition object in which each 
 * key-value configures a property of the filled instance.
 * 
 * The configuration may be one of:
 * - a constructor function:
 * - an array with a constructor function as its first element
 * - an empty array
 *
 * @param {function} constructorFn the constructor function
 * @param {[object]} configuration the configuration
 */
AlmightyModelManager.config = function config(constructorFn, configuration) {
    // required for uniqueId / _objectId property
    var almightyModelManager = {
        config: this.config,
        uniqueIdCounter: 0
    };

    if (typeof constructorFn === 'undefined' || (typeof constructorFn !== 'object' && typeof constructorFn !== 'function')) {
        return; // do nothing when there is no usable constructor given
    }

    // a constructor for objects that can be filled via a `fillData` method
    // and convert their data according to a predefined configuration.

    // detect if we got an object instance or the constructor function (as expected).
    if (typeof constructorFn === 'object') {
        // got object instead of class, so use its constructor function as constructorFn
        constructorFn = constructorFn.constructor;
    }

    if (typeof configuration === 'object') {
        constructorFn.dataConfiguration = configuration;
    }

    detectCircularDependenciesInConstructorsetup(constructorFn.dataConfiguration, []);

    /**
     * abstract: this method will fill the current instance with converted data
     *
     * this method will copy each property from the data object to the current
     * instance. all configured properties might be converted. If the data 
     * object given lacks a configured property, it will be created at the
     * current instance with a default value.
     *
     * the `fillData` method interprets the configuration options as follows:
     * - function: invoke the function asconstructor with the data as parameter
     * - array with constructor function as first element: will invoke the
     *   function as a constructor per element from the data property giving
     *   the data as single parameter and will create a new array from the
     *   resulting objects.
     *   in case the data value is not an array, it will create a new one with
     *   the respective object as single element. (default is an empty array)
     * - empty array: creates an array with data.
     *   if the data parameter is not an array it will create a new array with
     *   the respective object as single element.
     *
     * when the instance:
     * ... already contains a property with the same name as the property given
     *     in the data object, then the `fillData` method tries to not change
     *     its object identity.
     *     
     * when the value:
     * ... is an object with a `fillData` method on its own, this method will
     *     get invoked with the new data.
     *     
     * ... is an array, the `fillData` method empties the array and fills it
     *     with new objects.
     *
     * To do some data manipulation and further preparation of the incoming raw
     * data, the `onBeforeFill` property may be defined on the constructor.
     * This array is supposed to contain methods that filter the incoming raw
     * data and each return the manipulated data. The first method in the chain
     * will be invoked with the raw data as its only arguments. Each following
     * function will get invoked with the return value from previous function.
     * Finally, the object will be filled with the return value from the last
     * function.
     *
     * After the object has been filled with new data, each function in the
     * `onAfterFill` array will be invoked. This enables you to do further data
     * initialization.
     *
     * For the functions in the `onBeforeFill` array and those in the 
     * `onAfterFill` array, `this` will be a reference to the current object
     * under construction.
     *
     * @param {object} data the date to fill the current instance with
     * @return {object} the current instance
     */
    constructorFn.prototype.fillData = function(data) {
        var prop;

        this.generateUniqueObjectId();

        // only execute onBeforeFill for valid data (i.e. not undefined)
        if (typeof data !== 'undefined') {
            // filter the raw data through the onBeforeFill method chain
            data = invokeMethodChain(constructorFn.onBeforeFill, this, [data], true);
        }

        // make sure data is valid from now on:
        data = data || {};

        // check if properties missing in dataConfiguration will dynamically be created
        var createDynamicProperties = true;
        if (typeof constructorFn.dataConfiguration._dynamicProperties !== 'undefined') {
            createDynamicProperties = !!constructorFn.dataConfiguration._dynamicProperties;
        }

        this.emptyData(data);

        // create properties in the `this` instance according to the data and dataConfiguration
        if (createDynamicProperties) {
            // in this case we dynamically create properties primarily based on what the
            // inputdata tells us
            for (prop in data) {
                /* istanbul ignore else */
                if (data.hasOwnProperty(prop)) {
                    if (this.hasOwnProperty(prop)) {
                        this[prop] = fillProperty(constructorFn.dataConfiguration[prop], this[prop], data[prop]);
                    } else {
                        this[prop] = createPropertyInstance(constructorFn.dataConfiguration[prop], data[prop]);
                    }
                }
            }
        } else {
            // in this case we only create those properties which are defined in dataConfiguration
            // and also received in inputdata
            for (prop in constructorFn.dataConfiguration) {
                if (constructorFn.dataConfiguration.hasOwnProperty(prop) && data.hasOwnProperty(prop)) {
                    if (this.hasOwnProperty(prop)) {
                        this[prop] = fillProperty(constructorFn.dataConfiguration[prop], this[prop], data[prop]);
                    } else {
                        this[prop] = createPropertyInstance(constructorFn.dataConfiguration[prop], data[prop]);
                    }
                }
            }
        }

        /**
         * for each property in the configuration that is not a property of the `this` instance
         * create a new property in the `this` instance
         */
        for (prop in constructorFn.dataConfiguration) {
            if (constructorFn.dataConfiguration.hasOwnProperty(prop) && !this.hasOwnProperty(prop)) {
                this[prop] = createPropertyInstance(constructorFn.dataConfiguration[prop]);
            }
        }

        // invoke each function in the onAfterFill chain to allow for further data initialization work
        invokeMethodChain(constructorFn.onAfterFill, this, []);

        // update dependent objects
        invokeMethodChain(this._dependentObjectCreators, this, []);

        // and finally call after fill callbacks
        invokeMethodChain(this._afterFillCallbacks, this, []);

        this.updateFillFlag();

        return this;
    };

    /**
     * registers a callback that will be invoked when the object is filled with new data
     *
     * @param {function} callback a callback that will be invoked when the object is filled with new data. `this`
     *  will be set to object itself.
     * @return {function} a deregistration function for removing the callback
     */
    constructorFn.prototype.afterFill = function(callback) {
        this._afterFillCallbacks = this._afterFillCallbacks || [];
        this._afterFillCallbacks.push(callback);

        return function removeAfterFillCallback() {
            var i = this._afterFillCallbacks.indexOf(callback);

            if (i !== -1) {
                this._afterFillCallbacks.splice(i, 1);
            }
        }.bind(this);
    };

    /**
     * adds the property `_objectId` with a generated uniqueid for each
     * object. it will use the string 'object' as generic prefix. this can
     * be overridden by setting a different prefix string on property
     * `uniqueObjectIdPrefix`.
     * For example: `Person.uniqueObjectIdPrefix = 'Person#';`
     *
     * Please Note: The id will be generated only when there is no property
     * `_objectId` found on the object. As soon as the property already
     * exists, this function will do nothing, because existing objects
     * should not change their ids.
     */
    constructorFn.prototype.generateUniqueObjectId = function() {
        if (!this.hasOwnProperty('_objectId')) {
            // create new unique id using the static counter
            var id = ++almightyModelManager.uniqueIdCounter;

            // prefix will default to 'object' unless another given
            var prefix = 'object';

            // in case a string property `uniqueObjectIdPrefix` is defined
            // on the current function, then use its value as the prefix.
            // this gives programmers the ability to override the prefix for
            // certain objects manually
            if (typeof constructorFn.uniqueObjectIdPrefix === 'string') {
                prefix = constructorFn.uniqueObjectIdPrefix;
            }

            // and set the unique id on the current object
            this._objectId = prefix + id;
        }
    };

    /**
     * adds or updates the property `_lastDataUpdate` with current time to
     * indicate when we updated data for the last time.
     */
    constructorFn.prototype.updateFillFlag = function() {
        // Date.now() would be better, but seems it might be
        //            unsupported on some (older) (mobile) browsers
        this._lastDataUpdate = new Date().getTime();
    };

    /**
     * empties the current object
     *
     * properties with an `emptyData` method and arrays will keep their object identity. All other properties
     * that are configured via the dataConfiguration will be recreated.
     *
     * properties that are also set in the `data` parameter and properties that are not listed in the dataConfiguration
     * will be kept as is.
     *
     * @param {*} data the data to fill the current instance with
     */
    constructorFn.prototype.emptyData = function(data) {
        var prop;

        data = data || {};

        for (prop in this) {
            if (this.hasOwnProperty(prop) && constructorFn.dataConfiguration.hasOwnProperty(prop) && !data.hasOwnProperty(prop)) {
                this[prop] = emptyProperty(this[prop], constructorFn.dataConfiguration[prop]);
            }
        }
    };

    /**
     * set an object as dependent from the current object
     *
     * the callback will be invoked after the `fillData` method of the current object is called. Its only argument is
     * the dependent object and `this` will be set to the current object. In this way, the callback function can be
     * used to update the dependent object with the new data.
     *
     * @param {*} depObj the dependent object
     * @param {function} callbackFn a callback function
     * @param {*|array.<*>} args further arguments for the callback
     * @returns {*} the dependent object
     */
    constructorFn.prototype.createDependentObject = function(depObj, callbackFn, args) {
        var self = this;
        var dependentObjectUpdateFn = function() {
            callbackFn.apply(self, [depObj].concat(args));
        };

        dependentObjectUpdateFn();

        this._dependentObjectCreators = this._dependentObjectCreators || [];
        this._dependentObjectCreators.push(dependentObjectUpdateFn);

        return depObj;
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////// HELPER FUNCTIONS
    /**
     * empties the current property
     *
     * properties with an `emptyData` method and arrays will keep their object identity. All other properties
     * will be recreated.
     */
    function emptyProperty(prop, conf) {
        if (hasMethod(prop, 'emptyData')) {
            prop.emptyData();
        } else if (isArray(prop)) {
            prop.length = 0;
        } else {
            prop = createPropertyInstance(conf);
        }

        return prop;
    }

    /**
     * invoke all the function in the method chain
     *
     * this function invokes all the functions in the methodChain array with `this` set to the thisArg and the arguments
     * in the args array. If the chainArgs parameter is `true` set return value of each function call will be
     * the argument for the next function call.
     *
     * The return value of the last function call will be the return value of this function.
     *
     * @param  {array.<function>} methodChain
     * @param {object} thisArg
     * @param {array} args
     * @param {boolean} chainArgs (default = `false`)
     */
    function invokeMethodChain(methodChain, thisArg, args, chainArgs) {
        var i;
        var lastReturnValue = args[0];

        if (isArray(methodChain)) {
            for (i = 0; i < methodChain.length; i++) {
                if (typeof methodChain[i] === 'function') {
                    lastReturnValue = methodChain[i].apply(thisArg, args);

                    if (chainArgs) {
                        args = [lastReturnValue];
                    }
                }
            }
        }

        return lastReturnValue;
    }

    /**
     * fills a property with the given data according to its configuration
     *
     * @param {function|array|array<function>|undefined} propertyConfig
     * @param {object} oldProp
     * @param {object} data
     * @returns {object}
     */
    function fillProperty(propertyConfig, oldProp, data) {
        var tmpArray;

        emptyProperty(oldProp, propertyConfig);

        if (hasMethod(oldProp, 'fillData')) {
            oldProp.fillData(data);
        } else if (isArray(oldProp) && isArray(propertyConfig)) {
            tmpArray = createArrayOfObjectsOfGivenConfig(propertyConfig[0], data);
            Array.prototype.push.apply(oldProp, tmpArray);
        } else {
            oldProp = createPropertyInstance(propertyConfig, data);
        }

        return oldProp;
    }

    /**
     * creates a new instance/array holding the data according to the configuration
     *
     * @param {function|array|array<function>|undefined} PropertyConfig
     * @param {object} data
     * @returns {object}
     */
    function createPropertyInstance(PropertyConfig, data) {
        if (typeof PropertyConfig === 'function') {
            return new PropertyConfig(data);
        } else if (isArray(PropertyConfig)) {
            return createArrayOfObjectsOfGivenConfig(PropertyConfig[0], data);
        } else {
            return data;
        }
    }

    /**
     * enhances an array with a given type
     *
     * - if the data is an array and the type is a function, create an array of objects of the given type
     * - if the data is an array and the type is not a function, return the data
     * - if the data is not an array and the type is a function, create an array with one object of the given type
     * - return an empty array otherwise.
     *
     * @data {array|*} data the data to enhance
     * @data {function|undefined} type the function to use as a constructorFn
     * @return {array.<type>} an array of object of the given type
     */
    function createArrayOfObjectsOfGivenConfig(type, data) {
        var result = [];
        var i;

        if (isArray(data)) {
            if (typeof type === 'function') {
                for (i = 0; i < data.length; i++) {
                    //jscs:disable
                    result.push(new type(data[i]));
                    //jscs:enable
                }
            } else {
                result = data;
            }
        } else if (data) {
            result = createArrayOfObjectsOfGivenConfig(type, [data]);
        }

        return result;
    }

    /**
     * detect circular references in the tree of constructor functions in the data configuration
     *
     * @param {object} dataConfiguration
     * @param {array.<function>} parents the parents of the current constructor functions
     */
    function detectCircularDependenciesInConstructorsetup(dataConfiguration, parents) {
        var tmpConstructorFn;
        var prop;
        var i;

        for (prop in dataConfiguration) {
            tmpConstructorFn = null;

            if (typeof dataConfiguration[prop] === 'function') {
                tmpConstructorFn = dataConfiguration[prop];
            } else if (isArray(dataConfiguration[prop])) {
                tmpConstructorFn = dataConfiguration[prop][0];
            }

            if (tmpConstructorFn && tmpConstructorFn.hasOwnProperty('dataConfiguration') && typeof tmpConstructorFn.dataConfiguration === 'object') {
                for (i = 0; i < parents.length; i++) {
                    if (tmpConstructorFn === parents[i]) {
                        throw 'detected circular constructor reference for ' + parents[i];
                    }
                }

                parents.push(tmpConstructorFn);
                detectCircularDependenciesInConstructorsetup(tmpConstructorFn.dataConfiguration, parents);
                parents.pop();
            }
        }
    }

    /**
     * returns true if an object has a method with a given name
     *
     * @param {object} obj
     * @param {string} methodName
     * @returns {boolean}
     */
    function hasMethod(obj, methodName) {
        return obj && typeof obj[methodName] === 'function';
    }

    /**
     * returns `true` if an object is an array
     *
     * @param {*} obj
     * @returns {boolean} whether the object is an array
     */
    function isArray(obj) {
        return (Object.prototype.toString.call(obj) === '[object Array]');
    }
};
