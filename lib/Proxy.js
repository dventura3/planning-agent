(function() {

  var planner_module = require('./Planner');
  var http = require('http');
  var jsonld = require('jsonld');
  var fs = require('fs');


  var Proxy = function(_dirname, use_case){

    var default_path = _dirname;
    var current_use_case = use_case;

    var files_matching = {
      use_case01 : {
        getPlantsInfo : "goal01.n3",
        getSensorsValues : "goal02.n3",
        setActuatorState : "goal03.n3"
      },
      use_case02 : {
        getPlantsInfo : "goal01.n3",
        getSensorsValues : "goal02.n3",
        setActuatorState : "goal03.n3",
        getCurrentWeather : "goal04.n3"
      }
    }

    var functions_matching = {
      "manageResultedPlantInfo" : 0,
      "manageResultedSensorsValueOnBoard" : 1,
      "manageResultedActuatorState" : 2,
      "manageResultedCurrentWeather" : 3,
      "manageResultedActuatorsForPlants" : 4
    }

    
    //Music: Adele - One and Only
    this.getPlantsInfo = function(board, callback_return_algorithm){
      var planner = new planner_module.Planner(default_path, board);
      planner.generateProofs(files_matching[current_use_case].getPlantsInfo, false, function(){
        planner.selectPlanToExecute("longest");
        planner.runPlan({}, executeRequest, managePlanResults, "manageResultedPlantInfo", callback_return_algorithm);
      });
    }

    this.getSensorsValueOnBoard = function(board, callback_return_algorithm){
      var planner = new planner_module.Planner(default_path, board);
      planner.generateProofs(files_matching[current_use_case].getSensorsValues, false, function(){
        planner.selectPlanToExecute("longest");
        planner.runPlan({}, executeRequest, managePlanResults, "manageResultedSensorsValueOnBoard", callback_return_algorithm);
      });
    }

    this.setActuatorState = function(board, plantURL, newState, actuatorType, callback_return_algorithm){
      //I have to create the user preference
      var path = default_path + "/preference.n3";
      var fd = fs.openSync(path, "w");

      var str = "";
      str += "@prefix vocab: <http://www.example.org/vocab#>.\n";
      str += "@prefix dogont: <http://elite.polito.it/ontologies/dogont.owl#>.\n";
      str += "@prefix bonsai: <http://lpis.csd.auth.gr/ontologies/bonsai/BOnSAI.owl#>.\n\n";
      if(actuatorType == "PowerWindow")
        str += "vocab:state a dogont:OpenCloseState;\n";
      else  
        str += "vocab:state a bonsai:SwitchAction;\n";
      str += "vocab:hasValue " + newState.toString() + ".";

      var b = new Buffer(str);
      var result = fs.writeSync(fd, b, 0, b.length, null);
      fs.closeSync(fd);

      //I have to create the goal
      var path2 = default_path + "/" + files_matching[current_use_case].setActuatorState;
      var fd2 = fs.openSync(path2, "w");

      var str = "";
      str += "@prefix vocab: <http://www.example.org/vocab#>.\n";
      str += "@prefix hydra: <http://www.w3.org/ns/hydra/core#>.\n";
      str += "@prefix st: <http://www.mystates.org/states#>.\n";
      str += "@prefix log: <http://www.w3.org/2000/10/swap/log#>.\n\n";
      str += "{\n"
      str += "<" + plantURL + "> vocab:hasAssociatedActuators ?actuatorsList.\n";
      str += "?actuatorsList hydra:member ?actuator.\n";
      str += "?actuator a vocab:" + actuatorType + ".\n";
      str += "?state a st:State;\n";
      if(actuatorType == "PowerWindow")
        str += "log:includes { ?actuator vocab:hasOpenCloseState vocab:state. }.\n"
      else
        str += "log:includes { ?actuator vocab:hasSwitchingState vocab:state. }.\n"
      str += "}\n";
      str += "=>\n";
      str += "{\n";
      str += "?actuator a vocab:" + actuatorType + ".\n";
      str += "}."

      var b = new Buffer(str);
      var result = fs.writeSync(fd2, b, 0, b.length, null);
      fs.closeSync(fd2);

      var planner = new planner_module.Planner(default_path, board);
      planner.generateProofs(files_matching[current_use_case].setActuatorState, true, function(){
        var isThereAPlan = planner.selectPlanToExecute("longest");
        if(isThereAPlan == 0)
          planner.runPlan({}, executeRequest, managePlanResults, "manageResultedActuatorState", callback_return_algorithm);
        else
          callback_return_algorithm(null, new Error("No Plan exists!"));
      });
    }


    this.getCurrentWeather = function(board, callback_return_algorithm){
      var planner = new planner_module.Planner(default_path, board);
      planner.generateProofs(files_matching[current_use_case].getCurrentWeather, false, function(){
        planner.selectPlanToExecute("longest");
        planner.runPlan({}, executeRequest, managePlanResults, "manageResultedCurrentWeather", callback_return_algorithm);
      });
    }


    /*
    * Parameters:
    * (1) board = object board (to know host and port of board)
    * (2) url = for example: /plants/
    * (3) requestType = for example: GET
    * (4) callback = function to execute at the end of each http request (composed by "get data" + "get context")
    * (5) functionName = name of the function to execute when the whole plan is finished
    */
    var executeRequest = function(board, url, requestType, callback, functionName, callback_return_algorithm){

      var data = {};
      var context = {};

      if(requestType == 'GET'){

        var options = {
          host: board.host,
          port: board.port,
          path: board.url
        };

        //get data
        http.get(options, function(resp){
          resp.on('data', function(chunk){
            data = JSON.parse(chunk);
            
            //config for new get
            splitted_context = data["@context"].split("/");
            options_context = {
              host: board.host,
              port: board.port,
              path: ("/contexts/" + splitted_context[splitted_context.length-1])
            }

            //get context
            http.get(options_context, function(resp){
              resp.on('data', function(other_chunk){
                context = JSON.parse(other_chunk);
                //convert into more readable format
                data["@context"] = context;
                jsonld.compact(data, {}, function(err, compacted) {
                    //console.log("*** Resulted HTTP GET " + url);
                    //console.log(JSON.stringify(compacted, null, 2));
                    
                    callback(compacted, executeRequest, managePlanResults, functionName, callback_return_algorithm);
                });
              });
            }).on("error", function(e){
              console.log("Got error on context request: " + e.message);
            });

          });
        }).on("error", function(e){
          console.log("Got error on data request: " + e.message);
        });
      }//end requestType == GET
      else if(requestType == 'PUT'){

        var options = {
          host: board.host,
          port: board.port,
          path: board.url,
          method: 'PUT'
        };

        //put data
        var req = http.request(options, function(resp){
          resp.on('data', function(chunk){
            data = JSON.parse(chunk);

            //config for new get
            splitted_context = data["@context"].split("/");
            options_context = {
              host: board.host,
              port: board.port,
              path: ("/contexts/" + splitted_context[splitted_context.length-1])
            }

            //get context
            http.get(options_context, function(resp){
              resp.on('data', function(other_chunk){
                context = JSON.parse(other_chunk);
                //convert into more readable format
                data["@context"] = context;
                jsonld.compact(data, {}, function(err, compacted) {
                    //console.log("*** Resulted HTTP PUT " + url);
                    //console.log(JSON.stringify(compacted, null, 2));
                    
                    callback(compacted, executeRequest, managePlanResults, functionName, callback_return_algorithm);
                });
              });
            }).on("error", function(e){
              console.log("Got error on context request: " + e.message);
            });

          });
          resp.on('end', function(out){
            //nothing to do
          });
        }).on("error", function(e){
          console.log("Got error on data request: " + e.message);
        });
        req.end();
      }//end requestType == PUT

    }


    /*
    * In order to have a general "executeRequest" function, I need a general "managePlanResults"
    * inside of which, I execute the real function that returns the data.
    */
    var managePlanResults = function(buffer_resources_dependencies, functionName, callback_return_algorithm){
      switch(functions_matching[functionName]){
        case 0:
          manageResultedPlantInfo(buffer_resources_dependencies, callback_return_algorithm);
          break;
        case 1:
          manageResultedSensorsValueOnBoard(buffer_resources_dependencies, callback_return_algorithm);
          break;
        case 2:
          manageResultedActuatorState(buffer_resources_dependencies, callback_return_algorithm);
          break;
        case 3:
          manageResultedCurrentWeather(buffer_resources_dependencies, callback_return_algorithm);
          break;
      }
    }


    /*
    * This function is the callback executed when the whole plants info are received!
    */
    var manageResultedPlantInfo = function(buffer_resources_dependencies, callback_return_algorithm){
      //console.log(" -> End Plan! <- ");
      //console.log(JSON.stringify(buffer_resources_dependencies));
      var response = {};
      for(var key in buffer_resources_dependencies){
        var lemma = buffer_resources_dependencies[key];
        for(var i=0; i<lemma.length; i++){
          if(lemma[i].hasOwnProperty("data")){
            //have to get its data
            response[lemma[i]["@id"]] = {
              "idealMorning" : {},
              "idealAfternoon" : {},
              "idealNight" : {}
            };

            data = lemma[i].data["@graph"];
            for(var h=0; h<data.length; h++){
              graph_name = data[h]["@id"].replace("http://example.org/graphs/", '');
              var tmp_data = [];
              tmp_data.push(data[h]["@graph"][0]);
              response[lemma[i]["@id"]][graph_name]["temperature"] = getValueOfTargetProperty("http://www.example.org/vocab#hasValue", "http://dbpedia.org/resource/Temperature", tmp_data);
              response[lemma[i]["@id"]][graph_name]["moisture"] = getValueOfTargetProperty("http://www.example.org/vocab#hasValue", "http://dbpedia.org/resource/Moisture", tmp_data);
              response[lemma[i]["@id"]][graph_name]["light"] = getValueOfTargetProperty("http://www.example.org/vocab#hasValue", "http://dbpedia.org/resource/Light", tmp_data);
            }
          }
        }
      }
      callback_return_algorithm(response, null);
    }


    var manageResultedSensorsValueOnBoard = function(buffer_resources_dependencies, callback_return_algorithm){
      //console.log(" -> End Plan! <- ");
      //console.log(JSON.stringify(buffer_resources_dependencies));
      var response = {};
      for(var key in buffer_resources_dependencies){
        var lemma = buffer_resources_dependencies[key];
        for(var i=0; i<lemma.length; i++){
          if(lemma[i].hasOwnProperty("data")){
            var sensorType = lemma[i]["data"]["@type"].replace("http://www.example.org/vocab#", '');
            var tmp_data = [];
            tmp_data.push(lemma[i]["data"]);
            if(sensorType == 'TemperatureSensor')
              var result = getValueOfTargetProperty("http://www.example.org/vocab#hasValue", "http://dbpedia.org/resource/Temperature", tmp_data);
            else if(sensorType == 'MoistureSensor')
              var result = getValueOfTargetProperty("http://www.example.org/vocab#hasValue", "http://dbpedia.org/resource/Moisture", tmp_data);
            else
              var result = getValueOfTargetProperty("http://www.example.org/vocab#hasValue", "http://dbpedia.org/resource/Light", tmp_data);
            
            if(!response.hasOwnProperty(lemma[i]["dependantFrom"]))
              response[lemma[i]["dependantFrom"]] = [];
            
            response[lemma[i]["dependantFrom"]].push({
              "sensorID" : lemma[i]["@id"],
              "sensorType" : sensorType,
              "value" : result
            });
          }
        }
      }
      callback_return_algorithm(response, null);
    }


    /*
    * This function is the callback executed when an actuator's state was set!
    */
    var manageResultedActuatorState = function(buffer_resources_dependencies, callback_return_algorithm){
      //console.log(" -> End Plan! <- ");
      //console.log(JSON.stringify(buffer_resources_dependencies));
      var response = {};
      var tmp_data = [];
      for(var key in buffer_resources_dependencies){
        var lemma = buffer_resources_dependencies[key];
        for(var i=0; i<lemma.length; i++){
          if(lemma[i].hasOwnProperty("data")){
            tmp_data.push(lemma[i]["data"]);
            if(lemma[i]["data"]["@type"] == "http://www.example.org/vocab#PowerWindow")
              var result = getValueOfTargetProperty("http://www.example.org/vocab#hasValue", "http://elite.polito.it/ontologies/dogont.owl#OpenCloseState", tmp_data);
            else
              var result = getValueOfTargetProperty("http://www.example.org/vocab#hasValue", "http://lpis.csd.auth.gr/ontologies/bonsai/BOnSAI.owl#SwitchAction", tmp_data);
            response = {
              actuatorID : lemma[i]["data"]["@id"],
              actuatorState : result
            }
            break;
          }
        }
      }
      callback_return_algorithm(response, null);
    }


    var manageResultedCurrentWeather = function(buffer_resources_dependencies, callback_return_algorithm){
      //console.log(" -> End Plan! <- ");
      //console.log(JSON.stringify(buffer_resources_dependencies));
      var response = {};
      for(var key in buffer_resources_dependencies){
        var lemma = buffer_resources_dependencies[key];
        for(var i=0; i<lemma.length; i++){
          if(lemma[i].hasOwnProperty("data")){
            var tmp_data = [];
            tmp_data.push(lemma[i]["data"]);
            response = {
              currentTemperature : getValueOfTargetProperty("http://www.example.org/weatherapi/vocab#hasValue", "http://dbpedia.org/resource/Temperature", tmp_data),
              currentHumidity : getValueOfTargetProperty("http://www.example.org/weatherapi/vocab#hasValue", "http://dbpedia.org/resource/Humidity", tmp_data),
              currentLightIntensity : getValueOfTargetProperty("http://www.example.org/weatherapi/vocab#hasValue", "http://dbpedia.org/resource/Light", tmp_data),
              currentWindSpeed : getValueOfTargetProperty("http://www.example.org/weatherapi/vocab#hasValue", "http://dbpedia.org/resource/Wind_speed", tmp_data)
            };
          }
        }
      }
      callback_return_algorithm(response, null);
    }


  }//end class Proxy


  /*
  * Recursive Algorithm used to extract the information necessary to build the response object
  * used by AlgorithmsManager module.
  */
  var getValueOfTargetProperty = function(targetProperty, targetType, data){
    var newData = []
    for(var i=0; i<data.length; i++){
      var isThatType = false;
      var isTargetProperty = false;
      var valueTargetPropery;

      for(var key in data[i]){
        if(targetProperty == key){
          valueTargetPropery = data[i][key];
          isTargetProperty = true;
        }
        if(key == "@type" && data[i][key]==targetType){
          isThatType = true;
        }
        else{
          if(isObject(data[i][key]) || isArray(data[i][key]))
            newData.push(data[i][key]);
          //DA VERIFICARE CON ARRAY: if(isArray(data[i][key])) --> TODO
        }
      }

      if(isTargetProperty && isThatType){
        if(isArray(valueTargetPropery)) //array
          return valueTargetPropery;
        else if(isObject(valueTargetPropery)) //object
          return valueTargetPropery["@value"];
        else //string
          return valueTargetPropery;
      }
    }
    return getValueOfTargetProperty(targetProperty, targetType, newData);
  }


  var isArray = function(a){
      return (!!a) && (a.constructor === Array);
  };

  var isObject = function(a){
      return (!!a) && (a.constructor === Object);
  };

  /*
  * Function to save preference tmp file
  */
  var saveFile = function(path, fileContent){
    fs.writeFile(path, fileContent, function(err) {
      if(err) {
          console.log(err);
      } else {
          //nothing to do
          console.log("File " + path + " saved with success!");
      }
    });
  };

  exports.Proxy = Proxy;

})();