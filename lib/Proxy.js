(function() {

  var reasoner_module = require('./Reasoner');
  var parser_module = require('./Parser');
  var planner_module = require('./Planner');
  var http = require('http');
  var jsonld = require('jsonld');


  var Proxy = function(__dirname){

    var default_path = __dirname;
    var reasoner = new reasoner_module.Reasoner(__dirname,  "eye");
    var parser = new parser_module.Parser(__dirname);
    var planner = new planner_module.Planner();

    var files_matching = {
      use_case01 : {
        getPlantsInfo : "goal01.n3",
        getSensorsValues : "goal02.n3",
        setActuatorState : "goal03.n3"
      }
    }

    var functions_matching = {
      "manageResultedPlantInfo" : 0,
      "manageResultedSensorsValueOnBoard" : 1
    }

    
    //Music: Adele - One and Only
    this.getPlantsInfo = function(board){      
      reasoner.generatePlanForFirstUseCase(board.ID, files_matching.use_case01.getPlantsInfo, function(){
        parser.readParserFile('use_case01/outputs/parser.n3', function(resulted_plans){

          planner.elaboratePlan("longest", resulted_plans.plans, resulted_plans.lemmas);
          planner.runPlan(board, {}, executeRequest, managePlanResults, "manageResultedPlantInfo");

        });
      });    
    }

    this.getSensorsValueOnBoard = function(board){      
      reasoner.generatePlanForFirstUseCase(board.ID, files_matching.use_case01.getSensorsValues, function(){
        parser.readParserFile('use_case01/outputs/parser.n3', function(resulted_plans){

          planner.elaboratePlan("longest", resulted_plans.plans, resulted_plans.lemmas);
          planner.runPlan(board, {}, executeRequest, managePlanResults, "manageResultedSensorsValueOnBoard");

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
    var executeRequest = function(board, url, requestType, callback, functionName){

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
                    
                    callback(board, compacted, executeRequest, managePlanResults, functionName);
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
    }


    /*
    * In order to have a general "executeRequest" function, I need a general "managePlanResults"
    * inside of which, I execute the real function that returns the data.
    */
    var managePlanResults = function(buffer_resources_dependencies, functionName){
      switch(functions_matching[functionName]){
        case 0:
          manageResultedPlantInfo(buffer_resources_dependencies);
          break;
        case 1:
          manageResultedSensorsValueOnBoard(buffer_resources_dependencies);
          break;
      }
    }


    //TODO
    var manageResultedPlantInfo = function(buffer_resources_dependencies){
      console.log(" -> End Plan! <- ");
      //console.log(JSON.stringify(buffer_resources_dependencies));
      //TODO
      /*
        This method has to return a list like this:
        response = [
          {
            id: "/plants/1",
            idealMorning:{
              temperature : 11,
              moisture : 44,
              light: 22
            },
            idealAfternoon : {...},
            idealNight : {...}
          },
          {
            id: "/plants/2",
            idealMorning:{
              temperature : 77,
              moisture : 54,
              light: 35
            },
            idealAfternoon : {...},
            idealNight : {...}
          }
        ]
      */
    }

    //TODO
    var manageResultedSensorsValueOnBoard = function(buffer_resources_dependencies){
      console.log(" -> End Plan! <- ");
      console.log(JSON.stringify(buffer_resources_dependencies));
    }

  }//end class Proxy



  exports.Proxy = Proxy;

})();