/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. 
 *  
 */

var wd = wd || {};
wd.cdv = wd.cdv||{};

wd.cdv.alert = wd.cdv.alert || function(spec){


    /**
     * Specific specs
     */
    var _spec = {
        type: "overrideme",
        description: "Default alert description"
    };
    
    spec = _.extend({},_spec,spec);


    var myself = {};
    
    myself.getType = function(){
        return spec.type;
    }
    
    myself.getDescription = function(){
        return spec.description;
    }
    
    myself.toString = function(){
        return "["+ spec.type + "] " + spec.description;
    }
    
    return myself;
}


wd.cdv.testResult = wd.cdv.testResult || function(spec){


    /**
     * Specific specs
     */
    var _spec = {
        type: "testResult",
        description: "Test result",
        test: undefined,
        alert: undefined,
        date: new Date(),
        duration: -1, 
        durationAlert: undefined, 
        expectedDuration: -1
    };
    
    spec = _.extend({},_spec,spec);


    var translationLogMap = {
        OK: "debug", 
        WARN: "warn",
        ERROR: "error",
        CRITICAL: "error"
    };
    
    var myself = {};

    myself.getType = function(){
        return spec.type;
    }
    
    myself.getDescription = function(){
        return spec.description;
    }
    
    myself.getAlert = function(){
        return spec.alert;
    };
    
    myself.getTest = function(){
        return spec.test;
    };

    myself.getDuration = function(){
        return spec.duration
    };
    
    myself.getExpectedDuration = function(){
        return spec.expectedDuration;
    };

    myself.getDurationAlert = function(){
        return spec.durationAlert
    };
    
    
    myself.getLogType = function(){
        
        return translationLogMap[myself.getAlert().getType()] || "debug";
        
    }
    
    myself.toString = function(){
        
        var str = "[" + myself.getAlert().getType() +"] Test: '" + 
        myself.getTest().name + "', Result: " + 
        myself.getAlert().getDescription();
        
        if(myself.getExpectedDuration() > 0){
            str += "; Duration: [" + myself.getDurationAlert().getType() +"] " + myself.getDuration() + "ms (expected: " + myself.getExpectedDuration() + "ms)";
        }
    
        return str;
        
    }
    

    return myself;
}


wd.cdv.exceptionsMixin = wd.cdv.exceptionsMixin || function(myself,spec){
    
    var impl = myself.exceptions = {};
          
    impl.UnknowAlertTypeError = function(type){
        this.type = type;
    }
    impl.UnknowAlertTypeError.prototype.toString = function(){
        return "Trying to parse an unexisting alert type: " + this.type;
    };  
    
};


wd.cdv.alertMixin = wd.cdv.alertMixin || function(myself,spec){

    var alerts = {
        NA:  wd.cdv.alert({
            type: "NA", 
            description: "Not Applicable"
        }),
        OK:  wd.cdv.alert({
            type: "OK", 
            description: "Test passed successfully"
        }),
        WARN:  wd.cdv.alert({
            type: "WARN", 
            description: "Test failed with WARN"
        }),
        ERROR:  wd.cdv.alert({
            type: "ERROR", 
            description: "Test failed with ERROR"
        }),
        CRITICAL:  wd.cdv.alert({
            type: "CRITICAL", 
            description: "Test failed with CRITICAL"
        })
    }

    
    // Bind this
    myself.alerts = alerts;
    

    
    
    // Parse function
    myself.parseAlert = function(alertType){
        
        if (!alerts[alertType]){
            throw new myself.exceptions.UnknowAlertTypeError(alertType);
        }
        
        return alerts[alertType];
        
    }
    
    wd.debug("Added alert mixin");
    
};


wd.cdv.cdv = wd.cdv.cdv || function(spec){


    /**
     * Specific specs
     */
    var _spec = {
        name: 'Community Data Validation',
        shortName: 'CDV'
    };
    
    spec = _.extend({},_spec,spec);

    var myself = {};
    
    // Apply mixins
    wd.cdv.exceptionsMixin(myself);
    wd.cdv.alertMixin(myself);
    
    
    // Get CDA
    myself.cda = wd.cda.cda();


    myself.log = function(msg,level){
        wd.log("["+spec.shortName+"] " + msg,level);
    }
    
    
    
    // Main function to make the tests
    
    myself.makeTest = function(test){
        
        // 1. Make CDA calls
        // 2. Store time
        // 3. Compose the results into a single vector of arays
        // 4. Run tests
        // 5. Evaluate
       
       
        myself.log("Making test [" + test.group + "].["+test.name+"] ","debug");
    

        var queryExecution = myself.executeQuery(test, myself.makeTestCallback);
        
        
    };


    // Process the test restults
    
    myself.makeTestCallback = function(test,result){
         
        var duration = result.duration;
        var rs = result.resultset;

        var resultSpec = {
            test:test
        };
        
        // 1. Parse duration
        // 2. make test
        // 3. return
        
        var parseDuration = function(test,duration){

            if (!test.executionTimeValidation){
                console.log("No info");
                return "NA";
            }
    
            var t = test.executionTimeValidation;
            
            resultSpec.duration = duration;
            resultSpec.expectedDuration = t.expected;
    
            var isDurationAgainstPercentageValid = function(perc){
        
                var v = duration/t.expected - 1;
                return v < 0 && !t.errorOnLow ? true:Math.abs(v)<=perc;
            }
    
    
            // check if we're within the values
            if(!isDurationAgainstPercentageValid(t.errorPercentage)){
                return "ERROR";
            }
            if(!isDurationAgainstPercentageValid(t.warnPercentage)){
                return "WARN";
            }


            return "OK";
        }

        var durationResult =  parseDuration(cdvFile,duration);
        

        resultSpec.durationAlert = myself.parseAlert(durationResult);
        
        // Make the test
        resultSpec.alert = myself.parseAlert("WARN");
        
        
        // Build result object
        
        var testResult = wd.cdv.testResult(resultSpec);
        myself.log( testResult.toString(), testResult.getLogType());
        
        return testResult;
    }
    

    // Given a test, execute the query and returns the result and the length
    
    myself.executeQuery = function(test, callback){
        
        var startTime = new Date().getTime();
        
        
        // Make the queries asynchronosly
        var count = 0,
        total= test.validation.length,
        rs = [];
        
        var wrapUpCalls = function(){
            
            var duration = (new Date().getTime()) - startTime;
            
            myself.log("Finished execution. Duration: "+ duration + "ms Result: " + rs);
            callback(test, {
                duration: duration, 
                resultset: rs
            });
        }
        
        _.map(test.validation, function(cdaInfo, idx){
            
            
            // Define callback function
            myself.log("Making cda test " + idx, "debug");
            
            
            var validationCallback = function(json){

                myself.log("In validation callback",'debug');
                count++;
                rs[idx] = json;
                
                if(count===total){
                    wrapUpCalls();
                }
                
            };
            
            
            // Make CDA call
            myself.cda.doQuery(cdaInfo.cdaFile,cdaInfo.dataAccessId,cdaInfo.parameters,validationCallback);
            
            
        })
        
    }


    return myself;


}


