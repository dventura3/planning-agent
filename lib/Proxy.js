(function() {

  var reasoner_module = require('./Reasoner');
  var parser_module = require('./Parser');
  var http = require('http');
  var jsonld = require('jsonld');

  var Proxy = function(__dirname){

    var reasoner = new reasoner_module.Reasoner(__dirname,  "eye");
    var parser = new parser_module.Parser(__dirname);

    var files_matching = {
      use_case01 : {
        getPlantsInfo : "goal01.n3",
        getSensorsValues : "goal02.n3",
        setActuatorState : "goal03.n3"
      }
    }
    
    //Music: Adele - One and Only
    this.getPlantsInfo = function(boardID){
      
      reasoner.generatePlanForFirstUseCase(boardID, files_matching.use_case01.getPlantsInfo, function(){
        parser.readParserFile('use_case01/outputs/parser.n3', function(resulted_plans){
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
    
          var num_executions = 0;

          executeRequest(resulted_plans.plans[plan_id], resulted_plans.lemmas, 0, IsPlanCompleted);

          
        });
      });
      
    }

  }

  var executeRequest = function(plan, lemmas, index_current_lemma, callback){

    var data = {};
    var context = {};

    if(lemmas[plan[index_current_lemma]].operation.method == 'GET'){

      var options = {
        host: '127.0.0.1',
        port: 3300,
        path: lemmas[plan[index_current_lemma]].operation["@id"]
      };

      http.get(options, function(resp){
        resp.on('data', function(chunk){
          data = JSON.parse(chunk);
          
          //config for new get
          splitted_context = data["@context"].split("/");
          options_context = {
            host: '127.0.0.1',
            port: 3300,
            path: ("/contexts/" + splitted_context[splitted_context.length-1])
          }

          //get the context
          http.get(options_context, function(resp){
            resp.on('data', function(chunk){
              context = JSON.parse(chunk);
              //convert into more readable format
              data["@context"] = context;
              jsonld.expand(data, function(err, expanded) {
                console.log(JSON.stringify(expanded));

                //todo > andare avanti nel ciclo di lemmi
                callback(index_current_lemma, lemmas, plan, expanded);
              });

            });
          }).on("error", function(e){
            console.log("Got error: " + e.message);
          });

        });
      }).on("error", function(e){
        console.log("Got error: " + e.message);
      });
    }
  }


  /*
  * Inputs:
  * lemmas = only lemma that I used for the plan (or all - todo).
  * plan = order of lemmas execution.
  * num_executions = current number of execution => it's an index to know what is the next lemma to execute.
  * callback = is the function to execute when the num_executions is like plan.lenght (I have finished to execute the http requests!).
  * data = jsonld resulted from the execution of a lemma (a part of plan)
  */
  var IsPlanCompleted = function(num_executions, lemmas, plan, data){

    if(num_executions == plan.length){
      //here non più executeRequest
      //here the result elaborated in base of the function => I mean we are inside the
      //function "getPlantsInfo" => So we have to return exactly what the Algorithms wants
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

      //executeRequest(resulted_plans.plans[plan_id], resulted_plans, num_executions, ...);

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

      if(searchedID == starting_block)
        found = true;
    }
    return listPropertyToBrowsing;
  }


  exports.Proxy = Proxy;

})();