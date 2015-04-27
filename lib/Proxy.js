(function() {

  var reasoner_module = require('./Reasoner');
  var parser_module = require('./Parser');
  var planner_module = require('./Planner');
  var http = require('http');
  var jsonld = require('jsonld');
  var fs = require('fs');


  var Proxy = function(__dirname){

    var default_path = __dirname;
    var reasoner = new reasoner_module.Reasoner(__dirname,  "eye");
    var parser = new parser_module.Parser(__dirname);
    //var planner = new planner_module.Planner();

    var files_matching = {
      use_case01 : {
        getPlantsInfo : "goal01.n3",
        getSensorsValues : "goal02.n3",
        setActuatorState : "goal03.n3"
      }
    }

    var functions_matching = {
      "manageResultedPlantInfo" : 0,
      "manageResultedSensorsValueOnBoard" : 1,
      "manageResultedActuatorState" : 2
    }

    
    //Music: Adele - One and Only
    this.getPlantsInfo = function(board, callback_return_algorithm){
      var planner = new planner_module.Planner();      
      reasoner.generatePlanForFirstUseCase(board.ID, files_matching.use_case01.getPlantsInfo, false, function(){
        parser.readParserFile('use_case01/outputs/parser.n3', function(resulted_plans){

          planner.elaboratePlan("longest", resulted_plans.plans, resulted_plans.lemmas, null);
          planner.runPlan(board, {}, executeRequest, managePlanResults, "manageResultedPlantInfo", callback_return_algorithm);

        });
      });    
    }

    this.getSensorsValueOnBoard = function(board, callback_return_algorithm){
      var planner = new planner_module.Planner();   
      reasoner.generatePlanForFirstUseCase(board.ID, files_matching.use_case01.getSensorsValues, false, function(){
        parser.readParserFile('use_case01/outputs/parser.n3', function(resulted_plans){

          planner.elaboratePlan("longest", resulted_plans.plans, resulted_plans.lemmas, null);
          planner.runPlan(board, {}, executeRequest, managePlanResults, "manageResultedSensorsValueOnBoard", callback_return_algorithm);

        });
      });    
    }

    this.setActuatorState = function(board, plantURL, newState, actuatorType, callback_return_algorithm){
      //I have to create the goal
      var str = "";
      str += "@prefix vocab: <http://www.example.org/vocab#>.\n";
      str += "@prefix bonsai: <http://lpis.csd.auth.gr/ontologies/bonsai/BOnSAI.owl#>.\n\n";
      str += "vocab:state a bonsai:SwitchAction;\n";
      str += "vocab:hasValue " + newState.toString() + ".";
      saveFile(default_path + "/descriptions/use_case01/preference.n3", str);

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
      str += "log:includes { ?actuator vocab:hasSwitchingState vocab:state. }.\n"
      str += "}\n";
      str += "=>\n";
      str += "{\n";
      str += "?actuator a vocab:" + actuatorType + ".\n";
      str += "}."
      saveFile(default_path + "/descriptions/use_case01/" + files_matching.use_case01.setActuatorState, str);

      var constraint = {
        "responseType" : "http://www.example.org/vocab#Plant",
        "whatProperty" : "@id",
        "value" : plantURL
      }

      var planner = new planner_module.Planner();
      reasoner.generatePlanForFirstUseCase(board.ID, files_matching.use_case01.setActuatorState, true, function(){
        parser.readParserFile('use_case01/outputs/parser.n3', function(resulted_plans){

          planner.elaboratePlan("longest", resulted_plans.plans, resulted_plans.lemmas, constraint);
          planner.runPlan(board, {}, executeRequest, managePlanResults, "manageResultedActuatorState", callback_return_algorithm);

        });
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
          path: url
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
                    
                    callback(board, compacted, executeRequest, managePlanResults, functionName, callback_return_algorithm);
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
          path: url,
          method: 'PUT'
        };

        //get data
        var req = http.request(options, function(resp){
          resp.on('data', function(chunk){
            data = JSON.parse(chunk);

            //console.log("*** Resulted HTTP PUT " + url);
            //console.log(JSON.stringify(data, null, 2));

            /*********
            * TODO: Get of context and compacted data+context
            *********/

            callback(board, data, executeRequest, managePlanResults, functionName, callback_return_algorithm);
          });
          resp.on('end', function(out){
            console.log("END PUT FUNCTION!");
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
      }
    }


    //TODO
    var manageResultedPlantInfo = function(buffer_resources_dependencies, callback_return_algorithm){
      //console.log(" -> End Plan! <- ");
      //console.log(JSON.stringify(buffer_resources_dependencies));
      var response = [];
      for(var key in buffer_resources_dependencies){
        var lemma = buffer_resources_dependencies[key];
        for(var i=0; i<lemma.length; i++){
          if(lemma[i].hasOwnProperty("data")){
            //have to get its data
            response.push({
              "plantID" : lemma[i]["@id"],
              "idealMorning" : {},
              "idealAfternoon" : {},
              "idealNight" : {}
            })
            data = lemma[i].data["@graph"];
            for(var h=0; h<data.length; h++){
              graph_name = data[h]["@id"].replace("http://example.org/graphs/", '');
              response[response.length-1][graph_name]["temperature"] = getIdealValue("Temperature", data[h]["@graph"][0]);
              response[response.length-1][graph_name]["moisture"] = getIdealValue("Moisture", data[h]["@graph"][0]);
              response[response.length-1][graph_name]["light"] = getIdealValue("Light", data[h]["@graph"][0]);
            }
          }
        }
      }
      callback_return_algorithm(response);
    }

    var getIdealValue = function(type, data){
      var tmp_1 = data[("http://www.example.org/vocab#hasIdeal" + type)];
      var tmp_2 = tmp_1["http://www.example.org/vocab#hasValue"];
      return tmp_2["@value"];
    }


    //TODO
    var manageResultedSensorsValueOnBoard = function(buffer_resources_dependencies, callback_return_algorithm){
      //console.log(" -> End Plan! <- ");
      //console.log(JSON.stringify(buffer_resources_dependencies));
      var response = [];
      for(var key in buffer_resources_dependencies){
        var lemma = buffer_resources_dependencies[key];
        for(var i=0; i<lemma.length; i++){
          if(lemma[i].hasOwnProperty("data")){
            response.push({
              "plantID" : lemma[i]["dependantFrom"],
              "sensorID" : lemma[i]["@id"],
              "sensorType" : lemma[i]["data"]["@type"].replace("http://www.example.org/vocab#", ''),
              "value" : getSensorVal(lemma[i]["data"])
            })
          }
        }
      }
      callback_return_algorithm(response);
    }

    var getSensorVal = function(data){
      var tmp_1 = data["http://www.example.org/vocab#madeObservation"];
      var tmp_2 = tmp_1["http://www.example.org/vocab#outputObservation"];
      return tmp_2["http://www.example.org/vocab#hasValue"]["@value"];
    }

    //TODO
    var manageResultedActuatorState = function(buffer_resources_dependencies, callback_return_algorithm){
      //console.log(" -> End Plan! <- ");
      //console.log(JSON.stringify(buffer_resources_dependencies));
      var response = {};
      for(var key in buffer_resources_dependencies){
        var lemma = buffer_resources_dependencies[key];
        for(var i=0; i<lemma.length; i++){
          if(lemma[i].hasOwnProperty("data")){
            response = lemma[i]["data"];
            break;
          }
        }
      }
      callback_return_algorithm(response);
    }

  }//end class Proxy


  /*
  * Function to save preference tmp file
  */
  var saveFile = function(path, fileContent){
    fs.writeFile(path, fileContent, function(err) {
      if(err) {
          console.log(err);
      } else {
          console.log("The file preference.n3 was saved!");
      }
    });
  };

  exports.Proxy = Proxy;

})();