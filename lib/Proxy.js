(function() {

  var reasoner_module = require('./Reasoner');
  var parser_module = require('./Parser');
  var planner_module = require('./Planner');
  var http = require('http');
  var jsonld = require('jsonld');


  var Proxy = function(__dirname){

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

    
    //Music: Adele - One and Only
    this.getPlantsInfo = function(board){
      
      reasoner.generatePlanForFirstUseCase(board.ID, files_matching.use_case01.getPlantsInfo, function(){
        parser.readParserFile('use_case01/outputs/parser.n3', function(resulted_plans){

          planner.generatePlan("longest", resulted_plans.plans, resulted_plans.lemmas);

          planner.runPlan(board, {}, executeRequest, returnResponse);

          /*

          //I select the (first) longest plan because the shortest could be not complete!
          //The problem is that the shortest says to directly invoke </plants/1> but If I don't know how
          //many plants I have... so I decide to use the longest plan that should be also the more complete.
          var plan_id = 0; //plan to execute
          var current_max_num_lemmas = 0;
          for(var i=0; i<resulted_plans.plans.length; i++){
            if(resulted_plans.plans[i].length > current_max_num_lemmas){
              current_max_num_lemmas = resulted_plans.plans[i].length;
              plan_id = i;
            }
          }
          //console.log(JSON.stringify(resulted_plans));
    
          var num_expected_executions = 0; //num expected executions
          var num_current_executions = 0;

          executeRequest(board, resulted_plans.lemmas[resulted_plans.plans[plan_id][num_current_executions]].operation["@id"] , resulted_plans.plans[plan_id], resulted_plans.lemmas, num_current_executions, IsPlanCompleted);
          */

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

        });
      });
      
    }

  }

  /*
  * Parameters:
  * (1) board = object board (to know host and port of board)
  * (2) url = for example: /plants/
  * (3) requestType = for example: GET
  */
  var executeRequest = function(board, url, requestType, callback){

    var data = {};
    var context = {};

    if(requestType == 'GET'){

      var options = {
        host: board.host,
        port: board.port,
        path: url
      };

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

          //get the context
          http.get(options_context, function(resp){
            resp.on('data', function(other_chunk){
              context = JSON.parse(other_chunk);
              //convert into more readable format
              data["@context"] = context;
              jsonld.compact(data, {}, function(err, compacted) {
                  console.log("*** Resulted HTTP GET " + url);
                  console.log(JSON.stringify(compacted, null, 2));
                  
                  callback(board, compacted, executeRequest, returnResponse);
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


  var returnResponse = function(){
    console.log(" -> End <- ");
  }


/*

  var executeRequest = function(board, path, plan, lemmas, num_current_executions, callback){

    var data = {};
    var context = {};

    if(lemmas[plan[num_current_executions]].operation.method == 'GET'){

      var options = {
        host: board.host,
        port: board.port,
        path: path      //path: lemmas[plan[num_current_executions]].operation["@id"]
      };

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

          //get the context
          http.get(options_context, function(resp){
            resp.on('data', function(other_chunk){
              context = JSON.parse(other_chunk);
              //convert into more readable format
              data["@context"] = context;
              jsonld.expand(data, function(err, expanded) {
                  //console.log("*** EXPANDED *** " + JSON.stringify(expanded));
                  
                  //todo > andare avanti nel ciclo di lemmi
                  callback(board, num_current_executions, lemmas, plan, expanded[0]);
              });
            });
          }).on("error", function(e){
            console.log("Got error on context request: " + e.message);
          });

        });
      }).on("error", function(e){
        console.log("Got error on data request: " + e.message);
      });
    }
  }
*/


  /*
  * Input Parameters:
  * lemmas = only lemma that I used for the plan (or all - todo).
  * plan = order of lemmas execution.
  * num_executions = current number of execution => it's an index to know what is the next lemma to execute.
  * callback = is the function to execute when the num_executions is like plan.lenght (I have finished to execute the http requests!).
  * data = jsonld resulted from the execution of a lemma (a part of plan)
  */
  var IsPlanCompleted = function(board, num_executions, lemmas, plan, data){

    if(num_executions == (plan.length-1)){
      //here non più executeRequest
      //here the result elaborated in base of the function => I mean we are inside the
      //function "getPlantsInfo" => So we have to return exactly what the Algorithms wants

      console.log("########## STOP! ##########");
    }
    else{
      //again executeRequest

      //(1) read the id of the next lemma to execute => calcolo l'id che mi aspetto (facendo "-1").
      //(2) navigo dal return del lemma attuale (just executed) to the id che aspetto.
      //mentre navigo mi devo segnare quali sono le proprietà che incontro, per capire come 
      //arrivare all'id che mi interessa!
      //(3) il percorso mi serve perchè poi nel jsonld restituito dall'invocazione del servizio
      //devo eseguire lo stesso identico path.

      var next_lemma = plan[(num_executions+1)];
      var current_lemma = plan[num_executions];

      var starting_block = lemmas[plan[num_executions]].operation.returns;

      //if "_:sk33_4" => the ending_block is "_:sk33_3"
      var tmp = lemmas[next_lemma].operation["@id"].split("_");
      var ending_block = "_" + tmp[1] + "_" + (Number(tmp[2]) - 1);


      var pathNextURL = generatePathToGetNextURL(starting_block, ending_block, lemmas[current_lemma]);

      console.log(JSON.stringify(pathNextURL));

      //increment in order to have execute the newest lemma
      num_executions++;


      if(pathNextURL.numberReturnedUrl == "multiple"){
        var list_to_invoke = data[pathNextURL.path[0]]; //todo: per ora è statico
        /*
        var tmp = {};
        for(int i=0; i<pathNextURL.path.length; i++){
          tmp = data[pathNextURL.path[i]];
        }
        */

        //for each returned URL in the collection
        for(var x=0; x<list_to_invoke.length; x++){
          executeRequest(board, list_to_invoke[x]["@id"], plan, lemmas, num_executions, IsPlanCompleted);
        }
      }
      else{
        //todo
        /*
          "http://www.example.org/vocab#pappo": [
            {
              "@value": "ciao"
            }
          ]
        */
      }

    }
  }


  //Bottom-Up Algorithm
  /*
  mi salvo la proprietà che mi darà l'URL da eseguire.
    PROBLEMI (casi da considerare):
      (1) ending_block potrebbe non essere un blocco ma già di per se il range di un'altro blocco.... o no? => è un attributo finale!
      (2) ending_block, se è un blocco, potrebbe avere la supportedProperty vuota => perchè è un qualcosa restituita da una collection!
  ciclo di tutti i blocchi del lemma.
  per ogni blocco verifico che il range è l'id del blocco che sto cercando (che sarà il prossimo in sequenza da dover eseguire)
  se non è lo starting block, rieseguo il ciclo.
  */
  var generatePathToGetNextURL = function(starting_block, ending_block, current_lemma){
    var listPropertyToBrowsing = {
      numberReturnedUrl : "",  //or single (only one URL) or multiple (collection of URLs)
      path : []
    };
    var searchedID = ending_block;
    var found = false;
    while(!found){

      if(current_lemma[searchedID] !== 'undefined'){
        //case (2) => It's a "url-collection"
        if(searchedID == ending_block){
          listPropertyToBrowsing.numberReturnedUrl = "multiple";
          //break; //because In this case "supportedProperty" is empty!
        }
      }
      else{
        //case (1) => It's a "url-string"
        if(searchedID == ending_block)
          listPropertyToBrowsing.numberReturnedUrl = "single";
      }

      for(var key in current_lemma){
        if(key != "operation"){
          for(var i=0; i<current_lemma[key].supportedProperty.length; i++){
            if(current_lemma[key].supportedProperty[i].range == searchedID){
              listPropertyToBrowsing.path.push(current_lemma[key].supportedProperty[i]["@id"]);
              searchedID = key;
              //break; //new property (that has to be followed in sequence) found!
            }
          }
        }
      }
      //Music: Naya Rivera - Mine
      if(searchedID == starting_block)
        found = true;
    }
    return listPropertyToBrowsing;
  }


  exports.Proxy = Proxy;

})();